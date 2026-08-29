import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { SYSTEM_RESET_DATE } from './_lib/filmmakerBalance.js';
import { computeShopRevenueByFilmmaker, getShopAttributions } from './_lib/shopRevenue.js';

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
    if (!db) throw new Error("DB fail");

    const openApiConfigured = !!(process.env.FOURTHWALL_OPEN_API_USERNAME && process.env.FOURTHWALL_OPEN_API_PASSWORD);

    const [attributions, revenueByName] = await Promise.all([
        getShopAttributions(db),
        computeShopRevenueByFilmmaker(db, SYSTEM_RESET_DATE),
    ]);

    const byFilmmaker = Array.from(revenueByName.values()).sort((a, b) => b.cents - a.cents);

    return new Response(JSON.stringify({ attributions, byFilmmaker, openApiConfigured }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Shop revenue summary error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
