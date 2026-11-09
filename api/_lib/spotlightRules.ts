// Monthly spotlight: when it goes out and when the dashboard should nag.
//
// The email goes out automatically on the FIRST MONDAY of each month, to the
// film chosen in Monthly spotlight. The dashboard used to say "Pick this
// month's spotlight film" for the whole rest of the month once the email had
// gone out, which looked broken. Now it only asks when there is genuinely
// nothing lined up for the next send.

const toDate = (v: any): Date | null => {
    if (v == null) return null;
    if (v instanceof Date) return v;
    if (typeof v.toDate === 'function') return v.toDate();
    const secs = v._seconds ?? v.seconds;
    if (typeof secs === 'number') return new Date(secs * 1000);
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

/** First Monday of the given month (month is 0-11), at local midnight. */
export function firstMonday(year: number, month: number): Date {
    const d = new Date(year, month, 1);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    return d;
}

const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export interface SpotlightDoc { movieKey?: string; setAt?: unknown; sentAt?: unknown }
export type SpotlightState = 'needs-pick' | 'scheduled' | 'sent';

export function spotlightStatus(doc: SpotlightDoc | null | undefined, now: Date): SpotlightState {
    if (!doc?.movieKey) return 'needs-pick';
    const sentAt = toDate(doc.sentAt);
    if (!sentAt) return 'scheduled';                       // picked, not sent yet
    const setAt = toDate(doc.setAt);
    if (setAt && setAt.getTime() > sentAt.getTime()) return 'scheduled'; // picked a new film after the last send
    // The film on file has already been emailed. Quiet for most of the month, then ask for the next one.
    return sameMonth(sentAt, now) && now.getDate() < 22 ? 'sent' : 'needs-pick';
}

/** The next date the automatic email can go out. */
export function nextSendDate(doc: SpotlightDoc | null | undefined, now: Date): Date {
    const sentAt = toDate(doc?.sentAt);
    const thisMonths = firstMonday(now.getFullYear(), now.getMonth());
    const alreadySentThisMonth = !!sentAt && sameMonth(sentAt, now);
    if (!alreadySentThisMonth && thisMonths.getTime() >= startOfDay(now).getTime()) return thisMonths;
    return firstMonday(now.getFullYear(), now.getMonth() + 1);
}
