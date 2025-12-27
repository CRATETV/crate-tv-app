
// This is a Vercel Serverless Function
// Path: /api/get-pipeline-data
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { MoviePipelineEntry } from '../types.js';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        // --- Authentication ---
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        const collaboratorPassword = process.env.COLLABORATOR_PASSWORD;
        const festivalAdminPassword = process.env.FESTIVAL_ADMIN_PASSWORD;

        let isAuthenticated = false;
        // FIX: Declare 'role' variable to avoid ReferenceError when assigning it inside the loop
        let role = '';

        if (
            (primaryAdminPassword && password === primaryAdminPassword) ||
            (masterPassword && password === masterPassword) ||
            (collaboratorPassword && password === collaboratorPassword) ||
            (festivalAdminPassword && password === festivalAdminPassword)
        ) {
            isAuthenticated = true;
        } else {
             for (const key in process.env) {
                if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                    role = key.replace('ADMIN_PASSWORD_', '').toLowerCase();
                    isAuthenticated = true;
                    break;
                }
            }
        }

        // Allow access if no passwords are configured at all (Initial Setup Mode)
        const anyPasswordSet = primaryAdminPassword || masterPassword || collaboratorPassword || festivalAdminPassword || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
        if (!anyPasswordSet) isAuthenticated = true;

        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
        }
        
        // --- Firestore Logic ---
        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed.");

        const pipelineSnapshot = await db.collection('movie_pipeline').orderBy('submissionDate', 'desc').get();
        const pipeline: MoviePipelineEntry[] = [];
        pipelineSnapshot.forEach(doc => {
            pipeline.push({ id: doc.id, ...doc.data() } as MoviePipelineEntry);
        });

        return new Response(JSON.stringify({ pipeline }), {
            status: 200, 
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error fetching pipeline data:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
