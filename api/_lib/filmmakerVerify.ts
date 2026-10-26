// api/_lib/filmmakerVerify.ts
//
// Who may open a filmmaker dashboard (earnings, payout method, payout
// requests) for a credited name.
//
// Before Oct 2026, typing any credited director's name on /filmmaker-signup
// was enough: anyone could open "Jane Doe"'s dashboard, set their own PayPal
// as her payout method and request her money. Now a claim is approved
// automatically only when the account's email is one CRATE already has on
// file for that person (an agreement CRATE sent them, their film submission,
// or the payout email entered in admin). Anything else waits for you in
// Admin → Earnings & payouts.
//
// The decision itself is pure (no database) so it's tested:
// tests/filmmakerVerify.test.ts.
import type { Firestore } from 'firebase-admin/firestore';
import { Movie } from '../../types.js';
import { findAllCreditMatches, getCreditedNames, normalize } from './creditMatch.js';

export interface OnFileRecords {
    /** Agreements CRATE sent to this email (contract_requests). */
    agreements: { recipientName?: string; movieKey?: string | null; status?: string }[];
    /** Film submissions made with this email (movie_pipeline). */
    submissions: { director?: string; title?: string; status?: string }[];
    /** Payout email you entered for this name in admin (payee_profiles), if any. */
    payeeEmail?: string | null;
}

const sameText = (a: unknown, b: unknown) => typeof a === 'string' && typeof b === 'string' && normalize(a) !== '' && normalize(a) === normalize(b);
const splitNames = (v: unknown) => String(v || '').split(',').map(s => s.trim()).filter(Boolean);

/**
 * How (if at all) `email` is proven to belong to the credited `name`.
 * Returns a short reason for the record, or null when a person must decide.
 */
export function onFileMatch(name: string, email: string, movies: Movie[], records: OnFileRecords): string | null {
    const target = normalize(name);
    if (!target || !email) return null;
    const creditedFilms = findAllCreditMatches(movies, name);
    const creditedTitles = new Set(creditedFilms.map(m => normalize(m.title || '')).filter(Boolean));

    if (records.payeeEmail && sameText(records.payeeEmail, email)) return 'payout email on file';
    // An agreement YOU sent, addressed to this person by name (not voided).
    for (const a of records.agreements) {
        if (a.status === 'void') continue;
        if (sameText(a.recipientName, name)) return 'agreement sent to this email';
    }
    // Only a submission YOU approved counts: anyone can submit a film and
    // type any director's name (review finding, Oct 2026).
    for (const s of records.submissions) {
        if (s.status !== 'approved' && s.status !== 'catalog') continue;
        if (splitNames(s.director).some(d => normalize(d) === target)) return 'approved film submitted from this email';
        if (s.title && creditedTitles.has(normalize(s.title))) return 'approved film submitted from this email';
    }
    return null;
}

/** Gathers what CRATE has on file for this email, for onFileMatch. */
export async function loadOnFileRecords(db: Firestore, name: string, email: string): Promise<OnFileRecords> {
    const lower = email.trim().toLowerCase();
    const [agreements, subsA, subsB, subsC, payee] = await Promise.all([
        db.collection('contract_requests').where('recipientEmail', '==', lower).limit(50).get().catch(() => null),
        db.collection('movie_pipeline').where('email', '==', email.trim()).limit(50).get().catch(() => null),
        db.collection('movie_pipeline').where('email', '==', lower).limit(50).get().catch(() => null),
        db.collection('movie_pipeline').where('submitterEmail', '==', lower).limit(50).get().catch(() => null),
        db.collection('payee_profiles').doc(normalize(name)).get().catch(() => null),
    ]);
    const submissions = [subsA, subsB, subsC].flatMap(s => s?.docs || []).map(d => ({ director: d.data().director, title: d.data().title, status: d.data().status }));
    return {
        agreements: (agreements?.docs || []).map(d => ({ recipientName: d.data().recipientName, movieKey: d.data().movieKey || null, status: d.data().status })),
        submissions,
        // Only an email YOU entered counts, not one a filmmaker account set itself.
        payeeEmail: payee?.exists && payee.data()?.updatedBy !== 'filmmaker' ? (payee.data()?.email || null) : null,
    };
}

export { getCreditedNames };
