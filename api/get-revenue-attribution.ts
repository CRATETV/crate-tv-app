import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { fetchAllRelevantPayments, getSquareCredentials, SYSTEM_RESET_DATE } from './_lib/filmmakerBalance.js';
import { computeRevenueAttribution } from './_lib/revenueAttribution.js';
import { Movie } from '../types.js';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    let isAuthenticated = false;
    if (password && (password === primaryAdminPassword || password === masterPassword)) {
        isAuthenticated = true;
    } else if (password) {
        for (const key in process.env) {
            if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                isAuthenticated = true;
                break;
            }
        }
    }
    const anyPasswordSet = process.env.ADMIN_PASSWORD || process.env.ADMIN_MASTER_PASSWORD || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
    if (!anyPasswordSet) isAuthenticated = true;

    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error('DB fail');

    const { accessToken, locationId } = getSquareCredentials();
    const [payments, moviesSnap] = await Promise.all([
        accessToken ? fetchAllRelevantPayments(accessToken, locationId) : Promise.resolve([]),
        db.collection('movies').get(),
    ]);
    const movies: Movie[] = moviesSnap.docs.map(d => ({ key: d.id, ...d.data() } as Movie));

    const attribution = await computeRevenueAttribution(db, payments, movies);

    return new Response(JSON.stringify({ attribution, since: SYSTEM_RESET_DATE }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Revenue attribution error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
