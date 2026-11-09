// Share a film → "Make video" → "From the film".
//
// Films sit behind short-lived signed links (api/get-stream-url.ts), which need a viewer who has paid or
// has access. The admin who is making a promo clip is not that viewer, so this hands an admin (and only an
// admin) the same kind of signed link for one film, so the browser can cut a few seconds out of it.
//
//   { password, movieKey } → { url, expiresAt, hls }
//   { password, movieKey, download: true } → a link that saves the film's file to the computer (not for streaming films)
import { verifyAdminPassword, canUseTab } from './_lib/adminAuth.js';
import { signStreamUrl } from './_lib/signStreamUrl.js';
import { pickStreamSource } from './_lib/streamSource.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await verifyAdminPassword(body.password)) || !(await canUseTab(body.password, ['share', 'movies']))) return json({ error: 'Unauthorized' }, 401);
        const movieKey = typeof body.movieKey === 'string' ? body.movieKey : '';
        if (!movieKey) return json({ error: 'movieKey is required.' }, 400);

        const { getApiData } = await import('./_lib/data.js');
        const data = await getApiData({ noCache: true });
        const movie: any = data.movies?.[movieKey];
        const raw = pickStreamSource(movie, undefined).url;
        if (!raw) return json({ error: 'This film has no video file yet.' }, 404);

        const wantsDownload = body.download === true;
        const isHls = /\.m3u8(\?|$)/i.test(raw);
        if (wantsDownload && isHls) return json({ error: "This film is stored as a streaming version (many small pieces), so there's no single file to download. Use the original film file from your editor." }, 409);
        const ext = (raw.split('?')[0].match(/\.([a-z0-9]{2,4})$/i)?.[1] || 'mp4').toLowerCase();
        const base = String(movie?.title || 'film').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'film';
        const signed = await signStreamUrl(raw, wantsDownload ? { downloadName: `${base}.${ext}` } : {});
        if (!signed) return json({ error: "Couldn't get a link to the film's file." }, 500);
        return json({ ...signed, hls: /\.m3u8(\?|$)/i.test(signed.url) });
    } catch (e) {
        console.error('[admin-clip-source] error:', e);
        return json({ error: 'Server error.' }, 500);
    }
}
