// This is a Vercel Serverless Function
// Path: /api/delete-pipeline-entry
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password, id } = await request.json();

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

        await db.collection('movie_pipeline').doc(id).delete();

        return new Response(JSON.stringify({ success: true }), {
            status: 200, 
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error deleting pipeline entry:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}