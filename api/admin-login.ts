// This is a Vercel Serverless Function
// It will be accessible at the path /api/admin-login
export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        const adminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;

        if (!password) {
             return new Response(JSON.stringify({ error: 'Password cannot be empty.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Master Password Override Check
        if (masterPassword && password === masterPassword) {
            return new Response(JSON.stringify({ success: true, usedMasterKey: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Primary Password Check (if set)
        if (adminPassword) {
            if (password === adminPassword) {
                return new Response(JSON.stringify({ success: true, usedMasterKey: false }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            } else {
                // Incorrect password if primary is set and doesn't match
                return new Response(JSON.stringify({ error: 'Incorrect password.' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }
        
        // First-Time Setup Mode (if no passwords are set)
        if (!adminPassword && !masterPassword) {
            console.log("No admin passwords set. Activating first-time setup mode for the session.");
            return new Response(JSON.stringify({ success: true, firstLogin: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Fallback for when master is set but primary is not, and user enters wrong password
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