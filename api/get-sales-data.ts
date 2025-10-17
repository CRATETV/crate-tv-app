// This is a Vercel Serverless Function
// It will be accessible at the path /api/get-sales-data
import { AnalyticsData, FilmmakerPayout } from '../types';

interface SquarePayment {
  id: string;
  created_at: string;
  amount_money: {
    amount: number; // in cents
    currency: string;
  };
  note?: string;
}

// Helper to parse the note field from a Square payment
const parseNote = (note: string | undefined): { type: string, title?: string, director?: string } => {
    if (!note) return { type: 'unknown' };

    const donationMatch = note.match(/Support for film: "(.*)" by (.*)/);
    if (donationMatch) {
        return { type: 'donation', title: donationMatch[1].trim(), director: donationMatch[2].trim() };
    }
    
    if (note.includes('All-Access Pass')) return { type: 'pass' };
    if (note.includes('Film Block Access')) return { type: 'block' };
    if (note.includes('Premium Subscription')) return { type: 'subscription' };
    
    return { type: 'unknown' };
}

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        // --- Authentication ---
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        
        let isAuthenticated = false;
        if (primaryAdminPassword && password === primaryAdminPassword) isAuthenticated = true;
        else if (masterPassword && password === masterPassword) isAuthenticated = true;
        
        if (!isAuthenticated) {
            for (const key in process.env) {
                if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                    isAuthenticated = true;
                    break;
                }
            }
        }
        
        const anyPasswordSet = primaryAdminPassword || masterPassword || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
        if (!anyPasswordSet) {
             isAuthenticated = true;
        }

        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        
        // --- Square API Fetching ---
        const accessToken = process.env.SQUARE_ACCESS_TOKEN;
        if (!accessToken) {
            throw new Error("Square Access Token is not configured on the server.");
        }

        let allPayments: SquarePayment[] = [];
        let cursor: string | undefined = undefined;

        // Paginate through all payments from Square
        do {
            const url = new URL('https://connect.squareup.com/v2/payments');
            // FIX: The Square ListPayments API requires a begin_time. Set it to a date
            // in the past to ensure all payments are retrieved.
            url.searchParams.append('begin_time', '2020-01-01T00:00:00Z');

            if (cursor) url.searchParams.append('cursor', cursor);

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Square-Version': '2023-10-18',
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            const data = await response.json();
            if (!response.ok) {
                const errorMsg = data.errors?.[0]?.detail || 'Failed to fetch payments from Square.';
                throw new Error(errorMsg);
            }
            
            if (data.payments) {
                allPayments.push(...data.payments);
            }
            cursor = data.cursor;

        } while (cursor);

        // --- Data Processing ---
        const analytics: AnalyticsData = {
            totalRevenue: 0,
            totalDonations: 0,
            totalSales: 0,
            salesByType: {},
            filmmakerPayouts: [],
        };
        
        const payoutMap: { [key: string]: FilmmakerPayout } = {};

        allPayments.forEach(payment => {
            const amount = payment.amount_money.amount;
            analytics.totalRevenue += amount;
            
            const details = parseNote(payment.note);

            if (details.type === 'donation' && details.title && details.director) {
                analytics.totalDonations += amount;
                if (!payoutMap[details.title]) {
                    payoutMap[details.title] = {
                        movieTitle: details.title,
                        director: details.director,
                        totalDonations: 0,
                        crateTvCut: 0,
                        filmmakerPayout: 0,
                    };
                }
                payoutMap[details.title].totalDonations += amount;
            } else if (details.type !== 'unknown') {
                analytics.totalSales += amount;
                analytics.salesByType[details.type] = (analytics.salesByType[details.type] || 0) + amount;
            }
        });

        // Calculate cuts and payouts
        Object.values(payoutMap).forEach(payout => {
            const crateTvCut = Math.round(payout.totalDonations * 0.30); // 30% platform fee
            payout.crateTvCut = crateTvCut;
            payout.filmmakerPayout = payout.totalDonations - crateTvCut;
            analytics.filmmakerPayouts.push(payout);
        });
        
        analytics.filmmakerPayouts.sort((a, b) => b.totalDonations - a.totalDonations);

        return new Response(JSON.stringify(analytics), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("Get Sales Data Error:", errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}