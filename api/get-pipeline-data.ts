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