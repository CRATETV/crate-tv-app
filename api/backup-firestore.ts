import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { runAndRecordBackup } from './_lib/runBackup.js';

// Weekly backup of the whole database to the private backup bucket (vercel.json: Sundays).
// What is saved and how long it is kept: api/_lib/backup.ts.
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) return new Response('Unauthorized', { status: 401 });
    const initError = getInitializationError();
    const db = initError ? null : getAdminDb();
    if (!db) return new Response(JSON.stringify({ error: 'Database not available.' }), { status: 500 });
    const status = await runAndRecordBackup(db);
    return new Response(JSON.stringify(status), { status: status.ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } });
}
