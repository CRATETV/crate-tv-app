import { getAdminAuth, getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { GrowthAnalyticsData, MonthlyDataPoint } from '../types.js';

interface SquarePayment {
  created_at: string;
  amount_money: { amount: number };
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
        // Authentication...
        if (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        // --- Firebase/Square Init ---
        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin SDK Error: ${initError}`);
        const auth = getAdminAuth();
        if (!auth) throw new Error("Firebase Auth connection failed.");
        
        const isProduction = process.env.VERCEL_ENV === 'production';
        const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
        const locationId = isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID;
        if (!accessToken) throw new Error("Square Access Token not configured.");

        // --- Fetch Data in Parallel ---
        const allUsersPromise = auth.listUsers(1000).then(result => result.users);
        const allPaymentsPromise = fetchAllSquarePayments(accessToken, locationId);
        
        const [allUsers, allPayments] = await Promise.all([allUsersPromise, allPaymentsPromise]);

        // --- Process Data ---
        const userData = allUsers.map(u => ({ date: new Date(u.metadata.creationTime), value: 1 }));
        const revenueData = allPayments.map(p => ({ date: new Date(p.created_at), value: p.amount_money.amount }));

        const historicalUsers = groupDataByMonth(userData);
        const historicalRevenue = groupDataByMonth(revenueData);

        const projectedUsers = generateProjections(historicalUsers, 6);
        const projectedRevenue = generateProjections(historicalRevenue, 6);

        const totalUsers = allUsers.length;
        const totalRevenue = revenueData.reduce((sum, item) => sum + item.value, 0);

        const data: GrowthAnalyticsData = {
            historical: { users: historicalUsers, revenue: historicalRevenue },
            projections: { users: projectedUsers, revenue: projectedRevenue },
            keyMetrics: {
                totalUsers,
                totalRevenue,
                projectedUsersYtd: totalUsers + projectedUsers.reduce((sum, p) => sum + p.value, 0),
                projectedRevenueYtd: totalRevenue + projectedRevenue.reduce((sum, p) => sum + p.value, 0),
            },
        };

        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error("Error in get-growth-analytics:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}