// This is a Vercel Serverless Function
// Path: /api/get-admin-permissions
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        // --- Authentication ---
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        const collaboratorPassword = process.env.COLLABORATOR_PASSWORD;
        const festivalAdminPassword = process.env.FESTIVAL_ADMIN_PASSWORD;

        let isAuthenticated = false;
        let role = '';

        if (primaryAdminPassword && password === primaryAdminPassword) {
            role = 'super_admin';
            isAuthenticated = true;
        } else if (masterPassword && password === masterPassword) {
            role = 'master';
            isAuthenticated = true;
        } else if (collaboratorPassword && password === collaboratorPassword) {
            role = 'collaborator';
            isAuthenticated = true;
        } else if (festivalAdminPassword && password === festivalAdminPassword) {
            role = 'festival_admin';
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
        
        const anyPasswordSet = primaryAdminPassword || masterPassword || collaboratorPassword || festivalAdminPassword || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
        if (!anyPasswordSet) isAuthenticated = true;

        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        // --- Firestore Logic ---
        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed.");

        const permissionsSnapshot = await db.collection('admin_permissions').get();
        const permissions: Record<string, string[]> = {};
        permissionsSnapshot.forEach(doc => {
            permissions[doc.id] = doc.data().allowedTabs || [];
        });

        return new Response(JSON.stringify({ permissions }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error fetching admin permissions:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}