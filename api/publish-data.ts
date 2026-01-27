import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { Movie, EditorialStory } from '../types.js';

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

const assembleAndSyncMasterData = async (db: Firestore) => {
    // Parallel fetching for manifest assembly - ADDED editorial_stories
    const [moviesSnap, categoriesSnap, aboutSnap, festivalConfigSnap, festivalDaysSnap, settingsSnap, storiesSnap] = await Promise.all([
        db.collection('movies').get(),
        db.collection('categories').get(),
        db.collection('content').doc('about').get(),
        db.collection('festival').doc('config').get(),
        db.collection('festival').doc('schedule').collection('days').get(),
        db.collection('content').doc('settings').get(),
        db.collection('editorial_stories').orderBy('publishedAt', 'desc').get()
    ]);

    const moviesData: Record<string, Movie> = {};
    moviesSnap.forEach(doc => {
        moviesData[doc.id] = { key: doc.id, ...doc.data() } as Movie;
    });

    const categoriesData: Record<string, any> = {};
    categoriesSnap.forEach(doc => categoriesData[doc.id] = doc.data());

    const storiesData: EditorialStory[] = [];
    storiesSnap.forEach(doc => storiesData.push({ id: doc.id, ...doc.data() } as EditorialStory));

    const liveData = {
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

        const s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });

        // CRITICAL: Block until S3 update is finished to guarantee next-fetch consistency
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: 'live-data.json',
            Body: JSON.stringify(liveData, null, 2),
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
        const { password, operatorName, type, data } = await request.json();
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
            // IRREVERSIBLE PURGE: Remove document from DB
            batch.delete(db.collection('movies').doc(data.key));
            auditDetails = `PURGE: Deleted movie [${data.key}].`;
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
            }
        }
        else if (type === 'festival') {
            const { config, data: days } = data;
            if (config) {
                batch.set(db.collection('festival').doc('config'), config, { merge: true });
            }
            if (Array.isArray(days)) {
                const existingDays = await db.collection('festival').doc('schedule').collection('days').get();
                existingDays.forEach(doc => batch.delete(doc.ref));
                
                days.forEach((day: any) => {
                    if (day && day.day) {
                        batch.set(db.collection('festival').doc('schedule').collection('days').doc(`day_${day.day}`), day);
                    }
                });
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
        batch.set(auditLogRef, {
            role: `${baseRole.toUpperCase()}: ${operatorName || 'Unknown'}`,
            action: `SYNC_${type.toUpperCase()}`,
            type: 'MUTATION',
            details: auditDetails,
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