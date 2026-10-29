import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { verifyReminderToken } from './_lib/premiereReminders.js';
import { reminderSecret } from './_lib/sendPremiereReminders.js';

// "Remind me" on an upcoming premiere (Oct 29 2026).
// POST { idToken, action: 'mine' | 'add' | 'remove', movieKey? }  (signed-in viewers only)
// GET  ?t=<token from a reminder email>  stops reminders for that film, one click, no sign-in.
// Signed-in only on purpose: reminders go to the account's own email, so nobody can
// sign someone else's address up.
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const docId = (key: string, uid: string) => `${key}__${uid}`;

export async function POST(request: Request) {
    try {
        if (!rateLimit(`premiere-remind:${getIP(request)}`, 60, 10 * 60_000)) return json({ error: 'Too many requests. Please try again later.' }, 429);
        const { idToken, action, movieKey } = await request.json().catch(() => ({}));
        if (typeof idToken !== 'string' || !idToken) return json({ error: 'Sign in required.' }, 401);
        if (action !== 'mine' && action !== 'add' && action !== 'remove') return json({ error: 'Invalid request.' }, 400);

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        const auth = getAdminAuth();
        if (!db || !auth) throw new Error('Database connection is not available.');

        let uid: string, email: string | undefined;
        try { const d = await auth.verifyIdToken(idToken); uid = d.uid; email = d.email; }
        catch { return json({ error: 'Invalid session.' }, 401); }

        if (action === 'mine') {
            const snap = await db.collection('premiere_reminders').where('uid', '==', uid).get();
            return json({ movieKeys: snap.docs.map(d => d.data().movieKey).filter(Boolean) });
        }

        const key = typeof movieKey === 'string' ? movieKey.trim() : '';
        if (!key || key.length > 200 || /[.\/\[\]*`~#]/.test(key)) return json({ error: 'Invalid film.' }, 400);

        if (action === 'remove') {
            await db.collection('premiere_reminders').doc(docId(key, uid)).delete();
            return json({ success: true });
        }

        if (!email) return json({ error: 'Your account needs an email address to send reminders to.' }, 400);
        // Only real premieres: a film with a watch party, or a festival block.
        let known = (await db.collection('movies').doc(key).get()).exists;
        if (!known) {
            const days = await db.collection('festival').doc('schedule').collection('days').get();
            known = days.docs.some(d => ((d.data().blocks || []) as any[]).some(b => b?.id === key));
        }
        if (!known) return json({ error: 'Unknown premiere.' }, 404);
        await db.collection('premiere_reminders').doc(docId(key, uid)).set({ movieKey: key, uid, email: email.toLowerCase(), createdAt: new Date().toISOString() });
        return json({ success: true });
    } catch (error) {
        console.error('premiere-remind failed:', error);
        return json({ error: 'Could not save that. Please try again.' }, 500);
    }
}

export async function GET(request: Request) {
    const page = (msg: string, status = 200) => new Response(
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Crate TV reminders</title></head><body style="font-family:system-ui,sans-serif;background:#000;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px"><div style="max-width:420px;text-align:center"><h1 style="font-size:22px">${msg}</h1><p><a style="color:#ef4444" href="https://cratetv.net">Go to Crate TV</a></p></div></body></html>`,
        { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    try {
        if (!rateLimit(`premiere-unsub:${getIP(request)}`, 30, 10 * 60_000)) return page('Too many tries. Please try again later.', 429);
        const claims = verifyReminderToken(reminderSecret(), new URL(request.url).searchParams.get('t'));
        if (!claims) return page('That link is not valid any more.', 400);
        const db = getAdminDb();
        if (!db) throw new Error('db');
        await db.collection('premiere_reminders').doc(docId(claims.movieKey, claims.uid)).delete();
        return page('Done. You will not get more reminders for this film.');
    } catch (error) {
        console.error('premiere-remind unsubscribe failed:', error);
        return page('Something went wrong. Please try the link again.', 500);
    }
}
