import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sumExtinf, hlsDurationSeconds } from '../services/measureRuntime';

test('HLS length is the sum of its segments', () => {
    assert.equal(sumExtinf('#EXTM3U\n#EXTINF:10.0,\na.ts\n#EXTINF:10.0,\nb.ts\n#EXTINF:4.5,\nc.ts\n#EXT-X-ENDLIST'), 24.5);
    assert.equal(sumExtinf('#EXTM3U\n#EXT-X-ENDLIST'), null);
});

test('a master playlist is followed to its first variant', async () => {
    const files: Record<string, string> = {
        'https://x.test/hsl/film/Film.m3u8': '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=5000000\nFilm_1080p.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=900000\nFilm_360p.m3u8',
        'https://x.test/hsl/film/Film_1080p.m3u8': '#EXTM3U\n#EXTINF:6,\n1.ts\n#EXTINF:6,\n2.ts\n#EXTINF:3,\n3.ts\n#EXT-X-ENDLIST',
    };
    const fake = (async (u: any) => ({ text: async () => files[String(u)] ?? '' })) as any;
    assert.equal(await hlsDurationSeconds('https://x.test/hsl/film/Film.m3u8', fake), 15);
});
