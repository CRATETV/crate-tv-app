import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FilmmakerFilmPerformance, Movie, User, SentimentPoint } from '../types.js';

const PARTNER_SHARE = 0.70;
const SYSTEM_RESET_DATE = '2025-05-24T00:00:00Z';

interface SquarePayment {
  amount_money: { amount: number };
  note?: string;
}

const parseNote = (note: string | undefined): { type: string, title?: string } => {
    if (!note) return { type: 'unknown' };
    const donationMatch = note.match(/Support for film: "(.*)"/);
    if (donationMatch) return { type: 'donation', title: donationMatch[1].trim() };
    const ticketMatch = note.match(/Watch Party Ticket: (.*)/) || note.match(/Live Screening Pass: (.*)/);
    if (ticketMatch) return { type: 'watchPartyTicket', title: ticketMatch[1].trim() };
    return { type: 'other' };
};

async function fetchAllRelevantPayments(accessToken: string, locationId: string | undefined): Promise<SquarePayment[]> {
    const squareUrlBase = process.env.VERCEL_ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
    let allPayments: SquarePayment[] = [];
    let cursor: string | undefined = undefined;
    do {
        const url = new URL(`${squareUrlBase}/v2/payments`);
        url.searchParams.append('begin_time', SYSTEM_RESET_DATE);
        if (locationId) url.searchParams.append('location_id', locationId);
        if (cursor) url.searchParams.append('cursor', cursor);
        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Square-Version': '2024-05-15', 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Square Link Fail');
        const data = await res.json();
        if (data.payments) allPayments.push(...data.payments);
        cursor = data.cursor;
    } while (cursor);
    return allPayments;
}

export async function POST(request: Request) {
    try {
        const { password, movieKey } = await request.json();
        
        // Basic admin check
        if (!password || (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD)) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!movieKey) return new Response(JSON.stringify({ error: 'Movie Key required' }), { status: 400 });
        
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB fail");

        const isProduction = process.env.VERCEL_ENV === 'production';
        const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
        const locationId = isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID;

        const [allPayments, movieDoc, viewsDoc, usersSnapshot, trafficEventsSnapshot] = await Promise.all([
            accessToken ? fetchAllRelevantPayments(accessToken, locationId) : Promise.resolve([]),
            db.collection('movies').doc(movieKey).get(),
            db.collection('view_counts').doc(movieKey).get(),
            db.collection('users').get(),
            db.collection('traffic_events').where('movieKey', '==', movieKey).get()
        ]);

        if (!movieDoc.exists) return new Response(JSON.stringify({ error: 'Movie not found' }), { status: 404 });
        const movie = { key: movieDoc.id, ...movieDoc.data() } as Movie;

        const views = Number(viewsDoc.data()?.count) || 0;
        const trafficEvents = trafficEventsSnapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            timestamp: d.data().timestamp?.toDate?.()?.toISOString() || d.data().timestamp
        }));
        const rokuViews = trafficEvents.filter((e: any) => e.platform === 'ROKU').length;

        let watchlistAdds = 0;
        usersSnapshot.forEach(doc => {
            const u = doc.data() as User;
            if (u.watchlist && u.watchlist.includes(movieKey)) watchlistAdds++;
        });

        const revenue = { donations: 0, tickets: 0 };
        allPayments.forEach(p => {
            const details = parseNote(p.note);
            if (details.title === movie.title) {
                if (details.type === 'donation') revenue.donations += p.amount_money.amount;
                if (details.type === 'watchPartyTicket') revenue.tickets += p.amount_money.amount;
            }
        });

        const sentimentSnap = await db.collection('movies').doc(movieKey).collection('sentiment').orderBy('timestamp', 'asc').get();
        const sentimentData: SentimentPoint[] = sentimentSnap.docs.map(d => d.data() as SentimentPoint);

        const performance: FilmmakerFilmPerformance & { trafficEvents?: any[] } = {
            key: movie.key,
            title: movie.title,
            views,
            likes: movie.likes || 0,
            watchlistAdds,
            rokuViews,
            grossDonations: revenue.donations,
            grossAdRevenue: revenue.tickets,
            netDonationEarnings: Math.round(revenue.donations * PARTNER_SHARE),
            netAdEarnings: Math.round(revenue.tickets * PARTNER_SHARE),
            totalEarnings: Math.round((revenue.donations + revenue.tickets) * PARTNER_SHARE),
            sentimentData,
            trafficEvents
        };

        return new Response(JSON.stringify({ performance }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
