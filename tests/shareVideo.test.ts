import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clipStart, pickRecorderType, isPlainVideoUrl, parseTimecode, formatTimecode } from '../api/_lib/shareVideo';

test('clipStart uses the trailer start but keeps the clip inside the trailer', () => {
    assert.equal(clipStart(12, 90, 10), 12);
    assert.equal(clipStart(undefined, 90, 10), 0);
    assert.equal(clipStart(85, 90, 10), 80);
    assert.equal(clipStart(5, 8, 10), 0);
    assert.equal(clipStart(-3, 90, 10), 0);
    assert.equal(clipStart(20, NaN, 10), 20);
});
test('pickRecorderType prefers mp4, falls back to webm, or says none', () => {
    assert.deepEqual(pickRecorderType(() => true), { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' });
    assert.equal(pickRecorderType(m => m.startsWith('video/webm'))?.ext, 'webm');
    assert.equal(pickRecorderType(() => false), null);
});
test('isPlainVideoUrl rejects youtube, vimeo and blanks', () => {
    assert.equal(isPlainVideoUrl('https://bucket.s3.amazonaws.com/t.mp4'), true);
    assert.equal(isPlainVideoUrl('https://www.youtube.com/watch?v=1'), false);
    assert.equal(isPlainVideoUrl('https://vimeo.com/123'), false);
    assert.equal(isPlainVideoUrl(''), false);
    assert.equal(isPlainVideoUrl(undefined), false);
});
test('timecodes read and print the way people type them', () => {
    assert.equal(parseTimecode('1:30'), 90);
    assert.equal(parseTimecode('90'), 90);
    assert.equal(parseTimecode(' 01:02:03 '), 3723);
    assert.equal(parseTimecode(''), null);
    assert.equal(parseTimecode('abc'), null);
    assert.equal(parseTimecode('1:2:3:4'), null);
    assert.equal(formatTimecode(90), '1:30');
    assert.equal(formatTimecode(3723), '1:02:03');
    assert.equal(formatTimecode(-5), '0:00');
});
