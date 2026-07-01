import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        const isAuthenticated =
            (primaryAdminPassword && password === primaryAdminPassword) ||
            (masterPassword && password === masterPassword);

        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline.');

        const snapshot = await db
            .collection('error_logs')
            .orderBy('timestamp', 'desc')
            .limit(200)
            .get();

        const logs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                source: data.source || 'unknown',
                origin: data.origin || 'unknown',
                message: data.message || '',
                stack: data.stack || null,
                url: data.url || null,
                context: data.context || null,
                userAgent: data.userAgent || null,
                ipAddress: data.ipAddress || '',
                timestamp: data.timestamp
                    ? { seconds: data.timestamp._seconds ?? data.timestamp.seconds ?? null }
                    : null,
            };
        });

        return new Response(JSON.stringify({ logs }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500 }
        );
    }
}
