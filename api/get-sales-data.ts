// This is a Vercel Serverless Function
// Path: /api/get-sales-data
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { AnalyticsData, Movie, PayoutRequest, AdminPayout, BillSavingsTransaction, User, FilmmakerPayout } from '../types.js';

// EPOCH RESET: Finalized to May 24, 2025. All prior Square data ignored.
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

// ADS DISABLED: Revenue logic zeroed to align with Square Card balance.
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
        const auth = getAdminAuth();

        const isProduction = process.env.VERCEL_ENV === 'production';
        const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
        const locationId = isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID;
        if (!accessToken) errors.square = 'Square Access Token missing.';

        const resetTimestamp = new Date(SYSTEM_RESET_DATE);

        const squarePromise = accessToken ? fetchAllSquarePayments(accessToken, locationId) : Promise.resolve([]);
        const moviesPromise = db ? db.collection('movies').get() : Promise.resolve(null);
        const viewsPromise = db ? db.collection('view_counts').get() : Promise.resolve(null);
        const usersPromise = db ? db.collection('users').get() : Promise.resolve(null);
        const adminPayoutsPromise = db ? db.collection('admin_payouts').where('payoutDate', '>=', resetTimestamp).get() : Promise.resolve(null);
        const billSavingsPromise = db ? db.collection('bill_savings_transactions').where('transactionDate', '>=', resetTimestamp).get() : Promise.resolve(null);

        const [allPayments, moviesSnapshot, viewsSnapshot, usersSnapshot, adminPayoutsSnapshot, billSavingsSnapshot] = await Promise.all([
            squarePromise.catch(e => { errors.square = e.message; return []; }), 
            moviesPromise, 
            viewsPromise, 
            usersPromise, 
            adminPayoutsPromise, 
            billSavingsPromise
        ]);

        const allMovies: Record<string, Movie> = {};
        moviesSnapshot?.forEach(doc => { allMovies[doc.id] = doc.data() as Movie; });

        const viewCounts: Record<string, number> = {};
        viewsSnapshot?.forEach(doc => { viewCounts[doc.id] = Number(doc.data().count) || 0; });
        
        const watchlistCounts: Record<string, number> = {};
        usersSnapshot?.forEach(doc => {
            const userData = doc.data() as User;
            if (userData.watchlist) {
                userData.watchlist.forEach(movieKey => {
                    watchlistCounts[movieKey] = (watchlistCounts[movieKey] || 0) + 1;
                });
            }
        });

        const totalUsers = usersSnapshot?.size || 0;
        const totalAdminPayouts = adminPayoutsSnapshot?.docs.reduce((sum, d) => sum + d.data().amount, 0) || 0;

        let billSavingsPotTotal = 0;
        billSavingsSnapshot?.forEach(doc => {
            const t = doc.data();
            if (t.type === 'deposit') billSavingsPotTotal += t.amount;
            else if (t.type === 'withdrawal') billSavingsPotTotal -= t.amount;
        });

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

        const totalAdRevenue = 0; 
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
            totalRevenue, totalCrateTvRevenue, totalAdminPayouts, pastAdminPayouts: [], billSavingsPotTotal, billSavingsTransactions: [], totalUsers, viewCounts, movieLikes: {}, watchlistCounts, filmmakerPayouts, viewLocations: {}, allUsers: [], actorUsers: [], filmmakerUsers: [],
            totalDonations, totalSales, totalMerchRevenue: 0, totalAdRevenue: 0, crateTvMerchCut: 0, merchSales: {},
            totalFestivalRevenue: festivalRevenue, festivalPassSales: { units: 0, revenue: 0 }, festivalBlockSales: { units: 0, revenue: 0 }, salesByBlock: {}, festivalUsers: [],
            crateFestRevenue, 
        };

        return new Response(JSON.stringify({ analyticsData, errors }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        errors.critical = error instanceof Error ? error.message : "An unknown error occurred.";
        return new Response(JSON.stringify({ analyticsData: null, errors }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}