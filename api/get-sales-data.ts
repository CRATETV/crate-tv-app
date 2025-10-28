// This is a Vercel Serverless Function
// It will be accessible at the path /api/get-sales-data
import * as admin from 'firebase-admin';
import { AnalyticsData, FilmmakerPayout } from '../types';
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin';

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
    
    if (note.includes('All-Access Pass')) return { type: 'pass' };
    if (note.includes('Unlock Block')) return { type: 'block' };
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
            console.warn("[Analytics API] Authentication failed.");
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        console.log("[Analytics API] Authentication successful.");
        
        let allPayments: SquarePayment[] = [];
        let squareError: string | null = null;
        
        // --- Square API Fetching (in its own try/catch) ---
        try {
            console.log("[Analytics API] Checking Square configuration...");
            const isProduction = process.env.VERCEL_ENV === 'production';
            const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
            const locationId = isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID;

            if (!accessToken) {
                const missingVar = isProduction ? 'Production' : 'Sandbox';
                throw new Error(`Square ${missingVar} Access Token is not configured on the server.`);
            }
            console.log("[Analytics API] Square configuration check passed.");

            const squareUrlBase = isProduction ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
            let cursor: string | undefined = undefined;

            do {
                const url = new URL(`${squareUrlBase}/v2/payments`);
                url.searchParams.append('begin_time', '2020-01-01T00:00:00Z');
                if (locationId) url.searchParams.append('location_id', locationId);
                if (cursor) url.searchParams.append('cursor', cursor);

                const response = await fetch(url.toString(), {
                    method: 'GET',
                    headers: {
                        'Square-Version': '2024-05-15',
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
                
                if (!response.ok) {
                    let errorMsg = 'Failed to fetch payments from Square.';
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.errors?.[0]?.detail || errorMsg;
                    } catch (e) {
                        errorMsg = `Square API returned a non-JSON error (Status: ${response.status}). This often means the API token is invalid or expired.`;
                    }
                    throw new Error(errorMsg);
                }

                const data = await response.json();
                if (data.payments) allPayments.push(...data.payments);
                cursor = data.cursor;
            } while (cursor);
            console.log(`[Analytics API] Fetched ${allPayments.length} payments from Square.`);
        } catch(e) {
            squareError = e instanceof Error ? e.message : "An unknown error occurred while fetching Square data.";
            console.error("[Analytics API] Square Fetching Error:", squareError);
        }
        
        // --- Firebase Data Fetching (in its own try/catch) ---
        let viewCounts: Record<string, number> = {};
        let movieLikes: Record<string, number> = {};
        let totalUsers = 0;
        let recentUsers: { email: string; creationTime: string; }[] = [];
        let firebaseError: string | null = null;

        try {
            console.log("[Analytics API] Checking Firebase Admin configuration...");
            const initError = getInitializationError();
            if (initError) throw new Error(`Could not connect to Firebase. Reason: ${initError}`);
            console.log("[Analytics API] Firebase Admin configuration check passed.");

            const db = getAdminDb();
            const adminAuth = getAdminAuth();

            if (db) {
                const viewsSnapshot = await db.collection("view_counts").get();
                viewsSnapshot.forEach(doc => { viewCounts[doc.id] = doc.data().count || 0; });
                const moviesSnapshot = await db.collection("movies").get();
                moviesSnapshot.forEach(doc => { movieLikes[doc.id] = doc.data().likes || 0; });
            } else {
                console.warn("[Analytics API] Firestore DB not available.");
            }
            
            if (adminAuth) {
                let allAuthUsers: admin.auth.UserRecord[] = [];
                let nextPageToken;
                do {
                    const listUsersResult = await adminAuth.listUsers(1000, nextPageToken);
                    allAuthUsers.push(...listUsersResult.users);
                    nextPageToken = listUsersResult.pageToken;
                } while (nextPageToken);
                totalUsers = allAuthUsers.length;
                allAuthUsers.sort((a, b) => new Date(b.metadata.creationTime).getTime() - new Date(a.metadata.creationTime).getTime());
                recentUsers = allAuthUsers.slice(0, 100).map(user => ({
                    email: user.email || 'N/A',
                    creationTime: new Date(user.metadata.creationTime).toLocaleString(),
                }));
            } else {
                throw new Error("Firebase Authentication service is not available. Cannot fetch user data.");
            }
            console.log("[Analytics API] Fetched data from Firebase successfully.");
        } catch(e) {
            firebaseError = e instanceof Error ? e.message : "An unknown error occurred while fetching Firebase data.";
            console.error("[Analytics API] Firebase Fetching Error:", firebaseError);
        }

        // --- Data Processing ---
        const analyticsData: AnalyticsData = {
            totalRevenue: 0, totalDonations: 0, totalSales: 0,
            salesByType: {}, filmmakerPayouts: [],
            viewCounts, movieLikes, totalUsers, recentUsers,
        };
        const payoutMap: { [key: string]: FilmmakerPayout } = {};

        allPayments.forEach(payment => {
            const amount = payment.amount_money.amount;
            analyticsData.totalRevenue += amount;
            const details = parseNote(payment.note);
            if (details.type === 'donation' && details.title && details.director) {
                analyticsData.totalDonations += amount;
                if (!payoutMap[details.title]) {
                    payoutMap[details.title] = { movieTitle: details.title, director: details.director, totalDonations: 0, crateTvCut: 0, filmmakerPayout: 0 };
                }
                payoutMap[details.title].totalDonations += amount;
            } else if (details.type !== 'unknown') {
                analyticsData.totalSales += amount;
                analyticsData.salesByType[details.type] = (analyticsData.salesByType[details.type] || 0) + amount;
            }
        });

        Object.values(payoutMap).forEach(payout => {
            payout.crateTvCut = Math.round(payout.totalDonations * 0.30);
            payout.filmmakerPayout = payout.totalDonations - payout.crateTvCut;
            analyticsData.filmmakerPayouts.push(payout);
        });
        analyticsData.filmmakerPayouts.sort((a, b) => b.totalDonations - a.totalDonations);

        console.log("[Analytics API] Request completed successfully.");
        return new Response(JSON.stringify({
            analyticsData,
            errors: { square: squareError, firebase: firebaseError }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("[Analytics API] A critical error occurred:", error);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}