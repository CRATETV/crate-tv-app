// api/film-intake.ts
// Backs the "Films to add" checklist in Bulk upload films.
// Body: { password, action: 'list' | 'add' | 'toggle' | 'delete', ... }
//   add:    { text, festival? }  one film per line
//   toggle: { id, done }         tick / untick by hand
//   delete: { id }               or { clearDone: [ids] }

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { verifyAdminPassword, canUseTab } from './_lib/adminAuth.js';
import { FieldValue } from 'firebase-admin/firestore';
import { parseIntakeLines } from './_lib/filmIntake.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const ID = /^[A-Za-z0-9_-]{1,128}$/;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { password, action } = body;
        if (!(await verifyAdminPassword(password)) || !(await canUseTab(password, ['bulkUpload', 'movies']))) {
            return json({ error: 'Unauthorized' }, 401);
        }
        const initError = getInitializationError();
        if (initError) return json({ error: initError }, 500);
        const db = getAdminDb();
        if (!db) return json({ error: 'Database unavailable' }, 500);
        const col = db.collection('film_intake');

        if (action === 'add') {
            const drafts = parseIntakeLines(body.text, body.festival);
            if (!drafts.length) return json({ error: 'Type or paste at least one film title.' }, 400);
            // Skip titles already on the list so pasting twice does not double everything.
            const existing = new Set((await col.get()).docs.map(d => String(d.get('title') || '').toLowerCase()));
            const fresh = drafts.filter(d => !existing.has(d.title.toLowerCase()));
            const batch = db.batch();
            fresh.forEach(d => batch.set(col.doc(), { ...d, manualDone: false, addedAt: FieldValue.serverTimestamp() }));
            await batch.commit();
            return json({ success: true, added: fresh.length, skipped: drafts.length - fresh.length });
        }

        if (action === 'toggle') {
            if (typeof body.id !== 'string' || !ID.test(body.id)) return json({ error: 'Bad id' }, 400);
            await col.doc(body.id).update({ manualDone: body.done === true });
            return json({ success: true });
        }

        if (action === 'delete') {
            const ids: string[] = Array.isArray(body.clearDone) ? body.clearDone : [body.id];
            const good = ids.filter(i => typeof i === 'string' && ID.test(i)).slice(0, 450);
            if (!good.length) return json({ error: 'Nothing to remove' }, 400);
            const batch = db.batch();
            good.forEach(i => batch.delete(col.doc(i)));
            await batch.commit();
            return json({ success: true, removed: good.length });
        }

        // list (default)
        const snap = await col.orderBy('addedAt', 'asc').limit(500).get();
        return json({
            items: snap.docs.map(d => ({
                id: d.id,
                title: d.get('title') || '',
                filmmaker: d.get('filmmaker') || '',
                festival: d.get('festival') || '',
                manualDone: d.get('manualDone') === true,
            })),
        });
    } catch (error) {
        console.error('film-intake error:', error);
        return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
}
