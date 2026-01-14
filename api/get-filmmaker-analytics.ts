import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FilmmakerAnalytics, FilmmakerFilmPerformance, Movie, User, SentimentPoint } from '../types.js';

const SYSTEM_RESET_DATE = '2025-05-24T00:00:00Z';
const PARTNER_SHARE = 0.70;

interface SquarePayment {
  amount_money: { amount: number };
  note?: string;
}

const parseNote = (note: string | undefined): { type: string, title?: string } => {
    if (!note) return { type: 'unknown' };
    const donationMatch = note.match(/Support for film: "(.*)"/);
    if (donationMatch) return { type: 'donation', title: donationMatch[1].trim() };
    const ticketMatch = note.match(/Watch Party Ticket: (.*)/) || note.match(/Live Screening Pass: (.*)/);
    if (ticketMatch) return { type: 'watchPartyTicket', title: ticketMatch[1].trim() };
    return { type: 'other' };
};

async function fetchAllRelevantPayments(accessToken: string, locationId: string | undefined): Promise<SquarePayment[]> {
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

export async function POST(request: Request) {
    try {
        const { directorName } = await request.json();
        if (!directorName) return new Response(JSON.stringify({ error: 'Name required' }), { status: 400 });
        
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB fail");

        const isProduction = process.env.VERCEL_ENV === 'production';
        const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
        const locationId = isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID;

        const [allPayments, moviesSnapshot, viewsSnapshot, usersSnapshot, payoutHistorySnapshot] = await Promise.all([
            accessToken ? fetchAllRelevantPayments(accessToken, locationId) : Promise.resolve([]),
            db.collection('movies').get(),
            db.collection('view_counts').get(),
            db.collection('users').get(),
            db.collection('payout_requests').where('directorName', '==', directorName.trim()).where('status', '==', 'completed').get()
        ]);

        const allMovies: Record<string, Movie> = {};
        moviesSnapshot.forEach(doc => { allMovies[doc.id] = { key: doc.id, ...doc.data() } as Movie; });

        const viewCounts: Record<string, number> = {};
        viewsSnapshot.forEach(doc => { viewCounts[doc.id] = Number(doc.data().count) || 0; });

        const watchlistCounts: Record<string, number> = {};
        usersSnapshot.forEach(doc => {
            const u = doc.data() as User;
            if (u.watchlist) u.watchlist.forEach(k => watchlistCounts[k] = (watchlistCounts[k] || 0) + 1);
        });

        const normalizedTarget = directorName.trim().toLowerCase();
        const filmmakerFilms = Object.values(allMovies).filter(movie => {
            const directors = (movie.director || '').toLowerCase().split(',').map(d => d.trim());
            const producers = (movie.producers || '').toLowerCase().split(',').map(p => p.trim());
            return directors.includes(normalizedTarget) || producers.includes(normalizedTarget);
        });

        const revenueByFilm: Record<string, { donations: number, tickets: number }> = {};
        allPayments.forEach(p => {
            const details = parseNote(p.note);
            if (details.title) {
                if (!revenueByFilm[details.title]) revenueByFilm[details.title] = { donations: 0, tickets: 0 };
                if (details.type === 'donation') revenueByFilm[details.title].donations += p.amount_money.amount;
                if (details.type === 'watchPartyTicket') revenueByFilm[details.title].tickets += p.amount_money.amount;
            }
        });

        const filmPerformances: FilmmakerFilmPerformance[] = await Promise.all(filmmakerFilms.map(async film => {
            const rev = revenueByFilm[film.title] || { donations: 0, tickets: 0 };
            const sentimentSnap = await db.collection('movies').doc(film.key).collection('sentiment').orderBy('timestamp', 'asc').get();
            const sentimentData: SentimentPoint[] = sentimentSnap.docs.map(d => d.data() as SentimentPoint);

            return {
                key: film.key,
                title: film.title,
                views: viewCounts[film.key] || 0,
                likes: film.likes || 0,
                watchlistAdds: watchlistCounts[film.key] || 0,
                grossDonations: rev.donations,
                grossAdRevenue: rev.tickets, // Displaying tickets in the "Ad Revenue" slot for filmmaker view
                netDonationEarnings: Math.round(rev.donations * PARTNER_SHARE),
                netAdEarnings: Math.round(rev.tickets * PARTNER_SHARE),
                totalEarnings: Math.round((rev.donations + rev.tickets) * PARTNER_SHARE),
                sentimentData
            };
        }));

        const totalPaidOut = payoutHistorySnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        const totalEarnings = filmPerformances.reduce((sum, f) => sum + f.totalEarnings, 0);

        const analytics: FilmmakerAnalytics = {
            totalDonations: filmPerformances.reduce((s, f) => s + f.netDonationEarnings, 0),
            totalAdRevenue: filmPerformances.reduce((s, f) => s + f.netAdEarnings, 0),
            totalPaidOut,
            balance: Math.max(0, totalEarnings - totalPaidOut),
            films: filmPerformances.sort((a,b) => b.views - a.views),
        };

        return new Response(JSON.stringify({ analytics }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}