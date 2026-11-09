// Admin → Subscribers.
//
// One endpoint, any valid admin/staff key (same access level as the
// Audience and Email tabs). Actions (POST body `action`):
//   list         every newsletter subscriber, active and cancelled
//   set-status   manually flip one subscriber's status   { email, status: 'active' | 'cancelled' }
//
// Data source: the `zine_subscriptions` collection (one doc per email,
// written by /api/subscribe-newsletter and /api/unsubscribe-newsletter).
// This used to be read straight from the client with the Firestore SDK
// (see CommunicationsTerminal.tsx) — but firestore.rules has no rule
// granting that collection to anyone, admin or not, so that read was
// silently denied and the "zine subscribers" count on the Dispatch tab
// never actually reflected real data. This endpoint reads it with the
// Admin SDK instead, the same pattern as get-user-intelligence.ts and
// get-payouts.ts.
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminPassword, canUseTab } from './_lib/adminAuth.js';
import { isValidEmail } from './_lib/validation.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const toIso = (v: any): string | null => {
    if (!v) return null;
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
};

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { password, action = 'list' } = body || {};
        if (!(await verifyAdminPassword(password)) || !(await canUseTab(password, ['subscribers', 'email']))) {
            return json({ error: 'Unauthorized' }, 401);
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database connection failed.');

        if (action === 'set-status') {
            const { email, status } = body || {};
            if (typeof email !== 'string' || !isValidEmail(email)) return json({ error: 'A valid email is required.' }, 400);
            if (status !== 'active' && status !== 'cancelled') return json({ error: "Status must be 'active' or 'cancelled'." }, 400);

            const ref = db.collection('zine_subscriptions').doc(email.toLowerCase().trim());
            const existing = await ref.get();
            if (!existing.exists) return json({ error: 'No subscriber with that email.' }, 404);

            await ref.set({
                status,
                [status === 'cancelled' ? 'cancelledAt' : 'reactivatedAt']: FieldValue.serverTimestamp(),
            }, { merge: true });

            return json({ success: true });
        }

        // action === 'list' (default)
        const snap = await db.collection('zine_subscriptions').get();
        const subscribers = snap.docs.map(doc => {
            const data = doc.data() || {};
            // Every doc written by subscribe-newsletter.ts sets status: 'active'
            // explicitly, but treat a missing status the same way (older/manual
            // rows) rather than hiding them from either tab.
            const status = data.status === 'cancelled' ? 'cancelled' : 'active';
            return {
                email: doc.id,
                status,
                subscribedAt: toIso(data.timestamp) || toIso(data.subscribedAt),
                cancelledAt: toIso(data.cancelledAt),
            };
        }).sort((a, b) => (b.subscribedAt || '').localeCompare(a.subscribedAt || ''));

        return json({
            subscribers,
            activeCount: subscribers.filter(s => s.status === 'active').length,
            cancelledCount: subscribers.filter(s => s.status === 'cancelled').length,
        });
    } catch (error) {
        console.error('get-subscribers error:', error);
        return json({ error: (error as Error).message }, 500);
    }
}
