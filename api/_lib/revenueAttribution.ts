import { Firestore } from 'firebase-admin/firestore';
import { Movie } from '../../types.js';
import { SquarePayment, PARTNER_SHARE, parseNote } from './filmmakerBalance.js';
import { getFestivalConclusionTime } from './festivalTiming.js';

// The full picture of where festival-adjacent money actually goes, for the
// admin "who gets what" dashboard. Mirrors the same categorization used in
// process-festival-payout.ts (passes/blocks -> Playhouse West) and
// filmmakerBalance.ts's computeRevenueByFilm (tips always to the
// filmmaker; individual rentals gated on the whole festival concluding),
// but reports every bucket explicitly instead of silently dropping
// not-yet-qualifying revenue the way the filmmaker balance calc does.
export interface RevenueAttribution {
    festivalConcluded: boolean;
    festivalConclusionTime: string | null;

    // -> Playhouse West (via process-festival-payout.ts)
    passRevenueCents: number;
    passCount: number;
    blockRevenueCents: number;
    blockCount: number;

    // -> Crate (unattributed — the money sits with Crate; nobody's
    // "share" of an individual rental purchased before the festival wraps)
    duringFestivalRentalCents: number;
    duringFestivalRentalCount: number;

    // -> Filmmakers, always (regardless of festival timing)
    tipRevenueCents: number;
    tipCount: number;
    tips: { title: string; filmmakerName: string | null; amountCents: number; date: string }[];

    // -> Filmmakers, only because the festival has concluded (or the film
    // was never/no-longer festival-gated at all)
    postFestivalRentalCents: number;
    postFestivalRentalCount: number;
}

export async function computeRevenueAttribution(db: Firestore, payments: SquarePayment[], movies: Movie[]): Promise<RevenueAttribution> {
    const festivalConclusionTime = await getFestivalConclusionTime(db);
    // Trimmed on both sides of the lookup — parseNote() trims the title it
    // extracts from the payment note, but a movie's own title field can
    // have stray leading/trailing whitespace (confirmed live: "Tino " with
    // a trailing space), which made the lookup silently miss and fall
    // through to the "not a festival film" default — meaning that film's
    // rentals bypassed festival-conclusion timing entirely regardless of
    // its real isFestival status.
    const movieByTitle = new Map(movies.map(m => [(m.title || '').trim(), m]));

    let passRevenueCents = 0, passCount = 0;
    let blockRevenueCents = 0, blockCount = 0;
    let duringFestivalRentalCents = 0, duringFestivalRentalCount = 0;
    let tipRevenueCents = 0, tipCount = 0;
    const tips: { title: string; filmmakerName: string | null; amountCents: number; date: string }[] = [];
    let postFestivalRentalCents = 0, postFestivalRentalCount = 0;

    for (const p of payments) {
        const note = p.note || '';
        const amt = p.amount_money.amount;

        if (/PWFF Full Festival Pass|Platform pass/.test(note)) {
            passRevenueCents += amt; passCount++;
            continue;
        }
        const blockMatch = note.match(/^(?:Unlock Block|Festival Block Ticket): (.*)$/);
        if (blockMatch) {
            // Excludes "Test Block" / "test Block" etc. — staging payments
            // made while setting up a festival, not real ticket sales.
            if (/test\s*block/i.test(blockMatch[1])) continue;
            blockRevenueCents += amt; blockCount++;
            continue;
        }

        const details = parseNote(note);
        if (details.type === 'donation') {
            tipRevenueCents += amt; tipCount++;
            const movie = details.title ? movieByTitle.get(details.title) : undefined;
            tips.push({
                title: details.title || note,
                filmmakerName: movie?.director?.trim() || null,
                amountCents: amt,
                date: p.created_at || '',
            });
        } else if (details.type === 'vodRental' && details.title) {
            const movie = movieByTitle.get(details.title);
            let qualifiesForFilmmaker = true;
            if (movie?.isFestival) {
                if (!festivalConclusionTime) {
                    qualifiesForFilmmaker = false;
                } else {
                    const paidAtMs = p.created_at ? new Date(p.created_at).getTime() : 0;
                    qualifiesForFilmmaker = paidAtMs >= festivalConclusionTime.getTime();
                }
            }
            if (qualifiesForFilmmaker) {
                postFestivalRentalCents += amt; postFestivalRentalCount++;
            } else {
                duringFestivalRentalCents += amt; duringFestivalRentalCount++;
            }
        }
    }

    return {
        festivalConcluded: !!festivalConclusionTime,
        festivalConclusionTime: festivalConclusionTime ? festivalConclusionTime.toISOString() : null,
        passRevenueCents, passCount,
        blockRevenueCents, blockCount,
        duringFestivalRentalCents, duringFestivalRentalCount,
        tipRevenueCents, tipCount,
        tips: tips.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
        postFestivalRentalCents, postFestivalRentalCount,
    };
}

export { PARTNER_SHARE };
