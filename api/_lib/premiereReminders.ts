// api/_lib/premiereReminders.ts — "Premiere tomorrow" and "starts in 15 minutes" emails (Oct 29 2026).
//
// The minute-by-minute watch party cron asks dueReminders() what is due for
// each premiere. Each reminder goes out ONCE (a flag is saved before sending),
// only inside a short window, so a premiere scheduled an hour out never gets a
// "tomorrow" email, and a skipped cron tick is caught up a few minutes late.
//
// Who gets them: ticket holders, pass holders, and signed-in viewers who
// tapped "Remind me". The tap-to-remind people get a one-click "stop" link in
// the email (reminderToken / verifyReminderToken).
//
// Tested: tests/premiereReminders.test.ts.
import { createHmac, timingSafeEqual } from 'node:crypto';

export type ReminderStage = 'day' | 'soon';

export interface StageRule { id: ReminderStage; beforeMs: number; graceMs: number }

export const STAGES: StageRule[] = [
    { id: 'day',  beforeMs: 24 * 60 * 60_000, graceMs: 90 * 60_000 },   // about a day before; caught up for up to 90 minutes
    { id: 'soon', beforeMs: 15 * 60_000,      graceMs: 10 * 60_000 },   // 15 minutes before; caught up for up to 10 minutes
];

/** Which reminders are due right now? `sent` is the saved record, e.g. { day: true }. */
export function dueReminders(
    startMs: number,
    nowMs: number,
    sent: Record<string, unknown> | null | undefined,
    stages: StageRule[] = STAGES,
): ReminderStage[] {
    if (!Number.isFinite(startMs) || !Number.isFinite(nowMs)) return [];
    if (nowMs >= startMs) return [];                       // already started
    return stages
        .filter(s => !sent?.[s.id] && nowMs >= startMs - s.beforeMs && nowMs < startMs - s.beforeMs + s.graceMs)
        .map(s => s.id);
}

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

/** One list of lowercase, valid, unique addresses from any number of lists. */
export function mergeRecipients(...lists: Array<Iterable<unknown> | null | undefined>): string[] {
    const out = new Set<string>();
    for (const list of lists) {
        if (!list) continue;
        for (const e of list) {
            if (typeof e !== 'string') continue;
            const v = e.trim().toLowerCase();
            if (v.length <= 254 && EMAIL_RE.test(v)) out.add(v);
        }
    }
    return Array.from(out);
}

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const sign = (secret: string, payload: string) => createHmac('sha256', secret).update(payload).digest('base64url');

/** A link token that can only be made by the server: says "this account stops reminders for this film". */
export function reminderToken(secret: string, movieKey: string, uid: string): string {
    const payload = b64(JSON.stringify({ k: movieKey, u: uid }));
    return `${payload}.${sign(secret, payload)}`;
}

export function verifyReminderToken(secret: string, token: unknown): { movieKey: string; uid: string } | null {
    if (!secret || typeof token !== 'string') return null;
    const [payload, sig, extra] = token.split('.');
    if (!payload || !sig || extra !== undefined) return null;
    const want = Buffer.from(sign(secret, payload));
    const got = Buffer.from(sig);
    if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
    try {
        const { k, u } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        return typeof k === 'string' && typeof u === 'string' && k && u ? { movieKey: k, uid: u } : null;
    } catch { return null; }
}

/** The words for each reminder. `when` is already formatted in New York time. */
export function reminderWords(stage: ReminderStage, title: string, when: string) {
    return stage === 'day'
        ? { kicker: 'Tomorrow', subject: `Tomorrow: ${title} — Crate TV Watch Party`, line: `${title} starts tomorrow, ${when}.`, tip: 'Add it to your calendar. When the countdown hits zero the film starts for everyone, so you will not miss the beginning if you are signed in a few minutes early.' }
        : { kicker: 'Starts In 15 Minutes', subject: `Starting in 15 minutes: ${title} — Crate TV Watch Party`, line: `${title} starts at ${when}.`, tip: 'Open the link now, sign in, and wait in the lobby. Joining early gives you the smoothest start.' };
}
