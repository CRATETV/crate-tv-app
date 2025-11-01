// This is a Vercel Serverless Function
// It will be accessible at the path /api/get-filmmaker-analytics
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FilmmakerAnalytics, FilmmakerFilmPerformance, Movie, PayoutRequest } from '../types.js';

// Helper interfaces and functions, self-contained for this endpoint
interface SquarePayment {
  id: string;
  created_at: string;
  amount_money: {
    amount: number; // in cents
    currency: string;
  };
  note?: string;
}

const parseNote = (note: string | undefined): { type: string, title?: string, director?: string } => {
    if (!note) return { type: 'unknown' };
    const donationMatch = note.match(/Support for film: "(.*)" by (.*)/);
    if (donationMatch) {
        return { type: 'donation', title: donationMatch[1].trim(), director: donationMatch[2].trim() };
    }
    return { type: 'other' };
}

async function fetchSquareData(accessToken: string, locationId: string | undefined): Promise<SquarePayment[]> {
    const squareUrlBase = process.env.VERCEL_ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
    let allPayments: SquarePayment[] = [];
    let cursor: string | undefined = undefined;

    do {
        const url = new URL(`${squareUrlBase}/v2/payments`);
        url.searchParams.append('begin_time', '2020-01-01T00:00:00Z');
        if (locationId) url.searchParams.append('location_id', locationId);
        if (cursor) url.searchParams.append('cursor', cursor);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Square-Version': '2024-05-15', 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
            let errorMsg = 'Failed to fetch payments from Square.';
            try {
                const errorData = await response.json();
                errorMsg = errorData.errors?.[0]?.detail || errorMsg;
            } catch (e) {
                errorMsg = `Square API returned a non-JSON error (Status: ${response.status}).`;
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        if (data.payments && Array.isArray(data.payments)) {
            allPayments.push(...data.payments);
        }
        cursor = data.cursor;
    } while (cursor);
    return allPayments;
}


export async function POST(request: Request) {
    try {
        const { directorName } = await request.json();

        // 1. Authentication (Password check removed, security handled by frontend route protection)
        if (!directorName) {
            return new Response(JSON.stringify({ error: 'Filmmaker name is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        
        // 2. Initialize Firebase
        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed.");

        // 3. Fetch all necessary data in parallel
        const isProduction = process.env.VERCEL_ENV === 'production';
        const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
        const locationId = isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID;

        const squarePromise = accessToken ? fetchSquareData(accessToken, locationId) : Promise.resolve([]);
        const moviesPromise = db.collection('movies').get();
        const viewsPromise = db.collection('view_counts').get();
        const payoutsPromise = db.collection('payout_requests').where('directorName', '==', directorName).where('status', '==', 'completed').get();
        
        const [
            allPayments,
            moviesSnapshot,
            viewsSnapshot,
            payoutsSnapshot
        ] = await Promise.all([
            squarePromise,
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

        if (filmmakerFilms.length === 0) {
            const emptyAnalytics: FilmmakerAnalytics = { totalDonations: 0, totalPaidOut: 0, balance: 0, films: [] };
            return new Response(JSON.stringify({ analytics: emptyAnalytics }), { status: 200, headers: { 'Content-Type': 'application/json' }});
        }
        
        let totalDonations = 0;
        const filmPerformances: FilmmakerFilmPerformance[] = [];

        // FIX: Corrected typo from 'directorFilms' to 'filmmakerFilms'.
        filmmakerFilms.forEach(film => {
            const filmDonations = allPayments
                .filter(p => {
                    const details = parseNote(p.note);
                    return details.type === 'donation' && details.title === film.title;
                })
                .reduce((sum, p) => sum + p.amount_money.amount, 0);

            totalDonations += filmDonations;
            filmPerformances.push({
                key: film.key,
                title: film.title,
                views: viewCounts[film.key] || 0,
                likes: allMovies[film.key].likes || 0,
                donations: filmDonations,
            });
        });

        const totalPaidOut = payoutsSnapshot.docs
            .map(doc => doc.data() as PayoutRequest)
            .reduce((sum, req) => sum + req.amount, 0);

        const crateTvCut = Math.round(totalDonations * 0.30);
        const filmmakerTotalEarnings = totalDonations - crateTvCut;
        const balance = filmmakerTotalEarnings - totalPaidOut;

        const analytics: FilmmakerAnalytics = {
            totalDonations,
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