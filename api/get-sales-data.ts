// This is a Vercel Serverless Function
// Path: /api/get-sales-data
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { AnalyticsData, Movie, PayoutRequest, AdminPayout, BillSavingsTransaction, User } from '../types.js';

interface SquarePayment {
  id: string;
  created_at: string;
  amount_money: {
    amount: number; // in cents
    currency: string;
  };
  note?: string;
  itemizations?: {
    name?: string;
    quantity: string;
    total_money: { amount: number };
  }[];
}

const AD_CPM_IN_CENTS = 500; // $5.00 per 1000 views
const DONATION_PLATFORM_CUT = 0.30;
const AD_REVENUE_FILMMAKER_SHARE = 0.50;
const MERCH_PLATFORM_CUT = 0.15;
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
    return { type: 'other' };
};

async function fetchAllSquarePayments(accessToken: string, locationId: string | undefined): Promise<SquarePayment[]> {
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
            try { const errorData = await response.json(); errorMsg = errorData.errors?.[0]?.detail || errorMsg; } catch (e) { }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        if (data.payments && Array.isArray(data.payments)) allPayments.push(...data.payments);
        cursor = data.cursor;
    } while (cursor);
    return allPayments;
}

export async function POST(request: Request) {
    const errors: { square: string | null, firebase: string | null, critical: string | null } = { square: null, firebase: null, critical: null };
    try {
        const { password } = await request.json();
        // Authentication...
        const festivalAdminPassword = 'PWFF1218';
        if (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD && password !== festivalAdminPassword) {
            throw new Error('Unauthorized');
        }

        // --- Firebase Init ---
        const firebaseError = getInitializationError();
        if (firebaseError) errors.firebase = firebaseError;
        const db = getAdminDb();

        // --- Square Init ---
        const isProduction = process.env.VERCEL_ENV === 'production';
        const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
        const locationId = isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID;
        if (!accessToken) errors.square = 'Square Access Token is not configured.';

        // --- Parallel Data Fetching ---
        const squarePromise = accessToken ? fetchAllSquarePayments(accessToken, locationId) : Promise.resolve([]);
        const moviesPromise = db ? db.collection('movies').get() : Promise.resolve(null);
        const viewsPromise = db ? db.collection('view_counts').get() : Promise.resolve(null);
        const locationsPromise = db ? db.collection('view_locations').get() : Promise.resolve(null);
        const usersPromise = db ? db.collection('users').get() : Promise.resolve(null);
        const adminPayoutsPromise = db ? db.collection('admin_payouts').orderBy('payoutDate', 'desc').get() : Promise.resolve(null);
        const billSavingsPromise = db ? db.collection('bill_savings_transactions').orderBy('transactionDate', 'desc').get() : Promise.resolve(null);


        const [
            allPayments,
            moviesSnapshot,
            viewsSnapshot,
            locationsSnapshot,
            usersSnapshot,
            adminPayoutsSnapshot,
            billSavingsSnapshot
        ] = await Promise.all([squarePromise.catch(e => { errors.square = e.message; return []; }), moviesPromise, viewsPromise, locationsPromise, usersPromise, adminPayoutsPromise, billSavingsPromise]);

        // --- Process Data ---
        const allMovies: Record<string, Movie> = {};
        moviesSnapshot?.forEach(doc => { allMovies[doc.id] = doc.data() as Movie; });

        const viewCounts: Record<string, number> = {};
        viewsSnapshot?.forEach(doc => { viewCounts[doc.id] = doc.data().count || 0; });
        
        const movieLikes: Record<string, number> = {};
        Object.entries(allMovies).forEach(([key, movie]) => { movieLikes[key] = movie.likes || 0; });

        const viewLocations: Record<string, Record<string, number>> = {};
        locationsSnapshot?.forEach(doc => { viewLocations[doc.id] = doc.data(); });
        
        const allUsers: { email: string }[] = [];
        const actorUsers: { email: string }[] = [];
        const filmmakerUsers: { email: string }[] = [];
        const watchlistCounts: Record<string, number> = {};
        usersSnapshot?.forEach(doc => {
            const userData = doc.data() as User;
            if (userData.email) {
                allUsers.push({ email: userData.email });
                if (userData.isActor) {
                    actorUsers.push({ email: userData.email });
                }
                if (userData.isFilmmaker) {
                    filmmakerUsers.push({ email: userData.email });
                }
            }
            if (userData.watchlist && Array.isArray(userData.watchlist)) {
                userData.watchlist.forEach(movieKey => {
                    watchlistCounts[movieKey] = (watchlistCounts[movieKey] || 0) + 1;
                });
            }
        });

        const pastAdminPayouts: AdminPayout[] = [];
        adminPayoutsSnapshot?.forEach(doc => {
            pastAdminPayouts.push({ id: doc.id, ...doc.data() } as AdminPayout);
        });
        const totalAdminPayouts = pastAdminPayouts.reduce((sum, p) => sum + p.amount, 0);

        const billSavingsTransactions: BillSavingsTransaction[] = [];
        let billSavingsPotTotal = 0;
        billSavingsSnapshot?.forEach(doc => {
            const transaction = { id: doc.id, ...doc.data() } as BillSavingsTransaction;
            billSavingsTransactions.push(transaction);
            if (transaction.type === 'deposit') {
                billSavingsPotTotal += transaction.amount;
            } else if (transaction.type === 'withdrawal') {
                billSavingsPotTotal -= transaction.amount;
            }
        });

        // --- Financial Calculations ---
        let totalDonations = 0;
        const donationsByFilm: Record<string, number> = {};
        let totalSales = 0;
        let totalMerchRevenue = 0;
        const merchSales: Record<string, { name: string; units: number; revenue: number }> = {};
        let festivalPassSales = { units: 0, revenue: 0 };
        let festivalBlockSales = { units: 0, revenue: 0 };
        const salesByBlock: Record<string, { units: number, revenue: number }> = {};

        allPayments.forEach(p => {
            const details = parseNote(p.note);
            if (details.type === 'donation' && details.title) {
                totalDonations += p.amount_money.amount;
                donationsByFilm[details.title] = (donationsByFilm[details.title] || 0) + p.amount_money.amount;
            } else if (['movie', 'subscription'].includes(details.type)) {
                totalSales += p.amount_money.amount;
            } else if (details.type === 'pass') {
                festivalPassSales.units++;
                festivalPassSales.revenue += p.amount_money.amount;
            } else if (details.type === 'block' && details.blockTitle) {
                festivalBlockSales.units++;
                festivalBlockSales.revenue += p.amount_money.amount;
                if (!salesByBlock[details.blockTitle]) salesByBlock[details.blockTitle] = { units: 0, revenue: 0 };
                salesByBlock[details.blockTitle].units++;
                salesByBlock[details.blockTitle].revenue += p.amount_money.amount;
            } else if (details.type === 'billSavingsDeposit') {
                // Deposits from card are tracked in their own collection,
                // but we should add them to the platform's revenue total.
                totalSales += p.amount_money.amount;
            }
        });

        const totalAdRevenue = (Object.values(viewCounts).reduce((s, c) => s + (c as number), 0) / 1000) * AD_CPM_IN_CENTS;
        const totalFestivalRevenue = festivalPassSales.revenue + festivalBlockSales.revenue;
        const totalRevenue = totalDonations + totalSales + totalMerchRevenue + totalAdRevenue + totalFestivalRevenue;

        // Calculate Crate TV's total share
        const crateTvDonationShare = totalDonations * DONATION_PLATFORM_CUT;
        const crateTvAdShare = totalAdRevenue * (1 - AD_REVENUE_FILMMAKER_SHARE);
        const crateTvMerchCut = totalMerchRevenue * MERCH_PLATFORM_CUT;
        const crateTvFestivalShare = totalFestivalRevenue * FESTIVAL_PLATFORM_CUT;
        const totalCrateTvRevenue = crateTvDonationShare + crateTvAdShare + crateTvMerchCut + crateTvFestivalShare + totalSales;


        const filmmakerPayouts = Object.values(allMovies).map(movie => {
            const filmDonations = donationsByFilm[movie.title] || 0;
            const filmmakerDonationPayout = filmDonations * (1 - DONATION_PLATFORM_CUT);
            const filmAdRevenue = ((viewCounts[movie.key] || 0) / 1000) * AD_CPM_IN_CENTS;
            const filmmakerAdPayout = filmAdRevenue * AD_REVENUE_FILMMAKER_SHARE;
            return {
                movieTitle: movie.title,
                totalDonations: filmDonations,
                crateTvCut: filmDonations * DONATION_PLATFORM_CUT,
                filmmakerDonationPayout,
                totalAdRevenue: filmAdRevenue,
                filmmakerAdPayout,
                totalFilmmakerPayout: filmmakerDonationPayout + filmmakerAdPayout,
            };
        });

        const analyticsData: AnalyticsData = {
            totalRevenue, totalCrateTvRevenue, totalAdminPayouts, pastAdminPayouts, billSavingsPotTotal, billSavingsTransactions, totalUsers: allUsers.length, viewCounts, movieLikes, watchlistCounts, filmmakerPayouts, viewLocations, allUsers, actorUsers, filmmakerUsers,
            totalDonations, totalSales, totalMerchRevenue, totalAdRevenue, crateTvMerchCut, merchSales,
            totalFestivalRevenue, festivalPassSales, festivalBlockSales, salesByBlock,
        };

        return new Response(JSON.stringify({ analyticsData, errors }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        errors.critical = error instanceof Error ? error.message : "An unknown error occurred.";
        return new Response(JSON.stringify({ analyticsData: null, errors }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}