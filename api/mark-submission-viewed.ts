// api/mark-submission-viewed.ts
// Clears the "NEW" flag on film submissions once an admin has opened them.
// Body: { password, submissionId } to mark one, or { password, all: true } to mark every unseen one.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { verifyAdminPassword } from './_lib/adminAuth.js';
import { FieldValue } from 'firebase-admin/firestore';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const MAX_BATCH = 450; // Firestore batches cap at 500 writes

export async function POST(request: Request) {
    try {
        const { password, submissionId, all } = await request.json();

        if (!(await verifyAdminPassword(password))) {
            return json({ error: 'Unauthorized' }, 401);
        }

        if (!all && (typeof submissionId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(submissionId))) {
            return json({ error: 'A valid submissionId (or all: true) is required' }, 400);
        }

        const initError = getInitializationError();
        if (initError) return json({ error: initError }, 500);
        const db = getAdminDb();
        if (!db) return json({ error: 'Database unavailable' }, 500);

        if (all) {
            const unseen = await db.collection('movie_pipeline').where('status', '==', 'submitted').get();
            const toMark = unseen.docs.filter(doc => !doc.get('viewedAt'));
            for (let i = 0; i < toMark.length; i += MAX_BATCH) {
                const batch = db.batch();
                toMark.slice(i, i + MAX_BATCH).forEach(doc => batch.update(doc.ref, { viewedAt: FieldValue.serverTimestamp() }));
                await batch.commit();
            }
            return json({ success: true, marked: toMark.length });
        }

        const ref = db.collection('movie_pipeline').doc(submissionId);
        const doc = await ref.get();
        if (!doc.exists) return json({ error: 'Submission not found' }, 404);

        // Keep the first-view time if another admin already opened it.
        if (!doc.get('viewedAt')) {
            await ref.update({ viewedAt: FieldValue.serverTimestamp() });
        }
        return json({ success: true });

    } catch (error) {
        console.error('mark-submission-viewed error:', error);
        return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
}
