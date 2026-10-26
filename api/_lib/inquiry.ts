// api/_lib/inquiry.ts
//
// The two "come to us" forms (Oct 2026):
//   /host      — a festival asks about hosting its festival on CRATE
//   /premiere  — a filmmaker asks about a premiere night on CRATE
// People find these pages themselves (search, footer, FilmFreeway), so CRATE
// doesn't have to cold-email anyone. api/send-inquiry.ts emails each request
// to the studio inbox and keeps a copy in the database.
//
// Cleaning is pure so it's tested: tests/inquiry.test.ts.
import { cleanLine, cleanText, isValidEmail, safeHttpUrl } from './validation.js';

export type InquiryKind = 'festival' | 'premiere';

export interface Inquiry {
    kind: InquiryKind;
    name: string;
    email: string;
    message: string;
    /** Form-specific answers, label → answer, in display order. */
    details: [string, string][];
    link: string;
}

const TICKETING: Record<string, string> = {
    paid: 'Paid tickets',
    pwyw: 'Pay what you want',
    free: 'Free',
    unsure: 'Not sure yet',
};

export function cleanInquiry(body: any): { ok: true; inquiry: Inquiry } | { ok: false; error: string; spam?: boolean } {
    if (!body || typeof body !== 'object') return { ok: false, error: 'Please fill in the form.' };
    // Hidden field real people never see. Bots fill every box.
    if (typeof body.company_site === 'string' && body.company_site.trim()) return { ok: false, error: 'spam', spam: true };

    const kind: InquiryKind | null = body.kind === 'festival' || body.kind === 'premiere' ? body.kind : null;
    if (!kind) return { ok: false, error: 'Unknown form.' };

    const name = cleanLine(body.name, 100);
    const email = cleanLine(body.email, 254).toLowerCase();
    const message = cleanText(body.message, 3000);
    if (!name) return { ok: false, error: 'Please add your name.' };
    if (!isValidEmail(email)) return { ok: false, error: 'Please add a valid email so we can reply.' };

    const rawLink = typeof body.link === 'string' ? body.link.trim() : '';
    const link = rawLink ? safeHttpUrl(rawLink, { assumeHttps: true, maxLength: 300 }) : '';
    if (rawLink && !link) return { ok: false, error: 'That link doesn\'t look right. Paste the full web address.' };

    const details: [string, string][] = [];
    const add = (label: string, value: string) => { if (value) details.push([label, value]); };

    if (kind === 'festival') {
        const festivalName = cleanLine(body.festivalName, 150);
        if (!festivalName) return { ok: false, error: 'Please add your festival\'s name.' };
        add('Festival', festivalName);
        add('Dates', cleanLine(body.dates, 150));
        add('Number of films', cleanLine(body.filmCount, 40));
        add('Location / audience', cleanLine(body.location, 150));
    } else {
        const filmTitle = cleanLine(body.filmTitle, 150);
        if (!filmTitle) return { ok: false, error: 'Please add your film\'s title.' };
        add('Film', filmTitle);
        add('Runtime', cleanLine(body.runtime, 40));
        add('Preferred date', cleanLine(body.preferredDate, 100));
        add('Tickets', TICKETING[String(body.ticketing)] || '');
    }

    return { ok: true, inquiry: { kind, name, email, message, details, link } };
}
