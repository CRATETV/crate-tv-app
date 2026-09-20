import { createHash, timingSafeEqual } from 'crypto';
import { getAdminDb, getInitializationError } from './firebaseAdmin.js';

// Hash first so the comparison is constant-time regardless of length.
const digest = (value: string) => createHash('sha256').update(value).digest();
const safeEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

/**
 * Checks an admin-panel password against the same sources the panel's login
 * accepts (ADMIN_PASSWORD, ADMIN_MASTER_PASSWORD, ADMIN_PASSWORD_*, and the
 * Firestore collaborator_access keys).
 *
 * Unlike the older copy-pasted checks in other endpoints, this FAILS CLOSED:
 * if no admin password is configured at all, nobody gets in (the older checks
 * treat "nothing configured" as "everyone is admin").
 */
export async function verifyAdminPassword(password: unknown): Promise<boolean> {
    if (typeof password !== 'string' || !password.trim()) return false;

    const expected: (string | undefined)[] = [process.env.ADMIN_PASSWORD, process.env.ADMIN_MASTER_PASSWORD];
    for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith('ADMIN_PASSWORD_')) expected.push(value);
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
            if (!snap.empty) return true;
        }
    }
    return false;
}

/**
 * Stricter than verifyAdminPassword: only the two top-level admin passwords
 * (ADMIN_PASSWORD, ADMIN_MASTER_PASSWORD) — not ADMIN_PASSWORD_* or collaborator keys.
 * For things like legal contracts that even trusted collaborators shouldn't reach.
 * Fails closed if neither is configured.
 */
export function isMasterAdmin(password: unknown): boolean {
    if (typeof password !== 'string' || !password) return false;
    return [process.env.ADMIN_PASSWORD, process.env.ADMIN_MASTER_PASSWORD]
        .some(expected => !!expected && safeEqual(password, expected));
}
