import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rokuImageUrl, isAllowedImageUrl } from '../api/_lib/imageHosts';

const S3 = 'https://cratetelevision.s3.us-east-1.amazonaws.com/';

test('CRATE pictures become right-sized JPEG addresses on cratetv.net', () => {
    const u = rokuImageUrl(S3 + 'posters/My+Film.png', 900);
    assert.ok(u.startsWith('https://cratetv.net/api/proxy-image?url='));
    assert.ok(u.endsWith('&w=900&fmt=jpeg'));
    // the original address survives a round trip (a "+" stays a "+")
    assert.equal(decodeURIComponent(new URL(u).searchParams.get('url')!), S3 + 'posters/My+Film.png');
});

test('the Roku channel keeps working: no raw "+" or space in the address it receives', () => {
    const u = rokuImageUrl(S3 + 'a b/My+Film.png', 480);
    assert.ok(!u.includes('+') && !u.includes(' '));
});

test('empty, foreign, svg and gif addresses are returned unchanged', () => {
    assert.equal(rokuImageUrl('', 900), '');
    assert.equal(rokuImageUrl(undefined, 900), '');
    assert.equal(rokuImageUrl('https://evil.example/p.jpg', 900), 'https://evil.example/p.jpg');
    assert.equal(rokuImageUrl(S3 + 'x.svg', 900), S3 + 'x.svg');
    assert.equal(rokuImageUrl(S3 + 'x.gif', 900), S3 + 'x.gif');
    assert.ok(isAllowedImageUrl(S3 + 'x.jpg'));
});

import { warmUrls } from '../api/warm-roku-images.js';
test('warm-up lists each film\'s Roku pictures once, skipping unlisted films and foreign pictures', () => {
    const p = 'https://d3jhtrl1gnrh4b.cloudfront.net/p.jpg';
    const urls = warmUrls([{ poster: p, tvPoster: p }, { poster: p, isUnlisted: true }, { poster: 'https://example.com/x.jpg' }, null]);
    assert.equal(urls.length, 2);                       // one poster size + one header size
    assert.ok(urls.every(u => u.startsWith('https://cratetv.net/api/proxy-image')));
});
