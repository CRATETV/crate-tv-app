import test from 'node:test';
import assert from 'node:assert/strict';
import { rewritePlaylist, rokuHlsProxyUrl } from '../api/_lib/hlsRewrite.js';

const base = 'https://d2sbutzk4qyhiw.cloudfront.net/hsl/consumed/consumed%20.m3u8';
const toProxy = (a: string) => 'PROXY(' + a + ')';

test('spaces and odd characters in a playlist become complete, encoded addresses', () => {
    const master = '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720\nconsumed _720p.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=800000\nconsumed _360p.m3u8\n';
    const out = rewritePlaylist(master, base, toProxy).split('\n');
    assert.equal(out[2], 'PROXY(https://d2sbutzk4qyhiw.cloudfront.net/hsl/consumed/consumed%20_720p.m3u8)');
    assert.equal(out[4], 'PROXY(https://d2sbutzk4qyhiw.cloudfront.net/hsl/consumed/consumed%20_360p.m3u8)');
    assert.equal(out[1], '#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720');
});
test('video pieces go straight to CloudFront (not through the proxy); keys and maps are fixed too', () => {
    const media = '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key file.bin"\n#EXTINF:6.0,\nconsumed _720p_00001.ts\n#EXTINF:6.0,\nconsumed _720p_00002.ts\n#EXT-X-ENDLIST';
    const out = rewritePlaylist(media, base, toProxy).split('\n');
    assert.equal(out[1], '#EXT-X-KEY:METHOD=AES-128,URI="https://d2sbutzk4qyhiw.cloudfront.net/hsl/consumed/key%20file.bin"');
    assert.equal(out[3], 'https://d2sbutzk4qyhiw.cloudfront.net/hsl/consumed/consumed%20_720p_00001.ts');
    assert.equal(out[5], 'https://d2sbutzk4qyhiw.cloudfront.net/hsl/consumed/consumed%20_720p_00002.ts');
    assert.equal(out[6], '#EXT-X-ENDLIST');
});
test('already-clean playlists and absolute addresses are kept', () => {
    const t = '#EXTM3U\nhttps://other.example.com/x/seg1.ts\nseg2.ts';
    const out = rewritePlaylist(t, base, toProxy).split('\n');
    assert.equal(out[1], 'https://other.example.com/x/seg1.ts');
    assert.equal(out[2], 'https://d2sbutzk4qyhiw.cloudfront.net/hsl/consumed/seg2.ts');
});
test('the Roku address for the Consumed film points at the cleaned playlist and survives the channel\'s own tidy-up', () => {
    const u = rokuHlsProxyUrl('https://d2sbutzk4qyhiw.cloudfront.net/hsl/consumed/consumed%20.m3u8')!;
    assert.ok(u.startsWith('https://cratetv.net/api/hls-playlist?u='));
    assert.ok(u.endsWith('&ext=.m3u8'));
    // What the Roku channel does to every address (NormalizeUrl): + -> %20, %2520 -> %20.
    const tidy = u.replace(/\+/g, '%20').replace(/%2520/g, '%20');
    const target = new URL(new URL(tidy).searchParams.get('u')!);
    assert.equal(target.host, 'd2sbutzk4qyhiw.cloudfront.net');
    assert.equal(decodeURIComponent(target.pathname), '/hsl/consumed/consumed .m3u8');
});
test('plain video files and other hosts are not touched', () => {
    assert.equal(rokuHlsProxyUrl('https://d2sbutzk4qyhiw.cloudfront.net/Film.mp4'), null);
    assert.equal(rokuHlsProxyUrl('https://example.com/a.m3u8'), null);
    assert.equal(rokuHlsProxyUrl(''), null);
});
