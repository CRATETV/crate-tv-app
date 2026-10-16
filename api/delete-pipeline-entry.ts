// This is a Vercel Serverless Function
// Path: /api/delete-pipeline-entry
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { resolveAdminCredential } from './_lib/adminSession.js';
import { getSubmissionBucket, parseStorageUrl, deleteUpload } from './_lib/submissionFiles.js';

export async function POST(request: Request) {
    try {
        const { password: __raw_password, id } = await request.json();
        const password = await resolveAdminCredential(__raw_password);

        // --- Authentication ---
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        const collaboratorPassword = process.env.COLLABORATOR_PASSWORD;
        let isAuthenticated = false;

        if (
            (primaryAdminPassword && password === primaryAdminPassword) ||
            (masterPassword && password === masterPassword) ||
            (collaboratorPassword && password === collaboratorPassword)
        ) {
            isAuthenticated = true;
        }
        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
        }
        
        if (!id) {
            return new Response(JSON.stringify({ error: 'Submission ID is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' }});
        }

        // --- Firestore Logic ---
        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed.");

        const ref = db.collection('movie_pipeline').doc(id);
        const entry = (await ref.get()).data();
        await ref.delete();

        // A declined submission's uploaded film and poster are deleted too, so they
        // don't keep using storage. Never for approved/catalog films (the live film
        // plays those files), and never if any movie in the catalog points at them.
        let filesDeleted = 0;
        if (entry && entry.status !== 'approved' && entry.status !== 'catalog') {
            const paths = [...new Set([
                entry.filmStoragePath, entry.posterStoragePath,
                parseStorageUrl(String(entry.movieUrl || ''))?.path, parseStorageUrl(String(entry.posterUrl || ''))?.path,
            ].filter((p): p is string => typeof p === 'string' && p.startsWith('submissions/')))];
            const bucket = paths.length ? getSubmissionBucket() : null;
            if (bucket) {
                const movies = await db.collection('movies').get();
                const inUse = (path: string) => {
                    const encoded = encodeURIComponent(path);
                    return movies.docs.some(m => JSON.stringify(m.data()).includes(encoded));
                };
                for (const path of paths) {
                    if (inUse(path)) continue;
                    await deleteUpload(bucket, path);
                    filesDeleted++;
                }
            }
        }

        return new Response(JSON.stringify({ success: true, filesDeleted }), {
            status: 200, 
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error deleting pipeline entry:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}