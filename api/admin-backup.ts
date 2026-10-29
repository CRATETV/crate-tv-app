// Admin → Overview → Backups card (top admin only).
//   POST { password, action: 'status' } → { configured, status }
//   POST { password, action: 'run' }    → runs a backup now, returns its status
import { isMasterAdmin } from './_lib/adminAuth.js';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { backupStore, runAndRecordBackup } from './_lib/runBackup.js';

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await isMasterAdmin(body.password))) return json({ error: 'Only the main admin can use backups.' }, 401);
        const initError = getInitializationError();
        const db = initError ? null : getAdminDb();
        if (!db) return json({ error: 'Database not available.' }, 500);
        const configured = !!backupStore();
        if (body.action === 'run') {
            if (!configured) return json({ error: 'No private backup bucket is set up yet.' }, 400);
            const status = await runAndRecordBackup(db);
            return json({ configured, status });
        }
        const snap = await db.collection('admin_status').doc('backup').get();
        return json({ configured, status: snap.exists ? snap.data() : null });
    } catch (e) {
        console.error('admin-backup failed:', e);
        return json({ error: 'Could not read backups.' }, 500);
    }
}
