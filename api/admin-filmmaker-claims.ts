// Admin → Earnings & payouts → "Filmmaker dashboards". Master admin only.
//
//   POST { action:'list' }              pending requests + every account with a dashboard
//   POST { action:'approve', uid }      switch the dashboard on for a pending request
//   POST { action:'decline', uid }      turn a pending request down
//   POST { action:'revoke', uid }       switch an account's dashboard off
//
// See api/filmmaker-signup.ts for why requests can wait here.
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { isMasterAdmin } from './_lib/adminAuth.js';
import { cleanLine, escapeHtml } from './_lib/validation.js';
import { renderBrandedEmail } from './_lib/emailBranding.js';
import { grantFilmmaker } from './filmmaker-signup.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const toIso = (v: any): string | null => {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    return null;
};

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await isMasterAdmin(body.password))) return json({ error: 'Unauthorized' }, 401);
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        const auth = getAdminAuth();
        if (!db || !auth) throw new Error('Database connection failed.');
        const action = String(body.action || 'list');

        if (action === 'list') {
            const [pendingSnap, filmmakersSnap] = await Promise.all([
                db.collection('filmmaker_claims').where('status', '==', 'pending').limit(200).get(),
                db.collection('users').where('isFilmmaker', '==', true).limit(1000).get(),
            ]);
            const pending = await Promise.all(pendingSnap.docs.map(async d => {
                let emailConfirmed = false;
                try { emailConfirmed = (await auth.getUser(d.id)).emailVerified === true; } catch { /* account gone */ }
                return { uid: d.id, name: d.data().name, email: d.data().email, createdAt: toIso(d.data().createdAt), emailConfirmed };
            }));
            return json({
                pending,
                filmmakers: filmmakersSnap.docs.map(d => {
                    const x = d.data();
                    return {
                        uid: d.id, email: x.email || '', name: x.verifiedFilmmakerName || x.name || '',
                        via: x.filmmakerVerifiedVia || 'before Oct 2026 (not checked)', at: x.filmmakerVerifiedAt || null,
                    };
                }).sort((a, b) => a.name.localeCompare(b.name)),
            });
        }

        const uid = cleanLine(body.uid, 128);
        if (!uid) return json({ error: 'Missing account.' }, 400);
        const claimRef = db.collection('filmmaker_claims').doc(uid);

        if (action === 'approve') {
            const claim = (await claimRef.get()).data();
            if (!claim || claim.status !== 'pending') return json({ error: 'That request is no longer waiting.' }, 404);
            await grantFilmmaker(db, auth, uid, String(claim.name), 'approved by admin');
            await claimRef.set({ status: 'approved', via: 'approved by admin', decidedAt: FieldValue.serverTimestamp() }, { merge: true });
            await db.collection('audit_logs').add({ action: 'FILMMAKER_APPROVED', type: 'SECURITY', operatorName: 'ADMIN', timestamp: FieldValue.serverTimestamp(), details: `${claim.name} (${claim.email})` }).catch(() => {});
            if (process.env.RESEND_API_KEY && claim.email) {
                try {
                    await new Resend(process.env.RESEND_API_KEY).emails.send({
                        from: `CRATE TV <${process.env.FROM_EMAIL || 'noreply@cratetv.net'}>`,
                        to: claim.email,
                        subject: 'Your Filmmaker Dashboard is ready',
                        html: renderBrandedEmail({
                            title: 'Your Filmmaker Dashboard is ready',
                            bodyHtml: `<h1 style="margin:0 0 16px;font-size:24px;font-weight:900;">You're all set, ${escapeHtml(claim.name)}</h1>
<p style="margin:0 0 12px;">Your Filmmaker Dashboard is on. Sign in at cratetv.net to see your views and earnings, and choose how you'd like to be paid.</p>`,
                        }),
                    });
                } catch (e) { console.error('[admin-filmmaker-claims] email failed', e); }
            }
            return json({ success: true });
        }

        if (action === 'decline') {
            await claimRef.set({ status: 'declined', decidedAt: FieldValue.serverTimestamp() }, { merge: true });
            return json({ success: true });
        }

        if (action === 'revoke') {
            const user = await auth.getUser(uid);
            await auth.setCustomUserClaims(uid, { ...(user.customClaims || {}), isFilmmaker: false });
            const before = (await db.collection('users').doc(uid).get()).data() || {};
            await db.collection('users').doc(uid).set({
                isFilmmaker: false,
                verifiedFilmmakerName: FieldValue.delete(),
                filmmakerVerifiedVia: FieldValue.delete(),
                filmmakerVerifiedAt: FieldValue.delete(),
            }, { merge: true });
            await claimRef.set({ status: 'revoked', decidedAt: FieldValue.serverTimestamp() }, { merge: true });
            await db.collection('audit_logs').add({ action: 'FILMMAKER_REVOKED', type: 'SECURITY', operatorName: 'ADMIN', timestamp: FieldValue.serverTimestamp(), details: `${before.verifiedFilmmakerName || before.name || uid} (${before.email || ''})` }).catch(() => {});
            return json({ success: true });
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (e) {
        console.error('[admin-filmmaker-claims]', e);
        return json({ error: (e as Error).message }, 500);
    }
}
