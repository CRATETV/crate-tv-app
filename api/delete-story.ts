import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password, id } = await request.json();

        // 1. Authentication check
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        if (password !== primaryAdminPassword && password !== masterPassword) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!id) {
            return new Response(JSON.stringify({ error: 'Story ID is required.' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("Infrastructure Offline");

        // 2. Delete the document
        await db.collection('editorial_stories').doc(id).delete();

        return new Response(JSON.stringify({ success: true }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Editorial deletion error:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}