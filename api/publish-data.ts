
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { Movie } from '../types.js';

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

        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: 'live-data.json',
            Body: JSON.stringify(liveData, null, 2),
            ContentType: 'application/json',
            CacheControl: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
        }));
    } catch (err) {
        throw new Error("Critical: S3 Sync Failure.");
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
            const { key } = data;
            batch.delete(db.collection('movies').doc(key));
            auditDetails = `PURGE: Irreversibly deleted movie record [${key}].`;
        } 
        else if (type === 'set_now_streaming') {
            batch.set(db.collection('categories').doc('nowStreaming'), { title: 'Now Streaming', movieKeys: [data.key] }, { merge: false });
            auditDetails = `Update global spotlight to film [${data.key}].`;
        }
        else if (type === 'movies') {
            for (const [id, docData] of Object.entries(data)) {
                batch.set(db.collection('movies').doc(id), docData as object, { merge: true });
            }
            auditDetails = `Updated metadata for ${Object.keys(data).length} film(s).`;
        }
        else if (type === 'categories') {
            for (const [id, docData] of Object.entries(data)) {
                batch.set(db.collection('categories').doc(id), docData as object, { merge: false });
            }
            auditDetails = `Re-mapped category infrastructure rows.`;
        }
        else if (type === 'settings') {
            batch.set(db.collection('content').doc('settings'), data, { merge: true });
            auditDetails = `Modified global site settings (Holiday/Branding).`;
        }
        else if (type === 'festival') {
            const { config, data: days } = data;
            if (config) {
                batch.set(db.collection('festival').doc('config'), config, { merge: true });
            }
            if (Array.isArray(days)) {
                days.forEach((day: any) => {
                    batch.set(db.collection('festival').doc('schedule').collection('days').doc(`day_${day.day}`), day, { merge: false });
                });
            }
            auditDetails = `Synchronized annual festival manifest and schedule days.`;
        }

        // LOG AUDIT TRAIL
        const auditLogRef = db.collection('audit_logs').doc();
        batch.set(auditLogRef, {
            role: `${baseRole.toUpperCase()}: ${operatorName || 'Unknown'}`,
            action: `DATA_MUTATION_${type.toUpperCase()}`,
            type: type === 'delete_movie' ? 'PURGE' : 'MUTATION',
            details: auditDetails,
            timestamp: FieldValue.serverTimestamp()
        });

        await batch.commit();
        const finalManifest = await assembleAndSyncMasterData(db);

        return new Response(JSON.stringify({ 
            success: true, 
            version: finalManifest.version 
        }), { status: 200 });

    } catch (error) {
        console.error("Mutation Failure:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
