import { getAdminAuth, getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { GrowthAnalyticsData, MonthlyDataPoint, User, Movie, AboutData } from '../types.js';

interface SquarePayment {
  created_at: string;
  amount_money: { amount: number };
  note?: string;
}

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
        
        if (!response.ok) throw new Error('Failed to fetch payments from Square.');
        const data = await response.json();
        if (data.payments) allPayments.push(...data.payments);
        cursor = data.cursor;
    } while (cursor);
    return allPayments;
}

const groupDataByMonth = (items: { date: Date; value: number }[]): MonthlyDataPoint[] => {
    const monthlyData: Record<string, number> = {};
    items.forEach(item => {
        const monthKey = item.date.toISOString().slice(0, 7); // "YYYY-MM"
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + item.value;
    });

    return Object.entries(monthlyData).map(([month, value]) => ({
        month: new Date(month + '-02').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), // "Jul '24"
        value,
    })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
};

const generateProjections = (historical: MonthlyDataPoint[], monthsToProject: number): MonthlyDataPoint[] => {
    if (historical.length < 2) return [];

    const lastN = historical.slice(-3);
    const avgMonthlyIncrease = lastN.length > 1 
        ? (lastN[lastN.length - 1].value - lastN[0].value) / (lastN.length - 1)
        : lastN[0]?.value || 0;

    const projections: MonthlyDataPoint[] = [];
    let lastValue = historical[historical.length - 1].value;
    let lastMonthDate = new Date(historical[historical.length - 1].month);

    for (let i = 0; i < monthsToProject; i++) {
        lastMonthDate.setMonth(lastMonthDate.getMonth() + 1);
        lastValue += avgMonthlyIncrease;
        projections.push({
            month: lastMonthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            value: Math.max(0, lastValue),
        });
    }
    return projections;
};

