// GET /api/hls-playlist?u=<playlist address on our video CloudFront>
//
// Serves a CLEANED copy of a streaming film's playlist for the Roku
// (api/_lib/hlsRewrite.ts). It only ever reads playlists (.m3u8) from our own
// video CloudFront address, which are already public to anyone with the link
// (the website plays them the same way), and it never touches the video pieces.
import { rewritePlaylist, videoCdnDomain } from './_lib/hlsRewrite.js';

const text = (body: string, status: number, extra: Record<string, string> = {}) =>
    new Response(body, { status, headers: { 'Content-Type': 'text/plain', ...extra } });

export async function GET(request: Request) {
    try {
        const raw = new URL(request.url).searchParams.get('u') || '';
        let target: URL;
        try { target = new URL(raw); } catch { return text('Bad address', 400); }
        if (target.protocol !== 'https:' || target.host !== videoCdnDomain() || !/\.m3u8$/i.test(target.pathname)) return text('Not allowed', 400);

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        let upstream: Response;
        try { upstream = await fetch(target.href, { signal: ctrl.signal }); } finally { clearTimeout(timer); }
        if (!upstream.ok) return text('Playlist not found', upstream.status === 404 ? 404 : 502);
        const body = await upstream.text();
        if (body.length > 2_000_000 || !body.trimStart().startsWith('#EXTM3U')) return text('Not a playlist', 502);

        return new Response(rewritePlaylist(body, target.href), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                // Finished films never change: let the edge keep it, so the Roku starts fast.
                'Cache-Control': 'public, max-age=60, s-maxage=3600',
            },
        });
    } catch (e) {
        console.error('[hls-playlist]', e);
        return text('Could not load the playlist', 502);
    }
}
