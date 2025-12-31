import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { Movie } from '../types.js';

const checkAuth = (password: string | null) => {
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (!password) return false;
    if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) return true;
    for (const key in process.env) {
        if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) return true;
    }
    return false;
};

const assembleAndSyncMasterData = async (db: Firestore) => {
    // Collect all fragments from Firestore with zero-latency snapshot retrieval
    const [moviesSnap, categoriesSnap, aboutSnap, festivalConfigSnap, festivalDaysSnap, settingsSnap] = await Promise.all([
        db.collection('movies').get(),
        db.collection('categories').get(),
        db.collection('content').doc('about').get(),
        db.collection('festival').doc('config').get(),
        db.collection('festival').doc('schedule').collection('days').get(),
        db.collection('content').doc('settings').get()
    ]);

    const moviesData: Record<string, Movie> = {};
    moviesSnap.forEach(doc => {
        moviesData[doc.id] = { key: doc.id, ...doc.data() } as Movie;
    });

    const categoriesData: Record<string, any> = {};
    categoriesSnap.forEach(doc => categoriesData[doc.id] = doc.data());

    const liveData = {
        movies: moviesData,
        categories: categoriesData,
        aboutData: aboutSnap.exists ? aboutSnap.data() : null,
        festivalConfig: festivalConfigSnap.exists ? festivalConfigSnap.data() : null,
        festivalData: festivalDaysSnap.docs.map(d => d.data()).sort((a, b) => a.day - b.day),
        settings: settingsSnap.exists ? settingsSnap.data() : { isHolidayModeActive: false },
        lastPublished: new Date().toISOString(),
        version: Date.now() // Forced manifest versioning
    };

    // SYNC TO S3 (The Source of Truth for the public frontend)
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

        // FORCE S3 NO-CACHE ON WRITE
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: 'live-data.json',
            Body: JSON.stringify(liveData, null, 2),
            ContentType: 'application/json',
            CacheControl: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
        }));
        console.log(`[Studio Sync] Master Manifest V${liveData.version} synchronized.`);
    } catch (err) {
        console.error("[Studio Sync Error] S3 write failed:", err);
        throw new Error("Critical: S3 Sync Failure. Check AWS Credentials.");
    }

    return liveData;
};

export async function POST(request: Request) {
    try {
        const { password, type, data } = await request.json();

        if (!checkAuth(password)) {
            return new Response(JSON.stringify({ error: 'Unauthorized Session' }), { status: 401 });
        }
        
        const initError = getInitializationError();
        if (initError) throw new Error(`Cloud DB Config Error: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Cloud Database Cluster Unreachable.");

        const batch = db.batch();

        if (type === 'delete_movie') {
            const { key } = data;
            if (!key) throw new Error("Target Movie Key required for purge.");
            batch.delete(db.collection('movies').doc(key));
            const categoriesSnap = await db.collection('categories').get();
            categoriesSnap.forEach(doc => {
                const c = doc.data();
                if (c.movieKeys?.includes(key)) {
                    batch.update(doc.ref, { movieKeys: FieldValue.arrayRemove(key) });
                }
            });
        } 
        else if (type === 'set_now_streaming') {
            const { key } = data;
            if (!key) throw new Error("Spotlight key required.");
            const catRef = db.collection('categories').doc('nowStreaming');
            batch.set(catRef, { title: 'Now Streaming', movieKeys: [key] }, { merge: false });
        }
        else if (type === 'movies') {
            for (const [id, docData] of Object.entries(data)) {
                batch.set(db.collection('movies').doc(id), docData as object, { merge: true });
            }
        }
        else if (type === 'categories') {
            const currentCatsSnap = await db.collection('categories').get();
            const incomingKeys = Object.keys(data);
            currentCatsSnap.forEach(doc => {
                if (doc.id === 'nowStreaming' || doc.id === 'featured' || doc.id === 'publicDomainIndie') return;
                if (!incomingKeys.includes(doc.id)) batch.delete(doc.ref);
            });
            for (const [id, docData] of Object.entries(data)) {
                batch.set(db.collection('categories').doc(id), docData as object, { merge: false });
            }
        }
        else if (type === 'settings') {
            batch.set(db.collection('content').doc('settings'), data, { merge: true });
        }
        else if (type === 'about') {
            batch.set(db.collection('content').doc('about'), data, { merge: true });
        }
        else if (type === 'festival') {
            const { config, schedule } = data;
            if (config) batch.set(db.collection('festival').doc('config'), config, { merge: true });
            if (schedule && Array.isArray(schedule)) {
                for (const day of schedule) {
                    batch.set(db.collection('festival').doc('schedule').collection('days').doc(`day${day.day}`), day);
                }
            }
        }

        // 1. Commit DB changes
        await batch.commit();

        // 2. Critical: Wait for cloud assembly and S3 write to complete before returning success
        const finalManifest = await assembleAndSyncMasterData(db);

        return new Response(JSON.stringify({ 
            success: true, 
            version: finalManifest.version 
        }), { 
            status: 200,
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'X-Sync-Version': finalManifest.version.toString()
            }
        });

    } catch (error) {
        console.error("Critical Admin Sync Failure:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}