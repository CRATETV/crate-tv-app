// api/_lib/inviteRequest.ts
//
// "Request an invite" (Oct 2026): someone who finds a private screening (or
// Crate itself) and asks to be let in. The request lands in Studio Mail →
// Received so it can be answered with an invite code. Cleaning is pure, tested.
import { cleanLine, cleanText, isValidEmail } from './validation.js';

export interface InviteRequest { name: string; email: string; note: string; movieKey: string; movieTitle: string }

export function cleanInviteRequest(body: any): { ok: true; request: InviteRequest } | { ok: false; error: string; spam?: boolean } {
    if (!body || typeof body !== 'object') return { ok: false, error: 'Please fill in the form.' };
    // A hidden box real people never see; bots fill every box.
    if (typeof body.company_site === 'string' && body.company_site.trim()) return { ok: false, error: 'spam', spam: true };
    const name = cleanLine(body.name, 100);
    const email = cleanLine(body.email, 254).toLowerCase();
    if (!name) return { ok: false, error: 'Please add your name.' };
    if (!isValidEmail(email)) return { ok: false, error: 'Please add a valid email so we can send your invite.' };
    return {
        ok: true,
        request: {
            name, email,
            note: cleanText(body.note, 500),
            movieKey: cleanLine(body.movieKey, 120),
            movieTitle: cleanLine(body.movieTitle, 150),
        },
    };
}
