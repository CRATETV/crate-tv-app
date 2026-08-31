import { getApiData } from './_lib/data.js';
import { Movie, Category } from '../types.js';

function filterCategories(data: any) {
    if (data.categories) {
        const finalCategories: Record<string, Category> = {};
        Object.entries(data.categories).forEach(([key, category]) => {
            const cat = category as Category;
            if (!cat || !cat.title) return;
            if (Array.isArray(cat.movieKeys)) {
                cat.movieKeys = cat.movieKeys.filter((k: string) => !!data.movies[k]);
            }
            finalCategories[key] = cat;
        });
        data.categories = finalCategories;
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const noCache = searchParams.get('noCache') === 'true';

        const data = await getApiData({ noCache });

        if (data && data.movies) {
            const finalMovies: Record<string, Movie> = {};
            const movieArray = Object.values(data.movies) as Movie[];

            movieArray.forEach((m: Movie) => {
                if (!m || !m.title || !m.key) return;
                // SECURITY: this used to include fullMovie unconditionally, on the claim
                // that "CloudFront signed URL enforcement means fullMovie URLs require a
                // valid signature anyway" — that claim was false (verified directly: neither
                // CloudFront distribution had signing enabled), and this was the primary
                // public leak of every paid movie's permanent stream URL. The real players
                // now fetch a signed URL from /api/get-stream-url instead of reading this
                // field directly (see MoviePage.tsx/WatchPartyPage.tsx) — so it's now only
                // included for genuinely free titles, both as a defense-in-depth measure
                // (closes the leaked-key surface even before the S3 bucket itself is locked
                // down) and because nothing legitimate reads it for paid content anymore.
                //
                // Same treatment for episodes[].url on a series — a locked series' episode
                // files were the same class of leak, one level down.
                //
                // getApiData()'s result is shared across requests via its own in-memory
                // cache — building a new object here (never mutating m in place) matters:
                // one request's filtering must never leak into a different request's
                // response on a warm serverless instance.
                //
                // This filtering is for THIS public, unauthenticated GET only — the admin
                // panel (AdminPage.tsx) gets the real, unfiltered data via the POST handler
                // below instead. Admins are authenticated and need to see/preview the actual
                // file (see WatchPartyManager.tsx's Control Room preview, MovieEditor, etc.);
                // this endpoint originally fed the admin panel too, and stripping it here
                // unconditionally silently broke every paid title's admin preview until caught.
                const isFree = !m.isForSale && !m.isWatchPartyPaid;
                const filtered: Movie = isFree ? m : { ...m, fullMovie: undefined as any };
                if (!isFree && Array.isArray(filtered.episodes)) {
                    filtered.episodes = filtered.episodes.map(ep => ({ ...ep, url: undefined as any }));
                }
                finalMovies[m.key] = filtered;
            });

            data.movies = finalMovies;
        }

        filterCategories(data);

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Manifest re-syncing...' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Admin-authenticated equivalent — same data, no fullMovie/episode stripping. Used by
// AdminPage.tsx instead of the public GET above, so admin tools (movie editor, watch-party
// Control Room preview, pipeline tools) keep seeing the real file for every title, not just
// free ones. Never cached, since a response here is only ever meant for the requesting admin.
export async function POST(request: Request) {
    try {
        const { password, noCache } = await request.json();

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        const festPassword = process.env.FESTIVAL_ADMIN_PASSWORD;
        let isAuthenticated = password === primaryAdminPassword || password === masterPassword || password === festPassword;
        if (!isAuthenticated) {
            for (const key in process.env) {
                if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) { isAuthenticated = true; break; }
            }
        }
        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const data = await getApiData({ noCache: noCache !== false });
        filterCategories(data);

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Manifest re-syncing...' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
