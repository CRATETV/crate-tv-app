import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeFileName, slugFor, hlsOutput, jobSettings, partCount, PART_SIZE, minutesFromJob, isAllowedVideoName } from '../api/_lib/videoPipeline';

test('file names become safe for S3 and MediaConvert', () => {
    assert.equal(safeFileName("You Don't Know My Name (FINAL).MOV"), 'You-Don-t-Know-My-Name-FINAL.mov');
    assert.equal(safeFileName('Café Noir.mp4'), 'Cafe-Noir.mp4');
    assert.equal(safeFileName('../../etc/passwd'), 'passwd');
    assert.equal(slugFor("You Don't Know My Name.mov"), 'you-don-t-know-my-name');
});

test('only video files are accepted', () => {
    assert.ok(isAllowedVideoName('a.mov') && isAllowedVideoName('b.MP4'));
    assert.ok(!isAllowedVideoName('c.jpg') && !isAllowedVideoName('d'));
});

test('the streaming version goes in hsl/<name>/ with a main playlist named after the file', () => {
    const o = hlsOutput('cratetelevision', 'us-east-1', 'originals/1700000000000-Rain.mov', 'rain');
    assert.equal(o.destination, 's3://cratetelevision/hsl/rain/');
    assert.equal(o.masterKey, 'hsl/rain/1700000000000-Rain.m3u8');
    assert.equal(o.masterUrl, 'https://cratetelevision.s3.us-east-1.amazonaws.com/hsl/rain/1700000000000-Rain.m3u8');
});

test('job settings match ops/video/convert-film.sh', () => {
    const j = jobSettings('cratetelevision', 'originals/x.mov', 's3://cratetelevision/hsl/x/');
    assert.equal(j.Inputs[0].FileInput, 's3://cratetelevision/originals/x.mov');
    assert.deepEqual(j.OutputGroups[0].Outputs.map(o => o.NameModifier), ['_1080p', '_720p', '_480p', '_360p', '_270p']);
    assert.equal(j.OutputGroups[0].OutputGroupSettings.HlsGroupSettings.SegmentLength, 6);
});

test('quality ladder: every step is well below the one above, same GOP everywhere, 6 s pieces divide evenly', () => {
    const rungs = jobSettings('b', 'k', 's3://b/h/').OutputGroups[0].Outputs;
    const rates = rungs.map(r => r.VideoDescription.CodecSettings.H264Settings.MaxBitrate);
    for (let i = 1; i < rates.length; i++) assert.ok(rates[i] < rates[i - 1] * 0.7, `step ${i} too close to the one above`);
    assert.ok(rates[0] / rates[1] < 2.2 && rates[1] / rates[2] <= 2.2 && rates[2] / rates[3] <= 2.2, 'no big gaps');
    for (const r of rungs) {
        const h = r.VideoDescription.CodecSettings.H264Settings;
        assert.equal(h.GopSizeUnits, 'SECONDS');
        assert.equal(6 % h.GopSize, 0);
    }
});

test('upload pieces and runtime', () => {
    assert.equal(partCount(1), 1);
    assert.equal(partCount(PART_SIZE * 3 + 1), 4);
    assert.equal(minutesFromJob({ OutputGroupDetails: [{ OutputDetails: [{ DurationInMs: 14 * 60_000 + 1 }] }] }), 15);
    assert.equal(minutesFromJob({}), null);
});

import { originalDueForDeletion, KEEP_ORIGINAL_MS } from '../api/_lib/videoPipeline';

test('originals go 7 days after a successful conversion, and only then', () => {
    const now = Date.parse('2026-11-20T12:00:00Z');
    const rec = { status: 'COMPLETE', completedAtMs: now - KEEP_ORIGINAL_MS - 1, source: 'originals/1-Rain.mov' };
    const none = new Set<string>();
    assert.equal(originalDueForDeletion(rec, now, none), true);
    assert.equal(originalDueForDeletion({ ...rec, completedAtMs: now - 6 * 86400_000 }, now, none), false); // too soon
    assert.equal(originalDueForDeletion({ ...rec, status: 'ERROR' }, now, none), false);                    // failed conversion
    assert.equal(originalDueForDeletion({ ...rec, originalDeletedAt: 'x' }, now, none), false);            // already done
    assert.equal(originalDueForDeletion({ ...rec, source: 'Friday/TINO.mov' }, now, none), false);         // not a panel upload
    assert.equal(originalDueForDeletion(rec, now, new Set(['originals/1-Rain.mov'])), false);             // a film still plays it
    assert.equal(originalDueForDeletion({ ...rec, completedAtMs: null }, now, none), false);
});
