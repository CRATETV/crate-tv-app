// This is a Vercel Serverless Function
// It will be accessible at the path /api/admin-login
export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        if (!process.env.ADMIN_PASSWORD) {
            console.error('ADMIN_PASSWORD environment variable is not set.');
            return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        if (!password) {
             return new Response(JSON.stringify({ error: 'Password is required.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (password === process.env.ADMIN_PASSWORD) {
            // Password is correct
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            // Password is incorrect
            return new Response(JSON.stringify({ error: 'Incorrect password.' }), {
                status: 401, // Unauthorized
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