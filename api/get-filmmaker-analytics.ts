import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { FilmmakerAnalytics, FilmmakerFilmPerformance, Movie, User, SentimentPoint } from '../types.js';
import { PARTNER_SHARE, fetchAllRelevantPayments, getSquareCredentials, SYSTEM_RESET_DATE, computeRevenueByFilm } from './_lib/filmmakerBalance.js';
import { findAllCreditMatches, normalize } from './_lib/creditMatch.js';
import { computeShopRevenueByFilmmaker } from './_lib/shopRevenue.js';

export async function POST(request: Request) {
    try {
        const { idToken } = await request.json();

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB fail");

        // This endpoint used to trust a client-supplied `directorName` for
        // BOTH identity and authorization — any signed-in account (even a
        // plain viewer, never verified as any filmmaker) could POST any name
        // and pull that person's full private earnings/balance, since the
        // only check was "is this a valid session," not "does this session
        // belong to this filmmaker." The name itself is never secret — it's
        // printed on every movie page as "Directed by X."
        //
        // Fixed by deriving the director name server-side from the caller's
        // own verified identity instead of trusting anything the client
        // sends. `verifiedFilmmakerName` is written once by
        // filmmaker-signup.ts at the moment a name is confirmed against a
        // real film credit, and is deliberately a SEPARATE field from the
        // general-purpose `name` (which AuthContext.updateName lets any user
        // freely change) — otherwise a verified filmmaker could rename their
        // own account to another filmmaker's credited name post-verification
        // and this endpoint would happily hand over that person's numbers.
        const auth = getAdminAuth();
        if (!idToken || !auth) {
            return new Response(JSON.stringify({ error: 'Sign in required.' }), { status: 401 });
        }
        let uid: string;
        try {
            const decoded = await auth.verifyIdToken(idToken);
            uid = decoded.uid;
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid or expired session.' }), { status: 401 });
        }

        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        if (!userData?.isFilmmaker) {
            return new Response(JSON.stringify({ error: 'This account is not a verified filmmaker.' }), { status: 403 });
        }

        // Self-heal accounts verified before this field existed: their
        // current `name` at the time of first read after this fix ships is
        // exactly what filmmaker-signup.ts would have written, since nothing
        // had a chance to rename it away from the verified value yet.
        let directorName: string | undefined = userData.verifiedFilmmakerName;
        if (!directorName && userData.name) {
            directorName = userData.name;
            await db.collection('users').doc(uid).set({ verifiedFilmmakerName: directorName }, { merge: true });
        }
        if (!directorName) {
            return new Response(JSON.stringify({ error: 'No verified filmmaker name on this account.' }), { status: 403 });
        }

        const { accessToken, locationId } = getSquareCredentials();

        const [allPayments, moviesSnapshot, viewsSnapshot, usersSnapshot, payoutHistorySnapshot, rokuEventsSnapshot, shopRevenueByName] = await Promise.all([
            accessToken ? fetchAllRelevantPayments(accessToken, locationId) : Promise.resolve([]),
            db.collection('movies').get(),
            db.collection('view_counts').get(),
            db.collection('users').get(),
            db.collection('payout_requests').where('directorName', '==', directorName.trim()).where('status', '==', 'completed').get(),
            db.collection('traffic_events').where('platform', '==', 'ROKU').get(),
            computeShopRevenueByFilmmaker(db, SYSTEM_RESET_DATE).catch(() => new Map()),
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

        const revenueByFilm = await computeRevenueByFilm(db, allPayments, Object.values(allMovies));

        const filmPerformances: FilmmakerFilmPerformance[] = await Promise.all(filmmakerFilms.map(async film => {
            const rev = revenueByFilm[film.title] || { donations: 0, tickets: 0, vodRentals: 0 };
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
                grossRentalRevenue: rev.vodRentals,
                netDonationEarnings: Math.round(rev.donations * PARTNER_SHARE),
                netAdEarnings: Math.round(rev.tickets * PARTNER_SHARE),
                netRentalEarnings: Math.round(rev.vodRentals * PARTNER_SHARE),
                totalEarnings: Math.round((rev.donations + rev.tickets + rev.vodRentals) * PARTNER_SHARE),
                sentimentData
            };
        }));

        const totalPaidOut = payoutHistorySnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        const totalShopRevenue = shopRevenueByName.get(normalize(directorName))?.cents || 0;
        const totalEarnings = filmPerformances.reduce((sum, f) => sum + f.totalEarnings, 0) + totalShopRevenue;

        const analytics: FilmmakerAnalytics = {
            totalDonations: filmPerformances.reduce((s, f) => s + f.netDonationEarnings, 0),
            totalAdRevenue: filmPerformances.reduce((s, f) => s + f.netAdEarnings, 0),
            totalRentalRevenue: filmPerformances.reduce((s, f) => s + f.netRentalEarnings, 0),
            totalShopRevenue,
            totalPaidOut,
            balance: Math.max(0, totalEarnings - totalPaidOut),
            films: filmPerformances.sort((a,b) => b.views - a.views),
        };

        return new Response(JSON.stringify({ analytics }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}