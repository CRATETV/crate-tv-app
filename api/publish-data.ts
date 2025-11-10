// This is a Vercel Serverless Function
// It will be accessible at the path /api/publish-data
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

const checkAuth = (password: string | null) => {
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    let isAuthenticated = false;

    if (!password) return false;
    
    // Check against built-in roles
    if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
        isAuthenticated = true;
    } else {
        // Check against dynamic roles from environment variables
        for (const key in process.env) {
            if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                isAuthenticated = true;
                break;
            }
        }
    }
    return isAuthenticated;
};

export async function POST(request: Request) {
    try {
        const { password, type, data } = await request.json();

        if (!checkAuth(password)) {
            return new Response(JSON.stringify({ error: 'Unauthorized. Invalid or missing password.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        if (!type || !data || typeof data !== 'object') {
            return new Response(JSON.stringify({ error: 'Invalid request body. "type" and "data" are required.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const validTypes = ['movies', 'categories', 'festival', 'about'];
        if (!validTypes.includes(type)) {
            return new Response(JSON.stringify({ error: `Invalid data type provided: ${type}` }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed. Could not save data.");

        const batch = db.batch();

        switch (type) {
            case 'movies':
            case 'categories':
                for (const [id, docData] of Object.entries(data)) {
                    const docRef = db.collection(type).doc(id);
                    // FIX: Cast `docData` to `object` to satisfy Firestore's `set` method signature.
                    batch.set(docRef, docData as object, { merge: true });
                }
                break;
            case 'about':
                const aboutRef = db.collection('content').doc('about');
                batch.set(aboutRef, data, { merge: true });
                break;
            case 'festival':
                const festivalPayload = data as { config?: any, schedule?: any[] };
                if (festivalPayload.config) {
                    const configRef = db.collection('festival').doc('config');
                    batch.set(configRef, festivalPayload.config, { merge: true });
                }
                if (festivalPayload.schedule) {
                    for (const day of festivalPayload.schedule) {
                        const dayRef = db.collection('festival').doc('schedule').collection('days').doc(`day${day.day}`);
                        batch.set(dayRef, day);
                    }
                }
                break;
        }

        await batch.commit();

        return new Response(JSON.stringify({ success: true, message: `Data of type '${type}' published successfully.` }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("[API /publish-data] Error:", error);
        const errorMessage = error instanceof Error ? error.message : 'A server error occurred while publishing data.';
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}