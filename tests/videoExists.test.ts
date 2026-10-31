import test from 'node:test';
import assert from 'node:assert/strict';
import { findFilmsWithoutVideo, type KeyCheck } from '../api/_lib/videoExists.js';

const host = 'https://d2sbutzk4qyhiw.cloudfront.net/';
const checker = (gone: string[], unsure: string[] = []): KeyCheck => async key => gone.includes(key) ? 'no' : unsure.includes(key) ? 'unknown' : 'yes';

test('a film whose video file is gone is found; films with their video are not', async () => {
    const r = await findFilmsWithoutVideo([
        { key: 'consumed', address: host + 'Consumed.mp4' },
        { key: 'ok', address: host + 'Ok.mp4' },
    ], checker(['Consumed.mp4']));
    assert.deepEqual([...r], ['consumed']);
});
test('the file name with a space ("consumed .m3u8") is looked up as it is stored', async () => {
    const seen: string[] = [];
    const spy: KeyCheck = async k => { seen.push(k); return 'yes'; };
    await findFilmsWithoutVideo([{ key: 'c', address: host + 'hsl/consumed/consumed%20.m3u8' }], spy);
    assert.ok(seen.includes('hsl/consumed/consumed .m3u8'));
});
test('doubt keeps the film: storage errors, no storage, live streams, series, YouTube, no video at all', async () => {
    const m = [
        { key: 'a', address: host + 'A.mp4' },
        { key: 'live', address: host + 'L.mp4', liveStreamUrl: 'https://x/live.m3u8' },
        { key: 'series', address: host + 'S.mp4', episodes: [{ url: host + 'e1.mp4' }] },
        { key: 'yt', address: 'https://youtube.com/watch?v=1' },
        { key: 'none' },
    ];
    assert.deepEqual([...await findFilmsWithoutVideo(m, checker(['A.mp4', 'L.mp4', 'S.mp4']))], ['a']);
    assert.equal((await findFilmsWithoutVideo(m, checker([], ['A.mp4']))).size, 0);
    assert.equal((await findFilmsWithoutVideo(m, null)).size, 0);
});
test('slow storage never holds the feed up', async () => {
    const slow: KeyCheck = () => new Promise(() => {});
    const t = Date.now();
    const r = await findFilmsWithoutVideo([{ key: 'f', address: host + 'F.mp4' }], slow, 50);
    assert.equal(r.size, 0); assert.ok(Date.now() - t < 1000);
});
