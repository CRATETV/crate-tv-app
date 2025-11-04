// This is a Vercel Serverless Function
// It will be accessible at the path /api/get-filmmaker-analytics
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FilmmakerAnalytics, FilmmakerFilmPerformance, Movie, PayoutRequest } from '../types.js';

const AD_CPM_IN_CENTS = 500; // $5.00 per 1000 views
const AD_REVENUE_FILMMAKER_SHARE = 0.50; // 50%

export async function POST(request: Request) {
    try {
        const { directorName, password } = await request.json();

        // 1. Authentication
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        let isAuthenticated = false;
        // This endpoint can be accessed by filmmakers, so we don't check for admin password
        if (password) {
             if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
              isAuthenticated = true;
            } else {
                for (const key in process.env) {
                    if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                        isAuthenticated = true;
                        break;
                    }
                }
            }
        }
        
        if (!directorName) {
            return new Response(JSON.stringify({ error: 'Filmmaker name is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        
        // 2. Initialize Firebase
        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed.");

        // 3. Fetch all necessary data in parallel
        const donationsPromise = db.collection('donations').where('directorName', '==', directorName).get();
        const moviesPromise = db.collection('movies').get();
        const viewsPromise = db.collection('view_counts').get();
        const payoutsPromise = db.collection('payout_requests').where('directorName', '==', directorName).where('status', '==', 'completed').get();
        
        const [
            donationsSnapshot,
            moviesSnapshot,
            viewsSnapshot,
            payoutsSnapshot
        ] = await Promise.all([
            donationsPromise,
            moviesPromise,
            viewsPromise,
            payoutsPromise
        ]);

        // 4. Process Data
        const allMovies: Record<string, Movie> = {};
        moviesSnapshot.forEach(doc => {
            allMovies[doc.id] = { key: doc.id, ...doc.data() } as Movie;
        });

        const viewCounts: Record<string, number> = {};
        viewsSnapshot.forEach(doc => { viewCounts[doc.id] = doc.data().count || 0; });

        const filmmakerFilms = Object.values(allMovies).filter(movie => {
            const directors = (movie.director || '').split(',').map(d => d.trim().toLowerCase());
            const producers = (movie.producers || '').split(',').map(p => p.trim().toLowerCase());
            const trimmedName = directorName.trim().toLowerCase();
            return directors.includes(trimmedName) || producers.includes(trimmedName);
        });

        if (filmmakerFilms.length === 0 && !isAuthenticated) {
            const emptyAnalytics: FilmmakerAnalytics = { totalDonations: 0, totalAdRevenue: 0, totalPaidOut: 0, balance: 0, films: [] };
            return new Response(JSON.stringify({ analytics: emptyAnalytics }), { status: 200, headers: { 'Content-Type': 'application/json' }});
        }
        
        let totalDonations = 0;
        let totalAdRevenue = 0;
        const filmPerformances: FilmmakerFilmPerformance[] = [];

        // Aggregate donations by movieKey first for efficiency
        const donationsByFilm: Record<string, number> = {};
        donationsSnapshot.forEach(doc => {
            const donation = doc.data();
            donationsByFilm[donation.movieKey] = (donationsByFilm[donation.movieKey] || 0) + donation.amount;
        });

        filmmakerFilms.forEach(film => {
            const filmDonations = donationsByFilm[film.key] || 0;

            const filmAdRevenue = ((viewCounts[film.key] || 0) / 1000) * AD_CPM_IN_CENTS;
            const filmmakerAdShare = filmAdRevenue * AD_REVENUE_FILMMAKER_SHARE;

            totalDonations += filmDonations;
            totalAdRevenue += filmmakerAdShare;
            
            filmPerformances.push({
                key: film.key,
                title: film.title,
                views: viewCounts[film.key] || 0,
                likes: allMovies[film.key].likes || 0,
                donations: filmDonations,
                adRevenue: filmmakerAdShare,
            });
        });

        const totalPaidOut = payoutsSnapshot.docs
            .map(doc => doc.data() as PayoutRequest)
            .reduce((sum, req) => sum + req.amount, 0);

        const crateTvDonationCut = Math.round(totalDonations * 0.30);
        const filmmakerTotalDonationEarnings = totalDonations - crateTvDonationCut;
        const balance = (filmmakerTotalDonationEarnings + totalAdRevenue) - totalPaidOut;

        const analytics: FilmmakerAnalytics = {
            totalDonations,
            totalAdRevenue,
            totalPaidOut,
            balance,
            films: filmPerformances.sort((a,b) => b.views - a.views),
        };

        return new Response(JSON.stringify({ analytics }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("[Filmmaker Analytics API] Error:", errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}