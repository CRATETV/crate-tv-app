import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FilmmakerAnalytics, FilmmakerFilmPerformance, Movie, PayoutRequest, User, SentimentPoint } from '../types.js';

const AD_CPM_IN_CENTS = 500;
const AD_REVENUE_FILMMAKER_SHARE = 0.50;
const DONATION_PLATFORM_CUT = 0.30;

export async function POST(request: Request) {
    try {
        const { directorName, password } = await request.json();

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        let isAuthenticated = !!password && (password === primaryAdminPassword || password === masterPassword);
        
        if (!directorName) return new Response(JSON.stringify({ error: 'Name required' }), { status: 400 });
        
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB fail");

        const donationsSnapshot = await db.collection('donations').where('directorName', '==', directorName).get();
        const moviesSnapshot = await db.collection('movies').get();
        const viewsSnapshot = await db.collection('view_counts').get();
        const payoutsSnapshot = await db.collection('payout_requests').where('directorName', '==', directorName).where('status', '==', 'completed').get();
        const usersSnapshot = await db.collection('users').get();
        
        const allMovies: Record<string, Movie> = {};
        moviesSnapshot.forEach(doc => {
            allMovies[doc.id] = { key: doc.id, ...doc.data() } as Movie;
        });

        const viewCounts: Record<string, number> = {};
        viewsSnapshot.forEach(doc => { viewCounts[doc.id] = doc.data().count || 0; });

        const watchlistCounts: Record<string, number> = {};
        usersSnapshot.forEach(doc => {
            const user = doc.data() as User;
            if (user.watchlist) user.watchlist.forEach(k => watchlistCounts[k] = (watchlistCounts[k] || 0) + 1);
        });

        const filmmakerFilms = Object.values(allMovies).filter(movie => {
            const normalized = directorName.trim().toLowerCase();
            return (movie.director || '').toLowerCase().includes(normalized) || (movie.producers || '').toLowerCase().includes(normalized);
        });

        const donationsByFilm: Record<string, number> = {};
        donationsSnapshot.forEach(doc => {
            const donation = doc.data();
            donationsByFilm[donation.movieKey] = (donationsByFilm[donation.movieKey] || 0) + donation.amount;
        });

        const filmPerformances: FilmmakerFilmPerformance[] = await Promise.all(filmmakerFilms.map(async film => {
            const grossDonations = donationsByFilm[film.key] || 0;
            const grossAdRevenue = ((viewCounts[film.key] || 0) / 1000) * AD_CPM_IN_CENTS;
            
            // FETCH SENTIMENT DATA
            const sentimentSnap = await db.collection('movies').doc(film.key).collection('sentiment').orderBy('timestamp', 'asc').get();
            const sentimentData: SentimentPoint[] = sentimentSnap.docs.map(d => d.data() as SentimentPoint);

            return {
                key: film.key,
                title: film.title,
                views: viewCounts[film.key] || 0,
                likes: film.likes || 0,
                watchlistAdds: watchlistCounts[film.key] || 0,
                grossDonations,
                grossAdRevenue,
                netDonationEarnings: grossDonations * (1 - DONATION_PLATFORM_CUT),
                netAdEarnings: grossAdRevenue * AD_REVENUE_FILMMAKER_SHARE,
                totalEarnings: (grossDonations * (1 - DONATION_PLATFORM_CUT)) + (grossAdRevenue * AD_REVENUE_FILMMAKER_SHARE),
                sentimentData
            };
        }));

        const totalPaidOut = payoutsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        const totalEarnings = filmPerformances.reduce((sum, f) => sum + f.totalEarnings, 0);

        const analytics: FilmmakerAnalytics = {
            totalDonations: filmPerformances.reduce((s, f) => s + f.netDonationEarnings, 0),
            totalAdRevenue: filmPerformances.reduce((s, f) => s + f.netAdEarnings, 0),
            totalPaidOut,
            balance: totalEarnings - totalPaidOut,
            films: filmPerformances.sort((a,b) => b.views - a.views),
        };

        return new Response(JSON.stringify({ analytics }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}