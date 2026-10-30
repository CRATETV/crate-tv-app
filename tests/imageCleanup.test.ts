import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildImagePlan, isImageKey } from '../api/_lib/imageCleanup';

const NOW = Date.parse('2026-10-30T20:00:00Z');
const DAY = 86400_000;
const old = new Date(NOW - 60 * DAY).toISOString();
const fresh = new Date(NOW - 3 * DAY).toISOString();
const S3 = 'https://cratetelevision.s3.us-east-1.amazonaws.com/';
const CF = 'https://d3jhtrl1gnrh4b.cloudfront.net/';

const data = {
    movies: {
        live: { title: 'Live', poster: S3 + 'posters/live.jpg', cast: [{ photo: CF + 'photos/actor+one.png' }] },
        hidden: { title: 'Hidden', isUnlisted: true, poster: S3 + 'posters/hidden.webp' },
    },
    settings: { banner: CF + 'site/banner.jpg' },
};
const extra = [{ headshot: S3 + 'uploads/actor-submissions/123-me.jpg' }];
const mk = (Key: string, LastModified = old) => ({ Key, Size: 1000, LastModified });
const objects = [
    mk('posters/live.jpg'), mk('posters/hidden.webp'), mk('photos/actor one.png'), mk('site/banner.jpg'),
    mk('uploads/actor-submissions/123-me.jpg'),
    mk('posters/old-version.jpg'), mk('posters/other/live.jpg'), mk('posters/new-upload.jpg', fresh),
    mk('submissions/posters/x.jpg'), mk('partners/p/poster.png'), mk('films/movie.mp4'), mk('live-data.json'),
    { Key: 'posters/nodate.jpg', Size: 1000 }, mk('your-poster.jpg'),
];
const { items, keptImages, totalImages } = buildImagePlan(objects as any, data, extra, NOW);

test('lists only pictures nothing uses', () => {
    assert.deepEqual(items.map(i => i.key), ['posters/old-version.jpg']);
});
test('keeps used (even hidden films), same-name, recent, undated, other tools folders and code-linked', () => {
    assert.equal(totalImages, 12);
    assert.equal(keptImages, 11);
});
test('never lists videos or data files', () => {
    assert.ok(!isImageKey('films/movie.mp4') && !isImageKey('live-data.json') && isImageKey('A.JPG'));
});
