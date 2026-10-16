// A verified filmmaker's own payout preference (how CRATE should pay them).
// GET  (Authorization: Bearer <Firebase ID token>)  → { pref }
// POST { method, handle, email }                    → saves it
// Stored in payee_profiles/<their normalised credited name>, the same record
// the admin Earnings & Payouts page reads and can also edit.
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { normalize } from './_lib/creditMatch.js';
import { PAYOUT_METHOD_LABELS, PayoutMethod } from './_lib/revenueSplit.js';
import { cleanLine, isValidEmail } from './_lib/validation.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function resolveFilmmaker(request: Request) {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
    if (!token) return { error: json({ error: 'Please sign in.' }, 401) };
    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb(); const auth = getAdminAuth();
    if (!db || !auth) throw new Error('Database connection failed.');
    let uid: string;
    try { uid = (await auth.verifyIdToken(token)).uid; } catch { return { error: json({ error: 'Your session expired. Please sign in again.' }, 401) }; }
    const user = (await db.collection('users').doc(uid).get()).data();
    if (!user?.isFilmmaker) return { error: json({ error: 'This account is not a verified filmmaker.' }, 403) };
    const name: string = (user.verifiedFilmmakerName || user.name || '').trim();
    if (!normalize(name)) return { error: json({ error: 'No verified filmmaker name on this account.' }, 403) };
    return { db, name, key: normalize(name), accountEmail: user.email as string | undefined };
}

export async function GET(request: Request) {
    try {
        const r = await resolveFilmmaker(request);
        if ('error' in r && r.error) return r.error;
        const { db, key, name, accountEmail } = r as any;
        const doc = await db.collection('payee_profiles').doc(key).get();
        const d = doc.exists ? doc.data() : null;
        return json({ name, pref: d ? { method: d.method || '', handle: d.handle || '', email: d.email || accountEmail || '' } : { method: '', handle: '', email: accountEmail || '' } });
    } catch (e) {
        return json({ error: (e as Error).message }, 500);
    }
}

export async function POST(request: Request) {
    try {
        if (!rateLimit(`payee-pref:${getIP(request)}`, 20, 60 * 60_000)) return json({ error: 'Too many changes. Try again later.' }, 429);
        const r = await resolveFilmmaker(request);
        if ('error' in r && r.error) return r.error;
        const { db, key, name } = r as any;
        const body = await request.json().catch(() => ({}));
        const method = (Object.keys(PAYOUT_METHOD_LABELS) as PayoutMethod[]).includes(body.method) ? body.method : '';
        if (!method) return json({ error: 'Choose how you want to be paid.' }, 400);
        const handle = cleanLine(body.handle, 200);
        const email = cleanLine(body.email, 200);
        if (!handle && method !== 'check') return json({ error: 'Add your username, $cashtag, email or phone for that method.' }, 400);
        if (email && !isValidEmail(email)) return json({ error: 'That email address looks wrong.' }, 400);
        await db.collection('payee_profiles').doc(key).set({
            displayName: name, method, handle, email,
            updatedAt: FieldValue.serverTimestamp(), updatedBy: 'filmmaker',
        }, { merge: true });
        return json({ success: true });
    } catch (e) {
        return json({ error: (e as Error).message }, 500);
    }
}
