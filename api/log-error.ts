import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, getIP } from './_lib/rateLimit.js';

/**
 * Public error-reporting beacon — called from the browser (no admin auth,
 * since it needs to work for every visitor, not just logged-in ones).
 * Always responds 200/quietly on failure so a broken logger never shows up
 * as a second error on top of the one it's trying to report.
 */
export async function POST(request: Request) {
    try {
        const ip = getIP(request);
        // This endpoint is unauthenticated by nature, so it needs its own
        // ceiling — generous enough for real error bursts, tight enough that
        // it can't be used to spam the error_logs collection.
        if (!rateLimit(`log-error:${ip}`, 20, 60_000)) {
            return new Response(JSON.stringify({ ok: false }), { status: 429 });
        }

        const body = await request.json().catch(() => ({} as any));
        const { message, stack, source, url, context } = body || {};

        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ ok: false }), { status: 400 });
        }

        const initError = getInitializationError();
        const db = !initError ? getAdminDb() : null;
        if (!db) return new Response(JSON.stringify({ ok: false }), { status: 200 });

        await db.collection('error_logs').add({
            source: (typeof source === 'string' ? source : 'client').slice(0, 100),
            origin: 'client',
            message: message.slice(0, 2000),
            stack: typeof stack === 'string' ? stack.slice(0, 4000) : null,
            url: typeof url === 'string' ? url.slice(0, 500) : null,
            context: context && typeof context === 'object' ? context : null,
            userAgent: request.headers.get('user-agent')?.slice(0, 300) || null,
            ipAddress: ip,
            timestamp: FieldValue.serverTimestamp(),
        });

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch {
        // Never let the error-reporting beacon itself surface a loud failure.
        return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }
}
