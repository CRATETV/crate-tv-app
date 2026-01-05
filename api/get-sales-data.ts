
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
        const festPassword = process.env.FESTIVAL_ADMIN_PASSWORD;
        if (password !== primaryAdminPassword && password !== masterPassword && password !== festPassword) {
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
            payoutHistorySnapshot,
            presenceSnapshot,
            recentEventsSnapshot
        ] = await Promise.all([
            accessToken ? fetchAllSquarePayments(accessToken, locationId) : Promise.resolve([]),
            db.collection('movies').get(),
            db.collection('view_counts').get(),
            db.collection('users').get(),
            db.collection('payout_history').where('processedAt', '>=', resetTimestamp).get(),
            db.collection('presence').where('lastActive', '>=', oneHourAgo).get(),
            db.collection('traffic_events').where('timestamp', '>=', oneHourAgo).get()
        ]);

        const allMovies: Record<string, Movie> = {};
        moviesSnapshot.forEach(doc => { allMovies[doc.id] = { key: doc.id, ...doc.data() } as Movie; });

        const viewCounts: Record<string, number> = {};
        viewsSnapshot.forEach(doc => { viewCounts[doc.id] = Number(doc.data().count) || 0; });
        
        const allUsers: { email: string }[] = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data() as User;
            allUsers.push({ email: userData.email || 'Anonymous' });
        });

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
        
        let passUnits = 0;
        let blockUnits = 0;
        const salesByBlock: Record<string, { units: number, revenue: number }> = {};

        allPayments.forEach(p => {
            const details = parseNote(p.note);
            const amount = p.amount_money.amount;
            
            if (details.type === 'donation' && details.title) {
                totalDonations += amount;
                donationsByFilm[details.title] = (donationsByFilm[details.title] || 0) + amount;
            } else if (details.type === 'pass') {
                festivalRevenue += amount;
                passUnits++;
            } else if (details.type === 'block' && details.blockTitle) {
                festivalRevenue += amount;
                blockUnits++;
                if (!salesByBlock[details.blockTitle]) salesByBlock[details.blockTitle] = { units: 0, revenue: 0 };
                salesByBlock[details.blockTitle].units++;
                salesByBlock[details.blockTitle].revenue += amount;
            } else if (['movie', 'subscription'].includes(details.type)) {
                totalSales += amount;
            } else if (details.type === 'crateFestPass') {
                crateFestRevenue += amount;
            }
        });

        // Calculate total previously paid out to partners
        const totalAdminPayouts = payoutHistorySnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

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
            totalAdminPayouts, 
            pastAdminPayouts: [], // History handled in AdminPayout
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
            festivalPassSales: { units: passUnits, revenue: festivalRevenue - (blockUnits * 1000) }, // Approximate
            festivalBlockSales: { units: blockUnits, revenue: blockUnits * 1000 },
            salesByBlock, 
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
