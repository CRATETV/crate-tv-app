import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickStreamSource } from '../api/_lib/streamSource';

const series = { fullMovie: 'https://b/main.mp4', isSeries: true, episodes: [{ url: 'https://b/e1.mp4' }, { url: 'https://b/e2.mp4' }] };

test('no episode asked for: the film itself', () => {
    assert.deepEqual(pickStreamSource(series, undefined), { url: 'https://b/main.mp4' });
    assert.deepEqual(pickStreamSource({ fullMovie: 'https://b/f.mp4' }, null), { url: 'https://b/f.mp4' });
});

test('an episode number gives that episode', () => {
    assert.deepEqual(pickStreamSource(series, 0), { url: 'https://b/e1.mp4' });
    assert.deepEqual(pickStreamSource(series, 1), { url: 'https://b/e2.mp4' });
});

test('bad episode numbers are refused, never fall back to the main file', () => {
    for (const bad of [2, -1, 1.5, '1', NaN, {}]) assert.deepEqual(pickStreamSource(series, bad), { error: 'no-such-episode' });
    assert.deepEqual(pickStreamSource({ fullMovie: 'https://b/f.mp4' }, 0), { error: 'no-such-episode' });
    assert.deepEqual(pickStreamSource(null, 0), { error: 'no-such-episode' });
});
