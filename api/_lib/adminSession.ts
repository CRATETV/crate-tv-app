// api/_lib/adminSession.ts
//
// SIGNED ADMIN SESSIONS
//
// Before: the admin panel kept your actual admin password in the browser
// (sessionStorage) and sent it with every single request. Anyone who got a
// look at that browser tab's storage — a shared computer, a malicious
// extension, a screenshot of devtools — had the master password forever.
//
// Now: /api/admin-login checks the password (or a staff member's Crate
// account) ONCE and hands back a signed session pass:
//
//     cs1.<payload>.<signature>
//
// The pass says who you are and when it expires (12 hours). It's signed
// with a server-only secret, so it can't be forged or edited. The browser
// keeps the pass, never the password.
//
// Every admin endpoint runs the incoming key through resolveAdminCredential()
// before its existing checks. A valid pass is turned back into the
// credential for that role *on the server*, so each endpoint grants exactly
// the same access it always did — nothing about who-can-do-what changed.
//
// Revocation: staff passes point at their collaborator_access record. Delete
// or revoke that record in Permissions and their pass stops working on the
// next request, even before it expires.

import { createHmac, createHash, timingSafeEqual } from 'crypto';
import { getAdminDb } from './firebaseAdmin.js';

const PREFIX = 'cs1';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface AdminSessionPayload {
    sub: string;        // 'env:super_admin' | 'env:master' | 'env:festival_admin' | 'collab:<docId>' | 'pay:<docId>'
    role: string;       // role string the admin panel uses for permissions
    name: string;       // who signed in (shown in the audit log)
    via: 'password' | 'account';
    iat: number;
    exp: number;
}

// Use a dedicated secret if you set one (recommended: Vercel env var
// ADMIN_SESSION_SECRET, any long random string). Otherwise derive one from
// the Firebase service-account key, which is already a server-only secret —
// so this works the moment it's deployed, with no new setup.
const getSecret = (): Buffer => {
    const explicit = process.env.ADMIN_SESSION_SECRET;
    const base = explicit && explicit.length >= 16
        ? explicit
        : `crate-admin-session:${process.env.FIREBASE_SERVICE_ACCOUNT_KEY || ''}`;
    if (!explicit && !process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        throw new Error('No secret available to sign admin sessions.');
    }
    return createHash('sha256').update(base).digest();
};

const b64url = (buf: Buffer) => buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export function signAdminSession(p: Omit<AdminSessionPayload, 'iat' | 'exp'>): string {
    const now = Date.now();
    const payload: AdminSessionPayload = { ...p, iat: now, exp: now + SESSION_TTL_MS };
    const body = b64url(Buffer.from(JSON.stringify(payload)));
    const sig = b64url(createHmac('sha256', getSecret()).update(`${PREFIX}.${body}`).digest());
    return `${PREFIX}.${body}.${sig}`;
}

export function verifyAdminSession(token: unknown): AdminSessionPayload | null {
    if (typeof token !== 'string' || !token.startsWith(`${PREFIX}.`)) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
        const expected = createHmac('sha256', getSecret()).update(`${parts[0]}.${parts[1]}`).digest();
        const given = fromB64url(parts[2]);
        if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
        const payload = JSON.parse(fromB64url(parts[1]).toString('utf8')) as AdminSessionPayload;
        if (!payload?.sub || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
}

export const isSessionToken = (v: unknown): boolean => typeof v === 'string' && v.startsWith(`${PREFIX}.`);

/**
 * Turn whatever the client sent as its admin key into the credential the
 * endpoint's existing checks expect.
 *   • valid session pass  → that role's real credential (server-side only)
 *   • expired/forged pass → '' (fails every check)
 *   • anything else       → returned unchanged (legacy raw keys still work
 *                           during the switch-over)
 */
export async function resolveAdminCredential(value: unknown): Promise<string> {
    if (typeof value !== 'string') return '';
    if (!isSessionToken(value)) return value;

    const session = verifyAdminSession(value);
    if (!session) return '';

    const [kind, id] = [session.sub.slice(0, session.sub.indexOf(':')), session.sub.slice(session.sub.indexOf(':') + 1)];
    if (kind === 'env') {
        if (id === 'super_admin') return process.env.ADMIN_PASSWORD || '';
        if (id === 'master') return process.env.ADMIN_MASTER_PASSWORD || '';
        if (id === 'festival_admin') return process.env.FESTIVAL_ADMIN_PASSWORD || '';
        return '';
    }

    const db = getAdminDb();
    if (!db || !id) return '';
    try {
        if (kind === 'collab') {
            const doc = await db.collection('collaborator_access').doc(id).get();
            const data = doc.data();
            if (!doc.exists || !data || data.status === 'revoked') return '';
            return String(data.accessKey || '');
        }
        if (kind === 'pay') {
            const doc = await db.collection('director_payout_keys').doc(id).get();
            return doc.exists ? String(doc.data()?.accessKey || '') : '';
        }
    } catch {
        return '';
    }
    return '';
}
