// This is a Vercel Serverless Function
// Path: /api/set-admin-permissions
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password, role, allowedTabs } = await request.json();

        // --- Authentication (only super/master admins can set permissions) ---
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        if (password !== primaryAdminPassword && password !== masterPassword) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        if (!role || !Array.isArray(allowedTabs)) {
            return new Response(JSON.stringify({ error: 'Role and a list of allowed tabs are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // --- Firestore Logic ---
        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed.");

        const permissionsRef = db.collection('admin_permissions').doc(role);
        await permissionsRef.set({ allowedTabs });

        return new Response(JSON.stringify({ success: true, message: `Permissions for role '${role}' have been updated.` }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error setting admin permissions:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
