// api/warm-roku-images.ts  (runs by itself every 3 hours; see vercel.json)
//
// The Roku gets right-sized copies of every picture from /api/proxy-image.
// The FIRST time a copy is asked for, the resizer has to make it, which is the
// slow part. This visits every film's Roku pictures ahead of time so the
// first viewer on a Roku gets them already made.
// Safe: it only asks for pictures, never changes anything.
import { getApiData } from './_lib/data.js';
import { rokuImageUrl } from './_lib/imageHosts.js';

const SITE = 'https://cratetv.net';
const BUDGET_MS = 50_000;

export function warmUrls(movies: any[]): string[] {
    const out = new Set<string>();
    for (const m of movies) {
        if (!m || m.isUnlisted) continue;
        for (const raw of [m.poster, m.tvPoster]) { const u = rokuImageUrl(raw, 900); if (u.startsWith(SITE)) out.add(u); }
        const hero = rokuImageUrl(m.rokuHeroImage || m.tvPoster || m.poster, 1920);
        if (hero.startsWith(SITE)) out.add(hero);
    }
    return [...out];
}

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) return new Response('Unauthorized', { status: 401 });
    try {
        const data: any = await getApiData();
        const urls = warmUrls(Object.values(data?.movies || {}));
        const started = Date.now();
        let done = 0, failed = 0, next = 0;
        const worker = async () => {
            while (next < urls.length && Date.now() - started < BUDGET_MS) {
                const url = urls[next++];
                try {
                    const r = await fetch(url, { headers: { Accept: 'image/jpeg' } });
                    await r.arrayBuffer();
                    if (r.ok) done++; else failed++;
                } catch { failed++; }
            }
        };
        await Promise.all(Array.from({ length: 6 }, worker));
        return new Response(JSON.stringify({ pictures: urls.length, warmed: done, failed, skippedForTime: Math.max(0, urls.length - next) }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        console.error('[warm-roku-images]', e);
        return new Response('Failed', { status: 500 });
    }
}
