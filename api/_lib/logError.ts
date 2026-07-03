import { getAdminDb } from './firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Fire-and-forget server-side error logger for API routes.
 *
 * Call this from inside an existing `catch` block, alongside (not instead of)
 * your current console.error/error response — it never throws, so it can't
 * turn a handled error into an unhandled one. If Firestore Admin isn't
 * configured or the write fails, this silently no-ops.
 *
 * Usage:
 *   } catch (error) {
 *       logServerError('api/terminate-watch-party', error, { movieKey });
 *       return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
 *   }
 */
export async function logServerError(source: string, error: unknown, context?: Record<string, any>): Promise<void> {
    try {
        const db = getAdminDb();
        if (!db) return;

        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;

        await db.collection('error_logs').add({
            source: source.slice(0, 100),
            origin: 'server',
            message: (message || 'Unknown error').slice(0, 2000),
            stack: stack ? stack.slice(0, 4000) : null,
            context: context || null,
            timestamp: FieldValue.serverTimestamp(),
        });
    } catch {
        // Logging must never break the caller — swallow any failure here.
    }
}
