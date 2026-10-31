// api/_lib/rokuWhy.ts
//
// "Why does the Roku treat this film that way?" (Oct 2026)
//   https://cratetv.net/api/roku-feed?why=consumed
// shows, for one film, every setting that makes the Roku lock it, hide it, or
// put it in the Premier Access row. Read-only, and it only repeats what the
// public Roku feed already shows (locked / price / row), plus where the setting
// lives so it can be found and switched off.
import { filmHoldReason, isPastAvailableUntil } from './filmAvailability.js';

export interface WhyInput {
    movie: any;
    festivalDays: any[];
    nowMs: number;
    inPaidKeys: boolean;
    hasVideoAddress: boolean;
    videoMissing: boolean;
    rokuOverrideAddress?: string;
}

export function explainFilm(i: WhyInput) {
    const m = i.movie || {};
    const locks: string[] = [];
    const notes: string[] = [];

    if (m.isForSale === true) locks.push(`The film itself is marked FOR SALE (price ${m.salePrice ?? 'not set'}). Open it in the film editor and switch "for sale" off.`);
    if (m.isWatchPartyPaid === true) locks.push('The film is marked as a PAID WATCH PARTY. Switch that off in the film editor / watch party settings.');

    const blocks: string[] = [];
    for (const day of Array.isArray(i.festivalDays) ? i.festivalDays : []) {
        for (const b of day?.blocks || []) {
            if (Array.isArray(b?.movieKeys) && b.movieKeys.includes(m.key) && b.price !== 0) {
                blocks.push(`day "${day.title || day.id || day.date || '?'}"${day.partnerId ? ` (partner ${day.partnerId})` : ''}, block "${b.title || b.id || '?'}", price ${b.price === undefined ? 'NOT SET (counts as paid)' : b.price}`);
            }
        }
    }
    if (blocks.length) locks.push(`The film is still inside a festival block that is not free: ${blocks.join(' | ')}. Take it out of that block (or set the block price to 0).`);

    const hold = filmHoldReason(m, i.nowMs);
    if (hold === 'party-waiting') locks.push(`A watch party is switched on for this film and has not started yet (start time ${m.watchPartyStartTime || 'not set'}). The Roku keeps the film locked until 15 seconds before the start.`);
    if (hold === 'not-released') locks.push(`The release date is in the future (${m.releaseDateTime}).`);
    if (hold === 'gone' || isPastAvailableUntil(m, i.nowMs)) notes.push(`"Hide automatically after" has passed (${m.availableUntil}), so the Roku hides it.`);

    if (m.isUnlisted) notes.push('"Unlisted" is switched on: the Roku does not list it.');
    if (!m.poster && !m.tvPoster && !m.rokuHeroImage) notes.push('The film has no poster, so the Roku does not list it.');
    if (!i.hasVideoAddress) notes.push('The film has no video address the Roku can play.');
    if (i.videoMissing) notes.push('The video file at the address the Roku would play is not in storage.');
    if (i.rokuOverrideAddress) notes.push(`Roku stream address set in admin: ${i.rokuOverrideAddress}`);

    return {
        film: m.title || m.key || '(not found)',
        key: m.key,
        roku: {
            lockedForEveryone: locks.length > 0,
            inPremierAccessRow: !!(m.isForSale || m.isWatchPartyPaid),
            inAPaidFestivalBlock: i.inPaidKeys,
        },
        whyLocked: locks.length ? locks : ['Nothing locks it: it should be free on the Roku.'],
        otherNotes: notes,
    };
}

/** Finds a film by key or by (part of) its title. */
export function findFilm(movies: Record<string, any>, query: string): any | null {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    if (movies[query]) return movies[query];
    const all = Object.values(movies).filter(Boolean);
    return all.find(m => String(m.key || '').toLowerCase() === q)
        || all.find(m => String(m.title || '').toLowerCase().trim() === q)
        || all.find(m => String(m.title || '').toLowerCase().includes(q))
        || null;
}
