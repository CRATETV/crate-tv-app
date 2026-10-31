// api/_lib/hlsRewrite.ts
//
// Makes streaming (HLS) films play reliably on a Roku (Oct 2026).
//
// A film's playlist can contain file names a browser forgives but a Roku does
// not: spaces ("consumed _720p_00001.ts"), characters that need encoding, or
// pieces that only load because the browser is tolerant. This rewrites a
// playlist so EVERY address in it is complete and correctly encoded, and sends
// the Roku to the CloudFront copy of the pieces (the same address the website
// plays from) instead of a private storage link.
//
//   rokuHlsProxyUrl(raw)   the address the Roku is given for a streaming film
//   rewritePlaylist(...)   the cleaning itself (pure, tested)
//   /api/hls-playlist      the small page that serves a cleaned playlist
import { extractS3Key } from './signStreamUrl.js';

const SITE = 'https://cratetv.net';
export const videoCdnDomain = () => process.env.CLOUDFRONT_VIDEO_DOMAIN || 'd2sbutzk4qyhiw.cloudfront.net';

export const proxyAddress = (absolutePlaylistUrl: string) =>
    `${SITE}/api/hls-playlist?u=${encodeURIComponent(absolutePlaylistUrl)}&ext=.m3u8`;

/** The Roku's address for a streaming film, or null when it isn't one of ours. */
export function rokuHlsProxyUrl(raw: string | undefined | null): string | null {
    if (!raw || !/\.m3u8(\?|#|$)/i.test(raw)) return null;
    const key = extractS3Key(raw.trim(), process.env.AWS_S3_BUCKET_NAME || '', process.env.AWS_S3_REGION === 'global' ? 'us-east-1' : (process.env.AWS_S3_REGION || 'us-east-1'));
    if (!key || !/\.m3u8$/i.test(key)) return null;
    return proxyAddress(`https://${videoCdnDomain()}/${key.split('/').map(encodeURIComponent).join('/')}`);
}

/** Cleans one playlist. `base` = the playlist's own address; `toProxy` makes the address for a nested playlist. */
export function rewritePlaylist(text: string, base: string, toProxy: (absolute: string) => string = proxyAddress): string {
    const resolve = (ref: string): string => {
        try {
            const u = new URL(ref.trim(), base);        // encodes spaces and other odd characters
            return /\.m3u8$/i.test(u.pathname) && u.host === new URL(base).host ? toProxy(u.href) : u.href;
        } catch { return ref; }
    };
    return text.split(/\r?\n/).map(line => {
        if (!line.trim()) return '';
        if (line.startsWith('#')) return line.replace(/URI="([^"]*)"/g, (_m, ref) => `URI="${resolve(ref)}"`);
        return resolve(line);
    }).join('\n');
}