export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        if (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin SDK Error: ${initError}`);
        const auth = getAdminAuth();
        const db = getAdminDb();
        if (!auth || !db) throw new Error("Firebase Auth or DB connection failed.");
        
        const isProduction = process.env.VERCEL_ENV === 'production';
        const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
        if (!accessToken) throw new Error("Square Access Token not configured.");

        // --- Fetch Data in Parallel ---
        const listAllAuthUsers = async () => {
            const allUsers = [];
            let pageToken;
            do {
                const listUsersResult = await auth.listUsers(1000, pageToken);
                allUsers.push(...listUsersResult.users);
                pageToken = listUsersResult.pageToken;
            } while (pageToken);
            return allUsers;
        };

        const [
            allAuthUsers,
            allPayments,
            usersDocs,
            moviesDocs,
            viewsDocs,
            locationsDocs,
            aboutDoc
        ] = await Promise.all([
            listAllAuthUsers(),
            fetchAllSquarePayments(accessToken, isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID),
            db.collection('users').get(),
            db.collection('movies').get(),
            db.collection('view_counts').get(),
            db.collection('view_locations').get(),
            db.collection('content').doc('about').get(),
        ]);

        // --- Process Data ---
        const registeredUsers = allAuthUsers.filter(u => u.email);
        const totalVisitors = usersDocs.size;
        const totalUsers = registeredUsers.length;
        const conversionRate = totalVisitors > 0 ? (totalUsers / totalVisitors) * 100 : 0;

        // Calculate DAU and WAU
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        let dailyActiveUsers = 0;
        let weeklyActiveUsers = 0;

        for (const user of registeredUsers) {
            const lastSignIn = new Date(user.metadata.lastSignInTime);
            if (lastSignIn >= sevenDaysAgo) {
                weeklyActiveUsers++;
                if (lastSignIn >= twentyFourHoursAgo) {
                    dailyActiveUsers++;
                }
            }
        }
        
        let actorCount = 0;
        let filmmakerCount = 0;
        usersDocs.forEach(doc => {
            const user = doc.data() as User;
            if (user.isActor) actorCount++;
            if (user.isFilmmaker) filmmakerCount++;
        });

        const countryMap: Record<string, number> = {};
        locationsDocs.forEach(doc => {
            const locations = doc.data();
            for (const country in locations) {
                countryMap[country] = (countryMap[country] || 0) + locations[country];
            }
        });
        const topCountries = Object.entries(countryMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([country, views]) => ({ country, views }));

        const revenueData = allPayments.map(p => ({ date: new Date(p.created_at), value: p.amount_money.amount }));
        const historicalRevenue = groupDataByMonth(revenueData);
        const totalRevenue = revenueData.reduce((sum, item) => sum + item.value, 0);
        
        const userData = registeredUsers.map(u => ({ date: new Date(u.metadata.creationTime), value: 1 }));
        const historicalUsers = groupDataByMonth(userData);

        let totalWatchlistAdds = 0;
        usersDocs.forEach(doc => {
            const user = doc.data() as User;
            if (user.watchlist) totalWatchlistAdds += user.watchlist.length;
        });

        const totalViews = viewsDocs.docs.reduce((sum, doc) => sum + (doc.data().count || 0), 0);
        const totalLikes = moviesDocs.docs.reduce((sum, doc) => sum + (doc.data().likes || 0), 0);
        const totalFilms = moviesDocs.size;

        const allMovies: Record<string, Movie> = {};
        moviesDocs.forEach(doc => { allMovies[doc.id] = doc.data() as Movie; });
        const viewCounts: Record<string, number> = {};
        viewsDocs.forEach(doc => { viewCounts[doc.id] = doc.data().count || 0; });
        
        const donationsByFilmTitle: Record<string, number> = {};
        allPayments.forEach(p => {
            if (p.note?.includes('Support for film')) {
                const titleMatch = p.note.match(/Support for film: "(.*?)"/);
                if (titleMatch) {
                    donationsByFilmTitle[titleMatch[1]] = (donationsByFilmTitle[titleMatch[1]] || 0) + p.amount_money.amount;
                }
            }
        });

        const topEarningFilms = Object.values(allMovies).map(movie => {
            const adRevenue = ((viewCounts[movie.key] || 0) / 1000) * 500; // AD_CPM_IN_CENTS
            const donationRevenue = donationsByFilmTitle[movie.title] || 0;
            return {
                title: movie.title,
                totalRevenue: adRevenue + donationRevenue,
                adRevenue,
                donationRevenue
            };
        }).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
        
        let mostViewedFilm = { title: 'N/A', views: 0 };
        viewsDocs.forEach(doc => {
            const count = doc.data().count || 0;
            if (count > mostViewedFilm.views) {
                const movie = allMovies[doc.id];
                if(movie) mostViewedFilm = { title: movie.title, views: count };
            }
        });
        let mostLikedFilm = { title: 'N/A', likes: 0 };
        moviesDocs.forEach(doc => {
            const likes = doc.data().likes || 0;
            if (likes > mostLikedFilm.likes) {
                mostLikedFilm = { title: doc.data().title, likes: likes };
            }
        });

        const projectedUsers = generateProjections(historicalUsers, 6);
        const projectedRevenue = generateProjections(historicalRevenue, 6);
        const avgRevenuePerUser = totalUsers > 0 ? totalRevenue / totalUsers : 0;
        const aboutData = aboutDoc.exists ? aboutDoc.data() as AboutData : null;

        let avgMoMUserGrowth = 0;
        if(historicalUsers.length > 1) {
            const growthRates = [];
            for (let i = 1; i < historicalUsers.length; i++) {
                if (historicalUsers[i-1].value > 0) {
                    const rate = ((historicalUsers[i].value - historicalUsers[i-1].value) / historicalUsers[i-1].value) * 100;
                    growthRates.push(rate);
                }
            }
            if (growthRates.length > 0) {
                avgMoMUserGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
            }
        }

        const data: GrowthAnalyticsData = {
            historical: { users: historicalUsers, revenue: historicalRevenue },
            projections: { users: projectedUsers, revenue: projectedRevenue },
            keyMetrics: {
                totalVisitors,
                totalUsers,
                conversionRate,
                dailyActiveUsers,
                weeklyActiveUsers,
                totalRevenue,
                projectedUsersYtd: totalUsers + projectedUsers.reduce((sum, p) => sum + p.value, 0),
                projectedRevenueYtd: totalRevenue + projectedRevenue.reduce((sum, p) => sum + p.value, 0),
                totalViews,
                totalLikes,
                totalWatchlistAdds,
                totalFilms,
                mostViewedFilm,
                mostLikedFilm,
                avgRevenuePerUser,
                totalDonations: Object.values(donationsByFilmTitle).reduce((s, a) => s + a, 0),
                totalSales: allPayments.filter(p => !p.note?.includes('Support for film')).reduce((s, p) => s + p.amount_money.amount, 0),
                audienceBreakdown: { total: totalUsers, actors: actorCount, filmmakers: filmmakerCount },
                topCountries,
                topEarningFilms,
            },
            aboutData: aboutData || undefined,
            avgMoMUserGrowth,
        };

        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error("Error in get-growth-analytics:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}