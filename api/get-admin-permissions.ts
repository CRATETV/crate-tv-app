import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        // Authentication check
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        let isAuthenticated = false;

        if (password && (password === primaryAdminPassword || password === masterPassword)) {
            isAuthenticated = true;
        } else if (password) {
            for (const key in process.env) {
                if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                    isAuthenticated = true;
                    break;
                }
            }
        }

        // Allow access if no passwords are configured (Initial Setup Mode)
        const anyPasswordSet = process.env.ADMIN_PASSWORD || process.env.ADMIN_MASTER_PASSWORD || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
        if (!anyPasswordSet) isAuthenticated = true;

        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        
        const initError = getInitializationError();
        if (initError) {
            // Return 200 with a warning payload to prevent fetch failures in the UI
            return new Response(JSON.stringify({ permissions: {}, warning: initError }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
        
        const db = getAdminDb();
        if (!db) {
            return new Response(JSON.stringify({ permissions: {}, warning: "Database connection unavailable." }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const permsSnapshot = await db.collection('admin_permissions').get();
        const permissions: Record<string, string[]> = {};
        permsSnapshot.forEach(doc => {
            permissions[doc.id] = doc.data().allowedTabs || [];
        });

        return new Response(JSON.stringify({ permissions }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error("Permissions fetch error:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}