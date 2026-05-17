import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie, User } from '../types.js';

const SYSTEM_RESET_DATE = '2025-05-24T00:00:00Z';
const PARTNER_SHARE = 0.70;

interface SquarePayment {
  amount_money: { amount: number };
  note?: string;
}

const parseNote = (note: string | undefined): { type: string, title?: string, blockTitle?: string } => {
    if (!note) return { type: 'unknown' };
    const donationMatch = note.match(/Support for film: "(.*)"/);
    if (donationMatch) return { type: 'donation', title: donationMatch[1].trim() };
    const ticketMatch = note.match(/Watch Party Ticket: (.*)/) || note.match(/Live Screening Pass: (.*)/);
    if (ticketMatch) return { type: 'watchPartyTicket', title: ticketMatch[1].trim() };
    if (note.includes('All-Access Pass')) return { type: 'pass' };
    const blockMatch = note.match(/Unlock Block: (.*)/);
    if (blockMatch) return { type: 'block', blockTitle: blockMatch[1].trim() };
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
        const { targetName, type } = await request.json();
        if (!targetName) return new Response(JSON.stringify({ error: 'Identity required' }), { status: 400 });
        
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB fail");

        const isProduction = process.env.VERCEL_ENV === 'production';
        const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
        const locationId = isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID;

        const [allPayments, moviesSnapshot, viewsSnapshot, historySnapshot] = await Promise.all([
            accessToken ? fetchAllRelevantPayments(accessToken, locationId) : Promise.resolve([]),
            db.collection('movies').get(),
            db.collection('view_counts').get(),
            db.collection('payout_history').where('recipient', '==', targetName).get()
        ]);

        const totalPaidOut = historySnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

        if (type === 'filmmaker') {
            const allMovies: Record<string, Movie> = {};
            moviesSnapshot.forEach(doc => { allMovies[doc.id] = { key: doc.id, ...doc.data() } as Movie; });
            const viewCounts: Record<string, number> = {};
            viewsSnapshot.forEach(doc => { viewCounts[doc.id] = Number(doc.data().count) || 0; });

            const normalizedTarget = targetName.trim().toLowerCase();
            const filmmakerFilms = Object.values(allMovies).filter(movie => {
                const directors = (movie.director || '').toLowerCase().split(',').map(d => d.trim());
                return directors.includes(normalizedTarget);
            });

            const revenueByFilm: Record<string, number> = {};
            allPayments.forEach(p => {
                const details = parseNote(p.note);
                if (details.title) {
                    revenueByFilm[details.title] = (revenueByFilm[details.title] || 0) + p.amount_money.amount;
                }
            });

            const filmPerformances = filmmakerFilms.map(film => ({
                key: film.key,
                title: film.title,
                views: viewCounts[film.key] || 0,
                totalEarnings: Math.round((revenueByFilm[film.title] || 0) * PARTNER_SHARE),
            }));

            const totalEarnings = filmPerformances.reduce((sum, f) => sum + f.totalEarnings, 0);

            return new Response(JSON.stringify({ 
                analytics: {
                    gross: totalEarnings / PARTNER_SHARE,
                    balance: Math.max(0, totalEarnings - totalPaidOut),
                    totalPaidOut,
                    films: filmPerformances
                }
            }), { status: 200 });

        } else if (type === 'festival') {
            let festGross = 0;
            const sectors: Record<string, { label: string, units: number, earnings: number }> = {
                passes: { label: 'All-Access Passes', units: 0, earnings: 0 },
                blocks: { label: 'Block Access', units: 0, earnings: 0 },
                parties: { label: 'Watch Parties', units: 0, earnings: 0 }
            };

            allPayments.forEach(p => {
                const details = parseNote(p.note);
                const amt = p.amount_money.amount;
                if (details.type === 'pass') {
                    sectors.passes.units++;
                    sectors.passes.earnings += Math.round(amt * PARTNER_SHARE);
                    festGross += amt;
                } else if (details.type === 'block') {
                    sectors.blocks.units++;
                    sectors.blocks.earnings += Math.round(amt * PARTNER_SHARE);
                    festGross += amt;
                } else if (details.type === 'watchPartyTicket') {
                    sectors.parties.units++;
                    sectors.parties.earnings += Math.round(amt * PARTNER_SHARE);
                    festGross += amt;
                }
            });

            const totalEarnings = Object.values(sectors).reduce((s, sec) => s + sec.earnings, 0);

            return new Response(JSON.stringify({ 
                analytics: {
                    gross: festGross,
                    balance: Math.max(0, totalEarnings - totalPaidOut),
                    totalPaidOut,
                    sectors: Object.values(sectors)
                }
            }), { status: 200 });
        }

        throw new Error("Invalid node type");
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}