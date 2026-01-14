import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { AnalyticsData, Movie, User, FilmmakerPayout } from '../types.js';

const SYSTEM_RESET_DATE = '2025-05-24T00:00:00Z'; 

interface SquarePayment {
  id: string;
  created_at: string;
  amount_money: {
    amount: number; // in cents
  };
  note?: string;
}

const PARTNER_SHARE = 0.70;
const CRATE_SHARE = 0.30;

const parseNote = (note: string | undefined): { type: string, title?: string, director?: string, blockTitle?: string } => {
    if (!note) return { type: 'unknown' };
    
    // Watch Party Ticket Regex
    const wpMatch = note.match(/Watch Party Ticket: (.*)/) || note.match(/Live Screening Pass: (.*)/);
    if (wpMatch) return { type: 'watchPartyTicket', title: wpMatch[1].trim() };
    
    // Donation Regex
    const donationMatch = note.match(/Support for film: "(.*)"/);
    if (donationMatch) return { type: 'donation', title: donationMatch[1].trim() };

    if (note.includes('All-Access Pass')) return { type: 'pass' };
    if (note.includes('Crate Fest')) return { type: 'crateFestPass' };
    
    const blockMatch = note.match(/Unlock Block: "(.*)"/);
    if (blockMatch) return { type: 'block', blockTitle: blockMatch[1].trim() };
    
    if (note.includes('Purchase Film:') || note.includes('VOD Rental:')) return { type: 'movie' };
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

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const [allPayments, moviesSnapshot, viewsSnapshot, usersSnapshot, payoutHistorySnapshot, presenceSnapshot] = await Promise.all([
            accessToken ? fetchAllSquarePayments(accessToken, locationId) : Promise.resolve([]),
            db.collection('movies').get(),
            db.collection('view_counts').get(),
            db.collection('users').get(),
            db.collection('payout_history').get(),
            db.collection('presence').where('lastActive', '>=', fiveMinutesAgo).get()
        ]);

        const allMovies: Record<string, Movie> = {};
        moviesSnapshot.forEach(doc => { allMovies[doc.id] = { key: doc.id, ...doc.data() } as Movie; });

        const viewCounts: Record<string, number> = {};
        viewsSnapshot.forEach(doc => { viewCounts[doc.id] = Number(doc.data().count) || 0; });
        
        let totalDonations = 0;
        let totalSales = 0;
        let festivalRevenue = 0;
        const salesByBlock: Record<string, { units: number, revenue: number }> = {};
        const revenueByFilm: Record<string, { donations: number, tickets: number }> = {};

        allPayments.forEach(p => {
            const details = parseNote(p.note);
            const amount = p.amount_money.amount;
            
            if (details.type === 'donation' && details.title) {
                totalDonations += amount;
                if (!revenueByFilm[details.title]) revenueByFilm[details.title] = { donations: 0, tickets: 0 };
                revenueByFilm[details.title].donations += amount;
            } else if (details.type === 'watchPartyTicket' && details.title) {
                totalSales += amount;
                if (!revenueByFilm[details.title]) revenueByFilm[details.title] = { donations: 0, tickets: 0 };
                revenueByFilm[details.title].tickets += amount;
            } else if (details.type === 'block' && details.blockTitle) {
                festivalRevenue += amount; 
                if (!salesByBlock[details.blockTitle]) salesByBlock[details.blockTitle] = { units: 0, revenue: 0 };
                salesByBlock[details.blockTitle].units++;
                salesByBlock[details.blockTitle].revenue += amount;
            } else if (details.type === 'pass' || details.type === 'crateFestPass') {
                festivalRevenue += amount;
            } else {
                totalSales += amount;
            }
        });

        const totalAdminPayouts = payoutHistorySnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        const totalRevenue = totalDonations + totalSales + festivalRevenue;
        
        // Crate TV retains 30% of donations and festival revenue. 
        // 100% of standard VOD sales go to platform currently, but we can refine.
        const totalCrateTvRevenue = (totalDonations * CRATE_SHARE) + (festivalRevenue * CRATE_SHARE) + totalSales;

        const filmmakerPayouts: FilmmakerPayout[] = Object.values(allMovies).map(movie => {
            const filmRev = revenueByFilm[movie.title] || { donations: 0, tickets: 0 };
            const gross = filmRev.donations + filmRev.tickets;
            const net = gross * PARTNER_SHARE;
            
            return {
                movieTitle: movie.title,
                totalDonations: filmRev.donations,
                totalAdRevenue: filmRev.tickets, // Re-using ad field for tickets
                crateTvCut: gross * CRATE_SHARE,
                filmmakerDonationPayout: filmRev.donations * PARTNER_SHARE,
                filmmakerAdPayout: filmRev.tickets * PARTNER_SHARE,
                totalFilmmakerPayout: net,
            };
        });

        const analyticsData: AnalyticsData = {
            totalRevenue, 
            totalCrateTvRevenue, 
            totalAdminPayouts, 
            pastAdminPayouts: [],
            totalUsers: usersSnapshot.size, 
            viewCounts, 
            movieLikes: {}, 
            watchlistCounts: {}, 
            filmmakerPayouts, 
            viewLocations: {}, 
            allUsers: [], actorUsers: [], filmmakerUsers: [],
            totalDonations, 
            totalSales, 
            totalMerchRevenue: 0, 
            totalAdRevenue: totalSales, 
            crateTvMerchCut: 0, merchSales: {},
            totalFestivalRevenue: festivalRevenue, 
            totalCrateFestRevenue: 0,
            festivalPassSales: { units: 0, revenue: 0 }, 
            festivalBlockSales: { units: 0, revenue: 0 },
            crateFestPassSales: { units: 0, revenue: 0 },
            salesByBlock, 
            festivalUsers: [],
            crateFestRevenue: 0, 
            liveNodes: presenceSnapshot.size,
            recentSpikes: [],
            billSavingsPotTotal: 0,
            billSavingsTransactions: []
        };

        return new Response(JSON.stringify({ analyticsData, errors }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        errors.critical = error instanceof Error ? error.message : "An unknown error occurred.";
        return new Response(JSON.stringify({ analyticsData: null, errors }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}