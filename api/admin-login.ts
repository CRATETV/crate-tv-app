// This is a Vercel Serverless Function
// It will be accessible at the path /api/admin-login
export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!password) {
             return new Response(JSON.stringify({ error: 'Password cannot be empty.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // If ADMIN_PASSWORD is set in environment, enforce it for security
        if (adminPassword) {
            if (password === adminPassword) {
                // Correct password for an existing setup
                return new Response(JSON.stringify({ success: true, firstLogin: false }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            } else {
                // Incorrect password
                return new Response(JSON.stringify({ error: 'Incorrect password.' }), {
                    status: 401, // Unauthorized
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        } else {
            // SETUP MODE: If ADMIN_PASSWORD is NOT set, this is a first-time setup.
            // Accept the provided password for this session only.
            console.log("ADMIN_PASSWORD not set. Activating first-time setup mode for the session.");
            return new Response(JSON.stringify({ success: true, firstLogin: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

    } catch (error) {
        console.error('Error in admin-login API:', error);
        return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}