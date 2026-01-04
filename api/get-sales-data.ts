
// This is a Vercel Serverless Function
// Path: /api/get-sales-data
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { AnalyticsData, Movie, User, FilmmakerPayout } from '../types.js';

// EPOCH RESET: May 24, 2025.
const SYSTEM_RESET_DATE = '2025-05-24T00:00:00Z'; 

interface SquarePayment {
  id: string;
  created_at: string;
  amount_money: {
    amount: number; // in cents
    currency: string;
  };
  note?: string;
}

const DONATION_PLATFORM_CUT = 0.30;
const FESTIVAL_PLATFORM_CUT = 0.30;

const parseNote = (note: string | undefined): { type: string, title?: string, director?: string, blockTitle?: string } => {
    if (!note) return { type: 'unknown' };
    if (note.startsWith('Deposit to Crate TV Bill Savings Pot')) return { type: 'billSavingsDeposit' };
    const donationMatch = note.match(/Support for film: "(.*)" by (.*)/);
    if (donationMatch) return { type: 'donation', title: donationMatch[1].trim(), director: donationMatch[2].trim() };
    if (note.includes('All-Access Pass')) return { type: 'pass' };
    const blockMatch = note.match(/Unlock Block: "(.*)"/);
    if (blockMatch) return { type: 'block', blockTitle: blockMatch[1].trim() };
    if (note.includes('Purchase Film:')) return { type: 'movie' };
    if (note.includes('Crate TV Premium Subscription')) return { type: 'subscription' };
    if (note.includes('Crate Fest 2026 Pass')) return { type: 'crateFestPass' };
    return { type: 'other' };
};

async function fetchAllSquarePayments(accessToken: string, locationId: string | undefined): Promise<SquarePayment[]> {
    const squareUrlBase = process.env.VERCEL_ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
    let allPayments: SquarePayment[] = [];
    let cursor: string | undefined = undefined;

    do {
        const url = new URL(`${squareUrlBase}/v2/payments`);
        url.searchParams.append('begin_time', SYSTEM_RESET_DATE);
        if (locationId) url.searchParams.append('location_id', locationId);
        if (cursor) url.searchParams.append('cursor', cursor);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Square-Version': '2024-05-15', 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error('Failed to fetch payments from Square.');
        const data = await response.json();
        if (data.payments) allPayments.push(...data.payments);
        cursor = data.cursor;
    } while (cursor);
    return allPayments;
}

