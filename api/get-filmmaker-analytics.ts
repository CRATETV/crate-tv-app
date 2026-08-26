import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { FilmmakerAnalytics, FilmmakerFilmPerformance, Movie, User, SentimentPoint } from '../types.js';
import { PARTNER_SHARE, parseNote, fetchAllRelevantPayments, getSquareCredentials } from './_lib/filmmakerBalance.js';
import { findAllCreditMatches } from './_lib/creditMatch.js';

export async function POST(request: Request) {
    try {
        const { directorName, idToken } = await request.json();
        if (!directorName) return new Response(JSON.stringify({ error: 'Name required' }), { status: 400 });

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB fail");

        // This previously accepted directorName with no authentication at
        // all — meaning anyone (no login required) could POST any name and
        // pull that filmmaker's full private earnings, donation totals, and
        // payout balance, just from a name that's publicly visible on every
        // movie page ("Directed by X"). Requiring a verified session at
        // least closes the "anyone on the internet, zero login" version of
        // this hole. It doesn't yet stop one signed-in filmmaker from
        // looking up another's numbers by name — films aren't tagged with
        // an owning account, only a free-text director/producer credit, so
        // there's currently no clean way to restrict this to "your own
        // films only" without a larger data-model change.
        const auth = getAdminAuth();
        if (!idToken || !auth) {
            return new Response(JSON.stringify({ error: 'Sign in required.' }), { status: 401 });
        }
        try {
            await auth.verifyIdToken(idToken);
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid or expired session.' }), { status: 401 });
        }

        const { accessToken, locationId } = getSquareCredentials();

        const [allPayments, moviesSnapshot, viewsSnapshot, usersSnapshot, payoutHistorySnapshot, rokuEventsSnapshot] = await Promise.all([
            accessToken ? fetchAllRelevantPayments(accessToken, locationId) : Promise.resolve([]),
            db.collection('movies').get(),
            db.collection('view_counts').get(),
            db.collection('users').get(),
            db.collection('payout_requests').where('directorName', '==', directorName.trim()).where('status', '==', 'completed').get(),
            db.collection('traffic_events').where('platform', '==', 'ROKU').get()
        ]);

        const allMovies: Record<string, Movie> = {};
        moviesSnapshot.forEach(doc => { allMovies[doc.id] = { key: doc.id, ...doc.data() } as Movie; });

        const viewCounts: Record<string, number> = {};
        viewsSnapshot.forEach(doc => { viewCounts[doc.id] = Number(doc.data().count) || 0; });

        const rokuViewsByMovie: Record<string, number> = {};
        rokuEventsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.movieKey) rokuViewsByMovie[data.movieKey] = (rokuViewsByMovie[data.movieKey] || 0) + 1;
        });

        const watchlistCounts: Record<string, number> = {};
        usersSnapshot.forEach(doc => {
            const u = doc.data() as User;
            if (u.watchlist) u.watchlist.forEach(k => watchlistCounts[k] = (watchlistCounts[k] || 0) + 1);
        });

        const filmmakerFilms = findAllCreditMatches(Object.values(allMovies), directorName);

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
                rokuViews: rokuViewsByMovie[film.key] || 0,
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