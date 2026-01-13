
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FilmmakerAnalytics, FilmmakerFilmPerformance, Movie, PayoutRequest, User, SentimentPoint } from '../types.js';

// EPOCH RESET: Moved to May 24, 2025
const SYSTEM_RESET_DATE = '2025-05-24T00:00:00Z';
const DONATION_PLATFORM_CUT = 0.30;

export async function POST(request: Request) {
    try {
        const { directorName } = await request.json();
        
        if (!directorName) return new Response(JSON.stringify({ error: 'Name required' }), { status: 400 });
        
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB fail");

        const resetTimestamp = new Date(SYSTEM_RESET_DATE);
        const normalizedTarget = directorName.trim().toLowerCase();

        // 1. Fetch relevant financial records for this director
        const donationsSnapshot = await db.collection('donations')
            .where('directorName', '>=', directorName.trim())
            .where('directorName', '<=', directorName.trim() + '\uf8ff')
            .where('timestamp', '>=', resetTimestamp)
            .get();
            
        const payoutsSnapshot = await db.collection('payout_requests')
            .where('directorName', '>=', directorName.trim())
            .where('directorName', '<=', directorName.trim() + '\uf8ff')
            .where('status', '==', 'completed')
            .where('completionDate', '>=', resetTimestamp)
            .get();

        const moviesSnapshot = await db.collection('movies').get();
        const viewsSnapshot = await db.collection('view_counts').get();
        const usersSnapshot = await db.collection('users').get();
        
        const allMovies: Record<string, Movie> = {};
        moviesSnapshot.forEach(doc => {
            allMovies[doc.id] = { key: doc.id, ...doc.data() } as Movie;
        });

        const viewCounts: Record<string, number> = {};
        viewsSnapshot.forEach(doc => { viewCounts[doc.id] = Number(doc.data().count) || 0; });

        const watchlistCounts: Record<string, number> = {};
        usersSnapshot.forEach(doc => {
            const user = doc.data() as User;
            if (user.watchlist) user.watchlist.forEach(k => watchlistCounts[k] = (watchlistCounts[k] || 0) + 1);
        });

        // REFINED MATCHING: Robust check against comma-separated credits (Case-Insensitive & Trimmed)
        // Works for single names like "Salome" as long as it exists as a node in the credit list.
        const filmmakerFilms = Object.values(allMovies).filter(movie => {
            const directors = (movie.director || '').toLowerCase().split(',').map(d => d.trim());
            const producers = (movie.producers || '').toLowerCase().split(',').map(p => p.trim());
            
            // Match if exact name token found (handles "Salome" even if user is "Salome Denoon" in credits, 
            // provided we normalize correctly)
            return directors.some(d => d === normalizedTarget || d.includes(normalizedTarget)) || 
                   producers.some(p => p === normalizedTarget || p.includes(normalizedTarget));
        });

        const donationsByFilm: Record<string, number> = {};
        donationsSnapshot.forEach(doc => {
            const donation = doc.data();
            donationsByFilm[donation.movieKey] = (donationsByFilm[donation.movieKey] || 0) + donation.amount;
        });

        const filmPerformances: FilmmakerFilmPerformance[] = await Promise.all(filmmakerFilms.map(async film => {
            const grossDonations = donationsByFilm[film.key] || 0;
            
            const sentimentSnap = await db.collection('movies').doc(film.key).collection('sentiment').orderBy('timestamp', 'asc').get();
            const sentimentData: SentimentPoint[] = sentimentSnap.docs.map(d => d.data() as SentimentPoint);

            return {
                key: film.key,
                title: film.title,
                views: viewCounts[film.key] || 0,
                likes: film.likes || 0,
                watchlistAdds: watchlistCounts[film.key] || 0,
                grossDonations,
                grossAdRevenue: 0,
                netDonationEarnings: grossDonations * (1 - DONATION_PLATFORM_CUT),
                netAdEarnings: 0,
                totalEarnings: (grossDonations * (1 - DONATION_PLATFORM_CUT)),
                sentimentData
            };
        }));

        const totalPaidOut = payoutsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        const totalEarnings = filmPerformances.reduce((sum, f) => sum + f.totalEarnings, 0);

        const analytics: FilmmakerAnalytics = {
            totalDonations: filmPerformances.reduce((s, f) => s + f.netDonationEarnings, 0),
            totalAdRevenue: 0,
            totalPaidOut,
            balance: Math.max(0, totalEarnings - totalPaidOut),
            films: filmPerformances.sort((a,b) => b.views - a.views),
        };

        return new Response(JSON.stringify({ analytics }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error("Filmmaker Intel Failure:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