export async function POST(request: Request) {
    const errors: { square: string | null, firebase: string | null, critical: string | null } = { square: null, firebase: null, critical: null };
    try {
        const { password } = await request.json();
        
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        if (password !== primaryAdminPassword && password !== masterPassword) {
            throw new Error('Unauthorized');
        }

        const initError = getInitializationError();
        if (initError) errors.firebase = initError;
        const db = getAdminDb();
        if (!db) throw new Error("Database offline.");

        const isProduction = process.env.VERCEL_ENV === 'production';
        const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
        const locationId = isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID;

        const resetTimestamp = new Date(SYSTEM_RESET_DATE);
        const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));

        // PARALLEL INTELLIGENCE GATHERING
        const [
            allPayments, 
            moviesSnapshot, 
            viewsSnapshot, 
            usersSnapshot, 
            adminPayoutsSnapshot, 
            billSavingsSnapshot,
            presenceSnapshot,
            recentEventsSnapshot
        ] = await Promise.all([
            accessToken ? fetchAllSquarePayments(accessToken, locationId) : Promise.resolve([]),
            db.collection('movies').get(),
            db.collection('view_counts').get(),
            db.collection('users').get(),
            db.collection('admin_payouts').where('payoutDate', '>=', resetTimestamp).get(),
            db.collection('bill_savings_transactions').where('transactionDate', '>=', resetTimestamp).get(),
            db.collection('presence').where('lastActive', '>=', oneHourAgo).get(), // Active in last hour
            db.collection('traffic_events').where('timestamp', '>=', oneHourAgo).get()
        ]);

        const allMovies: Record<string, Movie> = {};
        moviesSnapshot.forEach(doc => { allMovies[doc.id] = { key: doc.id, ...doc.data() } as Movie; });

        const viewCounts: Record<string, number> = {};
        viewsSnapshot.forEach(doc => { viewCounts[doc.id] = Number(doc.data().count) || 0; });
        
        const watchlistCounts: Record<string, number> = {};
        const allUsers: { email: string }[] = [];

        usersSnapshot.forEach(doc => {
            const userData = doc.data() as User;
            allUsers.push({ email: userData.email || 'Anonymous' });
        });

        // DETECT SPIKES
        const spikeMap: Record<string, number> = {};
        recentEventsSnapshot.forEach(doc => {
            const ev = doc.data();
            if (ev.movieKey) spikeMap[ev.movieKey] = (spikeMap[ev.movieKey] || 0) + 1;
        });

        const recentSpikes = Object.entries(spikeMap)
            .map(([movieKey, count]) => ({
                movieKey,
                title: allMovies[movieKey]?.title || 'Unknown Title',
                count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        let totalDonations = 0;
        const donationsByFilm: Record<string, number> = {};
        let totalSales = 0;
        let festivalRevenue = 0;
        let crateFestRevenue = 0;

        allPayments.forEach(p => {
            const details = parseNote(p.note);
            if (details.type === 'donation' && details.title) {
                totalDonations += p.amount_money.amount;
                donationsByFilm[details.title] = (donationsByFilm[details.title] || 0) + p.amount_money.amount;
            } else if (['movie', 'subscription'].includes(details.type)) {
                totalSales += p.amount_money.amount;
            } else if (['pass', 'block'].includes(details.type)) {
                festivalRevenue += p.amount_money.amount;
            } else if (details.type === 'crateFestPass') {
                crateFestRevenue += p.amount_money.amount;
            }
        });

        const totalRevenue = totalDonations + totalSales + festivalRevenue + crateFestRevenue;
        const totalCrateTvRevenue = (totalDonations * DONATION_PLATFORM_CUT) + (festivalRevenue * FESTIVAL_PLATFORM_CUT) + totalSales + crateFestRevenue;

        const filmmakerPayouts: FilmmakerPayout[] = Object.values(allMovies).map(movie => {
            const filmDonations = donationsByFilm[movie.title] || 0;
            const payout = filmDonations * (1 - DONATION_PLATFORM_CUT);
            return {
                movieTitle: movie.title,
                totalDonations: filmDonations,
                crateTvCut: filmDonations * DONATION_PLATFORM_CUT,
                filmmakerDonationPayout: payout,
                totalAdRevenue: 0,
                filmmakerAdPayout: 0,
                totalFilmmakerPayout: payout,
            };
        });

        const analyticsData: AnalyticsData = {
            totalRevenue, 
            totalCrateTvRevenue, 
            totalAdminPayouts: 0, 
            pastAdminPayouts: [], 
            billSavingsPotTotal: 0, 
            billSavingsTransactions: [], 
            totalUsers: allUsers.length, 
            viewCounts, 
            movieLikes: {}, 
            watchlistCounts: {}, 
            filmmakerPayouts, 
            viewLocations: {}, 
            allUsers, 
            actorUsers: [], 
            filmmakerUsers: [],
            totalDonations, 
            totalSales, 
            totalMerchRevenue: 0, 
            totalAdRevenue: 0, 
            crateTvMerchCut: 0, 
            merchSales: {},
            totalFestivalRevenue: festivalRevenue, 
            festivalPassSales: { units: 0, revenue: 0 }, 
            festivalBlockSales: { units: 0, revenue: 0 }, 
            salesByBlock: {}, 
            festivalUsers: [],
            crateFestRevenue, 
            liveNodes: presenceSnapshot.size,
            recentSpikes
        };

        return new Response(JSON.stringify({ analyticsData, errors }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        errors.critical = error instanceof Error ? error.message : "An unknown error occurred.";
        return new Response(JSON.stringify({ analyticsData: null, errors }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
