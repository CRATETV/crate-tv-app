
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { sealSnapshot, PRIVATE_SNAPSHOT_KEY } from './_lib/privateSnapshot.js';
import { publicSafeData } from './_lib/paidRules.js';
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { Movie, EditorialStory } from '../types.js';
import { resolveAdminCredential } from './_lib/adminSession.js';
import { resetForNewSchedule } from './_lib/watchPartyRules.js';

const getRoleFromPassword = (password: string | null) => {
    if (!password) return 'unknown';
    if (password === process.env.ADMIN_PASSWORD) return 'super_admin';
    if (password === process.env.ADMIN_MASTER_PASSWORD) return 'master';
    if (password === process.env.COLLABORATOR_PASSWORD) return 'collaborator';
    if (password === process.env.FESTIVAL_ADMIN_PASSWORD) return 'festival_admin';
    for (const key in process.env) {
        if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
            return key.replace('ADMIN_PASSWORD_', '').toLowerCase();
        }
    }
    return 'delegated_node';
};

// The only movie fields allowed in the public data/movies document.
export const PUBLIC_WATCH_PARTY_FIELDS = ['isWatchPartyEnabled', 'watchPartyStartTime', 'isWatchPartyPaid', 'watchPartyPrice', 'watchPartyPayWhatYouWant'] as const;

export const assembleAndSyncMasterData = async (db: Firestore) => {
    // Parallel fetching for manifest assembly - ADDED editorial_stories
    const [moviesSnap, categoriesSnap, aboutSnap, festivalConfigSnap, festivalDaysSnap, settingsSnap, storiesSnap, dataMoviesSnap] = await Promise.all([
        db.collection('movies').get(),
        db.collection('categories').get(),
        db.collection('content').doc('about').get(),
        db.collection('festival').doc('config').get(),
        db.collection('festival').doc('schedule').collection('days').get(),
        db.collection('content').doc('settings').get(),
        db.collection('editorial_stories').orderBy('publishedAt', 'desc').get(),
        db.collection('data').doc('movies').get()
    ]);

    const moviesData: Record<string, Movie> = {};
    moviesSnap.forEach(doc => {
        moviesData[doc.id] = { key: doc.id, ...doc.data() } as Movie;
    });

    // Merge watch party fields from data/movies into movies
    if (dataMoviesSnap.exists) {
        const dataMovies = dataMoviesSnap.data() as Record<string, Movie>;
        Object.entries(dataMovies).forEach(([key, m]) => {
            if (moviesData[key]) {
                moviesData[key] = {
                    ...moviesData[key],
                    isWatchPartyEnabled: m.isWatchPartyEnabled,
                    watchPartyStartTime: m.watchPartyStartTime,
                    isWatchPartyPaid: m.isWatchPartyPaid,
                    watchPartyPrice: m.watchPartyPrice,
                    watchPartyPayWhatYouWant: m.watchPartyPayWhatYouWant ?? moviesData[key].watchPartyPayWhatYouWant,
                };
            }
        });
    }

    const categoriesData: Record<string, any> = {};
    categoriesSnap.forEach(doc => categoriesData[doc.id] = doc.data());

    const storiesData: EditorialStory[] = [];
    storiesSnap.forEach(doc => storiesData.push({ id: doc.id, ...doc.data() } as EditorialStory));

    // Public branding/details for partner festivals (Festival in a box).
    // Imported lazily: partners.ts itself imports this file.
    let partnerFestivals: Record<string, unknown> = {};
    try {
        const { getPublicPartnerFestivals } = await import('./_lib/partners.js');
        partnerFestivals = await getPublicPartnerFestivals(db);
    } catch (e) {
        console.error('[publish-data] Partner festivals not included in snapshot:', e);
    }

    const liveData = {
        partnerFestivals,
        movies: moviesData,
        categories: categoriesData,
        zineStories: storiesData, // NEW: Include zine stories in manifest
        aboutData: aboutSnap.exists ? aboutSnap.data() : null,
        festivalConfig: festivalConfigSnap.exists ? festivalConfigSnap.data() : null,
        festivalData: festivalDaysSnap.docs.map(d => d.data()).sort((a, b) => a.day - b.day),
        settings: settingsSnap.exists ? settingsSnap.data() : { isHolidayModeActive: false },
        lastPublished: new Date().toISOString(),
        version: Date.now()
    };

    try {
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        let region = process.env.AWS_S3_REGION || 'us-east-1';
        if (region === 'global') region = 'us-east-1';

        // @aws-sdk/client-s3 is pinned to an exact 3.700.0 in package.json
        // (not a ^range) — versions past ~3.729.0 changed the default
        // checksum behavior in a way this bucket/endpoint can't handle,
        // surfacing as an opaque "MaxMessageLengthExceeded" error instead
        // of the real cause. Confirmed live: this was silently breaking
        // the publish step for weeks — the catch below logs and swallows
        // the error, so the endpoint reported success while S3 never
        // actually got updated. requestChecksumCalculation:'WHEN_REQUIRED'
        // below is the documented mitigation but did NOT fix it alone in
        // this bucket's case; the version pin is what actually did.
        const s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
            // Kept even though it didn't turn out to be the fix (see
            // package.json's pinned @aws-sdk/client-s3 version for the real
            // one) — this is still the documented, correct setting to avoid
            // the newer SDK default of always calculating a request
            // checksum via a chunked trailer, so leaving it set.
            requestChecksumCalculation: 'WHEN_REQUIRED',
        });

        // 1. The real data (with video links), scrambled. Written first: the
        //    server reads this one, so it must exist before the public copy
        //    loses its links.
        const sealed = sealSnapshot(liveData);
        if (!sealed) throw new Error('Cannot seal the private snapshot (no secret configured). Public file left unchanged.');
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: PRIVATE_SNAPSHOT_KEY,
            Body: sealed,
            ContentType: 'application/octet-stream',
            CacheControl: 'no-store, max-age=0'
        }));

        // 2. The public file: same data, but no video links for anyone to copy.
        // CRITICAL: Block until S3 update is finished to guarantee next-fetch consistency
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: 'live-data.json',
            Body: Buffer.from(JSON.stringify(publicSafeData(liveData), null, 2)),
            ContentType: 'application/json',
            CacheControl: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
        }));
    } catch (err) {
        console.error("S3 Sync Error:", err);
    }
    return liveData;
};

