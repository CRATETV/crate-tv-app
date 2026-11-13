import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warmUrls } from '../api/warm-roku-images.js';

const poster = 'https://cratetelevision.s3.us-east-1.amazonaws.com/p.jpg';
test('unlisted films are skipped, except a watch party film', () => {
    const urls = warmUrls([
        { key: 'a', poster, isUnlisted: true },
        { key: 'b', poster: poster.replace('p.jpg', 'q.jpg'), isUnlisted: true, isWatchPartyEnabled: true },
        { key: 'c', poster: poster.replace('p.jpg', 'r.jpg') },
    ]);
    assert.equal(urls.some(u => u.includes(encodeURIComponent('p.jpg'))), false);
    assert.equal(urls.some(u => u.includes(encodeURIComponent('q.jpg'))), true);
    assert.equal(urls.some(u => u.includes(encodeURIComponent('r.jpg'))), true);
});
