// api/_lib/mailSchedule.ts
//
// "Send later" for Studio Mail. A timed email is saved in the Sent folder with
// status "scheduled"; a job every 5 minutes sends the ones whose time has come.

const MAX_DAYS_AHEAD = 60;

/** Checks the time picked for a timed email: a real time, in the future, not absurdly far off. */
export function checkSendTime(value: unknown, nowMs: number): { ok: true; ms: number } | { ok: false; error: string } {
    const ms = new Date(String(value || '')).getTime();
    if (!Number.isFinite(ms)) return { ok: false, error: 'Pick a date and time for the email.' };
    if (ms < nowMs + 60_000) return { ok: false, error: 'That time has already passed. Pick a time in the future.' };
    if (ms > nowMs + MAX_DAYS_AHEAD * 86_400_000) return { ok: false, error: `Pick a time within the next ${MAX_DAYS_AHEAD} days.` };
    return { ok: true, ms };
}

/** The saved record for a timed email (shows in Sent with a "Scheduled" badge). */
export function buildScheduledRecord(a: {
    fromEmail: string; to: string; subject: string; htmlBody: string; text: string; signatureId: string;
    movieTitle?: string; posterUrl?: string; synopsis?: string; movieKey?: string; sendAtMs: number; nowIso: string;
}) {
    return {
        direction: 'out' as const,
        status: 'scheduled' as const,
        scheduledFor: new Date(a.sendAtMs).toISOString(),
        resendId: '',
        fromEmail: a.fromEmail,
        to: [a.to],
        subject: a.subject,
        text: a.text.slice(0, 60_000),
        htmlBody: a.htmlBody.slice(0, 200_000),
        signatureId: a.signatureId,
        movieTitle: a.movieTitle || '',
        posterUrl: a.posterUrl || '',
        synopsis: a.synopsis || '',
        movieKey: a.movieKey || '',
        attachments: [] as { filename: string; size: number }[],
        sentBy: '',
        createdAt: a.nowIso,
        read: true,
    };
}

/** Which saved timed emails are due: scheduled, and their time has come. Oldest first. */
export function dueScheduled<T extends { status?: string; scheduledFor?: string }>(docs: T[], nowMs: number): T[] {
    return docs
        .filter(d => d.status === 'scheduled' && new Date(d.scheduledFor || '').getTime() <= nowMs)
        .sort((x, y) => new Date(x.scheduledFor!).getTime() - new Date(y.scheduledFor!).getTime());
}

/**
 * The time for "tomorrow morning" in the person's own time zone. `hour` is local (e.g. 9 = 9:00 AM).
 * Runs in the browser, so `now` already uses the person's own clock and time zone.
 */
export function tomorrowAt(now: Date, hour: number): Date {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, 0, 0, 0);
    return d;
}