export async function POST(request: Request) {
    try {
        const { password: __raw_password, operatorName, type, data } = await request.json();
        const password = await resolveAdminCredential(__raw_password);
        const baseRole = getRoleFromPassword(password);

        if (baseRole === 'unknown') {
            return new Response(JSON.stringify({ error: 'Unauthorized Session' }), { status: 401 });
        }
        
        const initError = getInitializationError();
        if (initError) throw new Error(`Cloud DB Config Error: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Cloud Database Cluster Unreachable.");

        const batch = db.batch();
        let auditDetails = `Mutated ${type} resource.`;

        if (type === 'delete_movie') {
            // Look up the video URL BEFORE deleting the catalog entry — the
            // whole point of deleting a film when storage is the concern is
            // to actually reclaim the space, and removing just the Firestore
            // doc leaves the (large) video file sitting in S3 forever,
            // still costing money, with no catalog entry left to find it
            // through. This looks it up first so it can also be removed.
            const movieDoc = await db.collection('movies').doc(data.key).get();
            const fullMovieUrl = movieDoc.exists ? (movieDoc.data() as any)?.fullMovie : null;

            // IRREVERSIBLE PURGE: Remove document from DB
            batch.delete(db.collection('movies').doc(data.key));
            auditDetails = `PURGE: Deleted movie [${data.key}].`;

            // Best-effort — only for files actually hosted on our own S3
            // bucket (older catalog entries sometimes point at a Vimeo/
            // YouTube URL instead, which there's nothing to delete for).
            // Committed as its own step so a storage hiccup here can never
            // block the catalog deletion the admin actually asked for.
            const bucketName = process.env.AWS_S3_BUCKET_NAME;
            if (fullMovieUrl && bucketName && typeof fullMovieUrl === 'string' && fullMovieUrl.includes(`${bucketName}.s3`)) {
                try {
                    let region = process.env.AWS_S3_REGION || 'us-east-1';
                    if (region === 'global') region = 'us-east-1';
                    const s3Key = decodeURIComponent(new URL(fullMovieUrl).pathname.replace(/^\//, ''));
                    const s3Client = new S3Client({
                        region,
                        credentials: {
                            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
                        },
                    });
                    await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: s3Key }));
                    auditDetails += ` Also removed video file from storage (${s3Key}).`;
                } catch (s3Err) {
                    console.error('[publish-data] Failed to delete S3 video file for', data.key, s3Err);
                    auditDetails += ` WARNING: video file cleanup failed — may need manual removal from S3.`;
                }
            }
        }
        else if (type === 'delete_category') {
            // IRREVERSIBLE PURGE: Remove document from DB
            batch.delete(db.collection('categories').doc(data.key));
            auditDetails = `PURGE: Deleted category [${data.key}].`;
        }
        else if (type === 'set_now_streaming') {
            // PROMOTE TO SPOTLIGHT
            batch.set(db.collection('categories').doc('nowStreaming'), {
                title: 'Now Streaming',
                movieKeys: [data.key]
            });
            auditDetails = `PROMOTION: Set [${data.key}] as Global Spotlight Selection.`;
        }
        else if (type === 'movies') {
            for (const [id, docData] of Object.entries(data)) {
                batch.set(db.collection('movies').doc(id), docData as object, { merge: true });
                // Also update the real-time data/movies document so client listeners get watch party fields immediately.
                // SECURITY (Oct 2026): data/movies is publicly readable, so it gets
                // ONLY the watch-party fields browsers listen for — it used to get
                // the whole movie record, including the raw video file link.
                const d = (docData || {}) as Record<string, any>;
                // A new future start time clears a leftover "ended" so the
                // party shows everywhere right away (no Restart needed).
                if (d.isWatchPartyEnabled !== false && typeof d.watchPartyStartTime === 'string' && d.watchPartyStartTime) {
                    const partyRef = db.collection('watch_parties').doc(id);
                    const party = (await partyRef.get()).data();
                    if (resetForNewSchedule(party, Date.parse(d.watchPartyStartTime), Date.now())) {
                        batch.set(partyRef, { status: 'waiting', isPlaying: false, currentTime: 0 }, { merge: true });
                    }
                }
                const publicFields: Record<string, any> = {};
                for (const f of PUBLIC_WATCH_PARTY_FIELDS) if (f in d) publicFields[f] = d[f];
                if (Object.keys(publicFields).length > 0) {
                    batch.set(db.collection('data').doc('movies'), { [id]: publicFields }, { merge: true });
                }
            }
        }
        else if (type === 'festival') {
            const { config, data: days } = data;
            if (config) {
                batch.set(db.collection('festival').doc('config'), config, { merge: true });
            }
            if (Array.isArray(days)) {
                const existingDays = await db.collection('festival').doc('schedule').collection('days').get();
                // Partner festivals ("Festival in a box") keep their own day
                // docs in this collection, managed only through
                // api/admin-partners.ts — the PWFF editor must never delete
                // or overwrite them.
                existingDays.forEach(doc => { if (!doc.data()?.partnerId) batch.delete(doc.ref); });

                days.forEach((day: any) => {
                    if (day && day.day && !day.partnerId) {
                        batch.set(db.collection('festival').doc('schedule').collection('days').doc(`day_${day.day}`), day);
                    }
                });

                // Reset any stale 'live' watch party states for blocks whose
                // screeningStartTime is in the future — prevents old test data
                // from showing "Live Now" before the actual screening time.
                const allBlocks = days.flatMap((day: any) => day.blocks || []);
                const now = new Date();
                for (const block of allBlocks) {
                    if (!block?.id || !block?.screeningStartTime) continue;
                    const screeningTime = new Date(block.screeningStartTime);
                    if (screeningTime > now) {
                        const partyRef = db.collection('watch_parties').doc(block.id);
                        const partyDoc = await partyRef.get();
                        if (partyDoc.exists && (partyDoc.data()?.status === 'live' || resetForNewSchedule(partyDoc.data(), screeningTime.getTime(), now.getTime()))) {
                            batch.set(partyRef, { status: 'waiting' }, { merge: true });
                            console.log(`[PUBLISH] Reset stale live status for block ${block.id} (${block.title})`);
                        }
                    }
                }
            }
            auditDetails = `Instant Sync: Festival manifest updated for ${days?.length || 0} days.`;
        }
        else if (type === 'settings') {
            batch.set(db.collection('content').doc('settings'), data, { merge: true });
        }
        else if (type === 'categories') {
            for (const [id, docData] of Object.entries(data)) {
                batch.set(db.collection('categories').doc(id), docData as object, { merge: true });
            }
            auditDetails = `Modified category logic for ${Object.keys(data).length} rows.`;
        }
        else if (type === 'editorial') {
             // Handle zine saves if triggered from AdminPage wrapper
             for (const [id, docData] of Object.entries(data)) {
                batch.set(db.collection('editorial_stories').doc(id), docData as object, { merge: true });
            }
            auditDetails = `Editorial manifest updated.`;
        }

        const auditLogRef = db.collection('audit_logs').doc();
        const ip = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   '0.0.0.0';

        batch.set(auditLogRef, {
            role: `${baseRole.toUpperCase()}: ${operatorName || 'Unknown'}`,
            action: `SYNC_${type.toUpperCase()}`,
            type: 'MUTATION',
            details: auditDetails,
            ipAddress: ip.split(',')[0].trim(),
            timestamp: FieldValue.serverTimestamp()
        });

        // 1. COMMIT TO FIRESTORE
        await batch.commit();

        // 2. TRIGGER S3 REBUILD AND WAIT (CRITICAL: Ensures Roku & Web see changes simultaneously)
        await assembleAndSyncMasterData(db);

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Global manifest synchronized. All devices updated." 
        }), { status: 200 });

    } catch (error) {
        console.error("Mutation Failure:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
