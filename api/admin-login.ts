// This is a Vercel Serverless Function
// It will be accessible at the path /api/admin-login
export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        if (!password) {
             return new Response(JSON.stringify({ error: 'Password cannot be empty.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        const festivalAdminPassword = 'PWFF1218';
        const collaboratorPassword = 'C0ll@868';

        // --- Role-Based Password Checks ---

        // 1. Check for Festival Admin Role
        if (password === festivalAdminPassword) {
            return new Response(JSON.stringify({ success: true, role: 'festival_admin' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 2. Check for new Collaborator Role
        if (password === collaboratorPassword) {
            return new Response(JSON.stringify({ success: true, role: 'collaborator' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // 3. Check against the primary password for Super Admin
        if (primaryAdminPassword && password === primaryAdminPassword) {
            return new Response(JSON.stringify({ success: true, role: 'super_admin' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 4. Check against the master password override for Super Admin
        if (masterPassword && password === masterPassword) {
            return new Response(JSON.stringify({ success: true, role: 'super_admin' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 5. Check against the list of additional user passwords for Super Admin
        for (const key in process.env) {
            if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                 return new Response(JSON.stringify({ success: true, role: 'super_admin' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }
        
        // 6. First-Time Setup Mode (if no passwords of any kind are set)
        const anyPasswordSet = primaryAdminPassword || masterPassword || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
        if (!anyPasswordSet) {
            console.log("No admin passwords set. Activating first-time setup mode for the session.");
            return new Response(JSON.stringify({ success: true, firstLogin: true, role: 'super_admin' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 7. If all checks fail, deny access
        return new Response(JSON.stringify({ error: 'Incorrect password.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in admin-login API:', error);
        return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}