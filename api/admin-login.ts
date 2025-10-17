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

        // --- Standard Admin Password Checks ---

        // 1. Check against the primary password
        if (primaryAdminPassword && password === primaryAdminPassword) {
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 2. Check against the master password override
        if (masterPassword && password === masterPassword) {
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 3. Check against the list of additional user passwords
        for (const key in process.env) {
            if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                 return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }
        
        // 4. First-Time Setup Mode (if no passwords of any kind are set)
        const anyPasswordSet = primaryAdminPassword || masterPassword || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
        if (!anyPasswordSet) {
            console.log("No admin passwords set. Activating first-time setup mode for the session.");
            return new Response(JSON.stringify({ success: true, firstLogin: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 5. If all checks fail, deny access
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