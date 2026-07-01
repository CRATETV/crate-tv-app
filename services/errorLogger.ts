/**
 * Lightweight client-side error reporting.
 *
 * Sends errors to /api/log-error (which writes to the `error_logs` Firestore
 * collection, visible in Admin Panel → Error Log). Designed to be completely
 * safe to call from anywhere:
 *   - never throws
 *   - never blocks the UI (fire-and-forget fetch)
 *   - self-throttles per page session so a runaway error loop can't flood
 *     the network tab or the log collection
 */

const MAX_REPORTS_PER_SESSION = 20;
let reportCount = 0;
const recentMessages = new Set<string>();

export function reportClientError(source: string, error: unknown, context?: Record<string, any>): void {
    try {
        if (reportCount >= MAX_REPORTS_PER_SESSION) return;

        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;

        // De-dupe identical message+source within a session — a single bad
        // render loop shouldn't burn through the whole report budget on one bug.
        const dedupeKey = `${source}:${message}`;
        if (recentMessages.has(dedupeKey)) return;
        recentMessages.add(dedupeKey);
        reportCount++;

        const payload = JSON.stringify({
            source,
            message,
            stack,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
            context,
        });

        // sendBeacon survives page navigation/unload; fall back to fetch.
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            const sent = navigator.sendBeacon('/api/log-error', blob);
            if (sent) return;
        }

        fetch('/api/log-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
        }).catch(() => {});
    } catch {
        // Reporting must never itself throw.
    }
}

let globalHandlersInstalled = false;

/** Call once at app startup to catch errors React's error boundary can't see
 *  (async code, event handlers, promise rejections, resource load failures). */
export function installGlobalErrorLogging(): void {
    if (globalHandlersInstalled || typeof window === 'undefined') return;
    globalHandlersInstalled = true;

    window.addEventListener('error', (event) => {
        reportClientError('window.onerror', event.error || event.message || 'Unknown error', {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        reportClientError('unhandledrejection', event.reason || 'Unhandled promise rejection');
    });
}
