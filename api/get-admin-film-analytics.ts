import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FilmmakerFilmPerformance, Movie, User, SentimentPoint } from '../types.js';
import { fetchAllRelevantPayments, getSquareCredentials, computeRevenueByFilm, PARTNER_SHARE } from './_lib/filmmakerBalance.js';

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

        const { accessToken, locationId } = getSquareCredentials();

        const [allPayments, moviesSnapshot, viewsDoc, usersSnapshot, trafficEventsSnapshot] = await Promise.all([
            accessToken ? fetchAllRelevantPayments(accessToken, locationId) : Promise.resolve([]),
            db.collection('movies').get(),
            db.collection('view_counts').doc(movieKey).get(),
            db.collection('users').get(),
            db.collection('traffic_events').where('movieKey', '==', movieKey).get()
        ]);

        const movies: Movie[] = moviesSnapshot.docs.map(d => ({ key: d.id, ...d.data() } as Movie));
        const movie = movies.find(m => m.key === movieKey);
        if (!movie) return new Response(JSON.stringify({ error: 'Movie not found' }), { status: 404 });

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

        const revenueByFilm = await computeRevenueByFilm(db, allPayments, movies);
        const revenue = revenueByFilm[movie.title] || { donations: 0, tickets: 0, vodRentals: 0 };

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
            grossRentalRevenue: revenue.vodRentals,
            netDonationEarnings: Math.round(revenue.donations * PARTNER_SHARE),
            netAdEarnings: Math.round(revenue.tickets * PARTNER_SHARE),
            netRentalEarnings: Math.round(revenue.vodRentals * PARTNER_SHARE),
            totalEarnings: Math.round((revenue.donations + revenue.tickets + revenue.vodRentals) * PARTNER_SHARE),
            sentimentData,
            trafficEvents
        };

        return new Response(JSON.stringify({ performance }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
