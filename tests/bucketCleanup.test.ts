import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, keysFromUrl, isVideoKey } from '../api/_lib/storageCleanup';

const NOW = Date.parse('2026-10-26T20:00:00Z');
const DAY = 86400_000;
const S3 = 'https://cratetelevision.s3.us-east-1.amazonaws.com/';
const CF = 'https://d2sbutzk4qyhiw.cloudfront.net/';

const data = {
    movies: {
        live: { title: 'Visible Film', fullMovie: S3 + 'films/Visible+Film.mp4', poster: S3 + 'posters/v.jpg' },
        hidden: { title: 'Old Hidden', isUnlisted: true, fullMovie: CF + 'films/Old%20Hidden.mov' },
        premiere: { title: 'Premiere', isUnlisted: true, isWatchPartyEnabled: true, watchPartyStartTime: new Date(NOW + 10 * DAY).toISOString(), fullMovie: S3 + 'hsl/premiere/Premiere.m3u8' },
        weekend: { title: 'Weekend', isUnlisted: true, availableUntil: new Date(NOW + DAY).toISOString(), fullMovie: S3 + 'films/weekend.mp4' },
        partner: { title: 'Partner', isUnlisted: true, partnerId: 'abc', fullMovie: S3 + 'partners/abc/p.mp4' },
        fest: { title: 'Fest Film', isUnlisted: true, fullMovie: S3 + 'fest/f.mp4' },
        pastFest: { title: 'Past Fest', isUnlisted: true, fullMovie: S3 + 'fest/old.mp4' },
        shared: { title: 'Shared hidden', isUnlisted: true, fullMovie: S3 + 'films/Visible+Film.mp4' },
    },
    festivalData: [
        { blocks: [{ id: 'b1', movieKeys: ['fest'], screeningStartTime: new Date(NOW - 2 * DAY).toISOString() }] },
        { blocks: [{ id: 'b0', movieKeys: ['pastFest'], screeningStartTime: new Date(NOW - 40 * DAY).toISOString() }] },
    ],
    settings: { heroVideo: S3 + 'site/hero.mp4' },
};
const objects = [
    'films/Visible Film.mp4', 'posters/v.jpg', 'films/Old Hidden.mov', 'hsl/premiere/Premiere.m3u8', 'hsl/premiere/Premiere_1080p00001.ts',
    'films/weekend.mp4', 'partners/abc/p.mp4', 'fest/f.mp4', 'fest/old.mp4', 'site/hero.mp4', 'uploads/submission-123.mp4',
    'hsl/gone/Gone.m3u8', 'hsl/gone/Gone_720p00001.ts', 'live-data.json',
].map(Key => ({ Key, Size: 1024 ** 3 }));

const { plan } = buildPlan(objects, data, NOW);
const keys = plan.map(p => p.key).sort();

test('deletes only unused video files', () => {
    assert.deepEqual(keys, ['fest/old.mp4', 'films/Old Hidden.mov', 'hsl/gone/Gone.m3u8', 'hsl/gone/Gone_720p00001.ts', 'uploads/submission-123.mp4'].sort());
});

test('never touches images, site data, visible films, upcoming premieres, live festival blocks, partners', () => {
    for (const k of ['posters/v.jpg', 'live-data.json', 'films/Visible Film.mp4', 'hsl/premiere/Premiere.m3u8', 'hsl/premiere/Premiere_1080p00001.ts', 'films/weekend.mp4', 'partners/abc/p.mp4', 'fest/f.mp4', 'site/hero.mp4']) {
        assert.ok(!keys.includes(k), k);
    }
});

test('says why each file goes', () => {
    assert.equal(plan.find(p => p.key === 'films/Old Hidden.mov')?.reason, 'hidden film: Old Hidden');
    assert.equal(plan.find(p => p.key === 'uploads/submission-123.mp4')?.reason, 'not used by any film on CRATE');
});

test('url to key: plus is a space, percent-decoding, path-style bucket', () => {
    assert.ok(keysFromUrl(S3 + 'a/My+Film.mp4').includes('a/My Film.mp4'));
    assert.ok(keysFromUrl('https://s3.amazonaws.com/cratetelevision/a/b.mp4').includes('a/b.mp4'));
    assert.deepEqual(keysFromUrl('not a url'), []);
    assert.ok(isVideoKey('X.MOV') && !isVideoKey('x.jpg'));
});

import { groupPlan } from '../api/_lib/storageCleanup';

test('an HLS folder becomes one row; single files stay their own rows', () => {
    const groups = groupPlan(plan);
    const gone = groups.find(g => g.id === 'hsl/gone/');
    assert.ok(gone && gone.isFolder && gone.keys.length === 2 && gone.label === 'gone');
    assert.ok(groups.find(g => g.id === 'films/Old Hidden.mov' && !g.isFolder));
    assert.equal(groups.reduce((n, g) => n + g.keys.length, 0), plan.length);
});
