// api/_lib/adminAuth.ts
//
// Shared "is this a valid admin key?" checks. Merges two versions:
//   • verifyAdminPassword / isMasterAdmin — from the Sept 20 hardening pass
//     (constant-time comparison, fails closed).
//   • isValidAdminKey — used by the Submissions/actor endpoints.
//
// All three now accept the signed 12-hour session pass the admin panel holds
// after sign-in (see adminSession.ts), as well as raw keys. A pass is turned
// back into its role's real credential on the server, so every check grants
// exactly the same access it did before.
import { createHash, timingSafeEqual } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { getAdminDb, getInitializationError } from './firebaseAdmin.js';
import { resolveAdminCredential } from './adminSession.js';

// Hash first so the comparison is constant-time regardless of length.
const digest = (value: string) => createHash('sha256').update(value).digest();
const safeEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

/**
 * Checks an admin key against ADMIN_PASSWORD, ADMIN_MASTER_PASSWORD,
 * ADMIN_PASSWORD_*, and the Firestore collaborator_access keys.
 * FAILS CLOSED: if no admin password is configured, nobody gets in.
 */
export async function verifyAdminPassword(value: unknown): Promise<boolean> {
    const password = await resolveAdminCredential(value);
    if (!password.trim()) return false;

    const expected: (string | undefined)[] = [process.env.ADMIN_PASSWORD, process.env.ADMIN_MASTER_PASSWORD];
    for (const [key, v] of Object.entries(process.env)) {
        if (key.startsWith('ADMIN_PASSWORD_')) expected.push(v);
    }
    for (const candidate of expected) {
        if (candidate && safeEqual(password, candidate)) return true;
    }

    if (!getInitializationError()) {
        const db = getAdminDb();
        if (db) {
            const snap = await db.collection('collaborator_access')
                .where('accessKey', '==', password.trim())
                .limit(1)
                .get();
            if (!snap.empty && snap.docs[0].data().status !== 'revoked') return true;
        }
    }
    return false;
}

/**
 * Stricter: only the two top-level admin passwords (not ADMIN_PASSWORD_* or
 * collaborator keys). For things like legal contracts. Fails closed.
 * (Now async, so it can accept the signed session pass.)
 */
export async function isMasterAdmin(value: unknown): Promise<boolean> {
    const password = await resolveAdminCredential(value);
    if (!password) return false;
    return [process.env.ADMIN_PASSWORD, process.env.ADMIN_MASTER_PASSWORD]
        .some(expected => !!expected && safeEqual(password, expected));
}

/**
 * Same as verifyAdminPassword, plus the festival-admin key. Used by the
 * Submissions tab's actor-profile endpoints.
 */
export async function isValidAdminKey(value: unknown, _db?: Firestore | null): Promise<boolean> {
    if (await verifyAdminPassword(value)) return true;
    const password = await resolveAdminCredential(value);
    const festival = process.env.FESTIVAL_ADMIN_PASSWORD;
    return !!password && !!festival && safeEqual(password, festival);
}
