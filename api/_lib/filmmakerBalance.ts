import { Firestore } from 'firebase-admin/firestore';
import { Movie } from '../../types.js';
import { getCreditedNames, normalize } from './creditMatch.js';
import { computeShopRevenueByFilmmaker } from './shopRevenue.js';
import { getFestivalConclusionTime } from './festivalTiming.js';

export const SYSTEM_RESET_DATE = '2025-05-24T00:00:00Z';
export const PARTNER_SHARE = 0.70;

export interface SquarePayment {
    amount_money: { amount: number };
    note?: string;
    created_at?: string;
}

export const parseNote = (note: string | undefined): { type: string, title?: string } => {
    if (!note) return { type: 'unknown' };
    const donationMatch = note.match(/Support for film: "(.*)"/);
    if (donationMatch) return { type: 'donation', title: donationMatch[1].trim() };
    const ticketMatch = note.match(/Watch Party Ticket: (.*)/) || note.match(/Live Screening Pass: (.*)/);
    if (ticketMatch) return { type: 'watchPartyTicket', title: ticketMatch[1].trim() };
    // FIX: real Square notes for individual on-demand rentals are "VOD
    // Rental: X" — never recognized here before, so this revenue was
    // silently excluded from every filmmaker's balance. Confirmed live
    // against real payment data (LUNA, Unremarkable, Charlie's Sister,
    // etc. all use this exact format). Gated by festival timing in
    // computeRevenueByFilm below — a festival film's rentals only count
    // once the whole festival has concluded, per an explicit business
    // rule (until then that money is Crate/Playhouse West's).
    const vodMatch = note.match(/VOD Rental: (.*)/);
    if (vodMatch) return { type: 'vodRental', title: vodMatch[1].trim() };
    return { type: 'other' };
};

export function getSquareCredentials(): { accessToken: string | undefined, locationId: string | undefined } {
    const isProduction = process.env.VERCEL_ENV === 'production';
    return {
        accessToken: isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN,
        locationId: isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID,
    };
}

export async function fetchAllRelevantPayments(accessToken: string, locationId: string | undefined): Promise<SquarePayment[]> {
    const squareUrlBase = process.env.VERCEL_ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
    let allPayments: SquarePayment[] = [];
    let cursor: string | undefined = undefined;
    do {
        const url = new URL(`${squareUrlBase}/v2/payments`);
        url.searchParams.append('begin_time', SYSTEM_RESET_DATE);
        if (locationId) url.searchParams.append('location_id', locationId);
        if (cursor) url.searchParams.append('cursor', cursor);
        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Square-Version': '2024-05-15', 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Square Link Fail');
        const data = await res.json();
        if (data.payments) allPayments.push(...data.payments);
        cursor = data.cursor;
    } while (cursor);
    return allPayments;
}

export interface FilmRevenue {
    donations: number;
    tickets: number;
    vodRentals: number;
}

// Shared by computeAllFilmmakerBalances (below) and
// api/get-filmmaker-analytics.ts, so both apply the exact same festival
// timing rule instead of two copies drifting apart. One
// getFestivalConclusionTime call regardless of how many payments/movies —
// callers already have `movies` loaded, so it's passed in rather than
// refetched here.
export async function computeRevenueByFilm(
    db: Firestore,
    allPayments: SquarePayment[],
    movies: Movie[]
): Promise<Record<string, FilmRevenue>> {
    const festivalConclusionTime = await getFestivalConclusionTime(db);
    const movieByTitle = new Map(movies.map(m => [m.title, m]));

    const revenueByFilm: Record<string, FilmRevenue> = {};
    const add = (title: string, field: keyof FilmRevenue, amount: number) => {
        if (!revenueByFilm[title]) revenueByFilm[title] = { donations: 0, tickets: 0, vodRentals: 0 };
        revenueByFilm[title][field] += amount;
    };

    for (const p of allPayments) {
        const details = parseNote(p.note);
        if (!details.title) continue;

        if (details.type === 'donation') {
            add(details.title, 'donations', p.amount_money.amount);
        } else if (details.type === 'watchPartyTicket') {
            add(details.title, 'tickets', p.amount_money.amount);
        } else if (details.type === 'vodRental') {
            const movie = movieByTitle.get(details.title);
            if (movie?.isFestival) {
                // Still an active/unresolved festival film — its individual
                // rentals aren't the filmmaker's yet.
                if (!festivalConclusionTime) continue;
                const paidAtMs = p.created_at ? new Date(p.created_at).getTime() : 0;
                if (paidAtMs < festivalConclusionTime.getTime()) continue;
            }
            add(details.title, 'vodRentals', p.amount_money.amount);
        }
    }

    return revenueByFilm;
}

