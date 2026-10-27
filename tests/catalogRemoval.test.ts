import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, groupPlan, catalogRemoval } from '../api/_lib/storageCleanup';

const NOW = Date.parse('2026-10-27T03:00:00Z');
const OLD = '2026-01-01T00:00:00Z';
const B = 'https://cratetelevision.s3.us-east-1.amazonaws.com/';
const data: any = {
    movies: {
        visible: { title: 'Visible Film', fullMovie: B + 'films/visible.mp4' },
        quiet: { title: 'Quiet Film', isUnlisted: true, fullMovie: B + 'hsl/quiet/quiet.m3u8' },
        earner: { title: 'Earner', isUnlisted: true, fullMovie: B + 'films/earner.mov' },
        fest: { title: 'Fest Film', isUnlisted: true, fullMovie: B + 'films/fest.mov' },
        partner: { title: 'Partner Film', isUnlisted: true, partnerId: 'p1', fullMovie: B + 'films/partner.mov' },
    },
    festivalData: [{ day: 1, blocks: [{ movieKeys: ['fest'], festivalEndTime: OLD }] }],
};
const earned = { 'Earner': 1500, 'Visible Film': 99 };

test('a hidden film that never earned money can be removed with its video', () => {
    assert.deepEqual(catalogRemoval('quiet', data, earned, NOW), { ok: true });
});

test('films that earned money, are in a festival, are partner films, or are visible stay', () => {
    assert.equal(catalogRemoval('earner', data, earned, NOW).ok, false);
    assert.match((catalogRemoval('earner', data, earned, NOW) as any).why, /earned money/);
    assert.match((catalogRemoval('fest', data, earned, NOW) as any).why, /festival/);
    assert.match((catalogRemoval('partner', data, earned, NOW) as any).why, /partner|in use/);
    assert.equal(catalogRemoval('visible', data, earned, NOW).ok, false);
    assert.match((catalogRemoval('gone', data, earned, NOW) as any).why, /already removed/);
});

test("nothing is removed when the money check couldn't run", () => {
    assert.equal(catalogRemoval('quiet', data, null, NOW).ok, false);
});

test('clean-up rows know which hidden film they belong to', () => {
    const objects = [
        { Key: 'hsl/quiet/quiet.m3u8', Size: 1, LastModified: OLD },
        { Key: 'hsl/quiet/quiet_1080p_00001.ts', Size: 100, LastModified: OLD },
        { Key: 'films/earner.mov', Size: 500, LastModified: OLD },
        { Key: 'random/unused.mov', Size: 50, LastModified: OLD },
    ];
    const groups = groupPlan(buildPlan(objects, data, NOW).plan);
    const byId = Object.fromEntries(groups.map(g => [g.id, g]));
    assert.equal(byId['hsl/quiet/'].filmKey, 'quiet');
    assert.equal(byId['films/earner.mov'].filmKey, 'earner');
    assert.equal(byId['random/unused.mov'].filmKey, undefined);
});