export interface FilmmakerBalanceSummary {
    directorName: string; // first-seen display casing from movie credits
    totalEarnings: number;
    totalPaidOut: number;
    balance: number;
}

// Computes every credited filmmaker's balance in one pass — one Square
// fetch, one movies read, one completed-payouts read — instead of the
// one-name-at-a-time shape get-filmmaker-analytics.ts uses for a single
// dashboard visit. Used by the payout-threshold notification cron, which
// needs everyone's balance on each run. Deliberately skips the per-film
// enrichment (views/likes/sentiment) that endpoint also computes — too
// expensive to pull for every filmmaker on a timer.
export async function computeAllFilmmakerBalances(db: Firestore): Promise<Map<string, FilmmakerBalanceSummary>> {
    const { accessToken, locationId } = getSquareCredentials();

    const [allPayments, moviesSnapshot, completedPayoutsSnapshot, shopRevenueByName] = await Promise.all([
        accessToken ? fetchAllRelevantPayments(accessToken, locationId) : Promise.resolve([]),
        db.collection('movies').get(),
        db.collection('payout_requests').where('status', '==', 'completed').get(),
        computeShopRevenueByFilmmaker(db, SYSTEM_RESET_DATE).catch(() => new Map()),
    ]);

    const movies: Movie[] = moviesSnapshot.docs.map(d => ({ key: d.id, ...d.data() } as Movie));

    const revenueByFilm = await computeRevenueByFilm(db, allPayments, movies);

    const paidOutByName: Record<string, number> = {};
    completedPayoutsSnapshot.forEach(doc => {
        const key = normalize(doc.data().directorName || '');
        if (!key) return;
        paidOutByName[key] = (paidOutByName[key] || 0) + (doc.data().amount || 0);
    });

    const earningsByName = new Map<string, { directorName: string, totalEarnings: number }>();
    for (const movie of movies) {
        const rev = revenueByFilm[movie.title];
        if (!rev) continue;
        const filmEarnings = Math.round((rev.donations + rev.tickets + rev.vodRentals) * PARTNER_SHARE);
        if (filmEarnings <= 0) continue;
        for (const rawName of getCreditedNames(movie)) {
            const key = normalize(rawName);
            if (!key) continue;
            const existing = earningsByName.get(key);
            if (existing) existing.totalEarnings += filmEarnings;
            else earningsByName.set(key, { directorName: rawName, totalEarnings: filmEarnings });
        }
    }

    for (const [key, { directorName, cents }] of shopRevenueByName) {
        const existing = earningsByName.get(key);
        if (existing) existing.totalEarnings += cents;
        else earningsByName.set(key, { directorName, totalEarnings: cents });
    }

    const balances = new Map<string, FilmmakerBalanceSummary>();
    for (const [key, { directorName, totalEarnings }] of earningsByName) {
        const totalPaidOut = paidOutByName[key] || 0;
        balances.set(key, {
            directorName,
            totalEarnings,
            totalPaidOut,
            balance: Math.max(0, totalEarnings - totalPaidOut),
        });
    }
    return balances;
}
