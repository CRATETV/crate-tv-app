// Audience Choice voting and the "Who's watching" map. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { votingState, votingWindow, tallyVotes, cityFromHeaders, cityKey, mapPosition, summarizeCities } from '../api/_lib/audienceRules.js';

const DAY = 864e5;
const WEEK = 7 * DAY;

test('voting opens at the screening and closes when the rewatch week ends', () => {
    const block = { screeningStartTime: '2027-08-20T23:00:00Z' };
    const start = Date.parse(block.screeningStartTime);
    assert.equal(votingState(block, WEEK, start - 60_000), 'not-open');
    assert.equal(votingState(block, WEEK, start + 60_000), 'open');
    assert.equal(votingState(block, WEEK, start + 7.5 * DAY), 'open');
    assert.equal(votingState(block, WEEK, start + 9 * DAY), 'closed');
    assert.equal(votingState({}, WEEK, start), 'no-date');
    // A block that ended later counts its week from the end.
    const w = votingWindow({ ...block, festivalEndTime: '2027-08-21T02:00:00Z' }, WEEK)!;
    assert.equal(w.closesMs, Date.parse('2027-08-21T02:00:00Z') + WEEK + DAY);
});

test('votes are tallied per film, films without votes still listed, ties reported', () => {
    const t = tallyVotes(['a', 'b', 'c'], [{ movieKey: 'a' }, { movieKey: 'b' }, { movieKey: 'a' }, { movieKey: 'zzz' }]);
    assert.equal(t.total, 3); // a vote for a film not in the block is ignored
    assert.deepEqual(t.results.map(r => [r.movieKey, r.votes]), [['a', 2], ['b', 1], ['c', 0]]);
    assert.deepEqual(t.leaders, ['a']);
    assert.equal(t.results[0].share, 66.7);
    assert.deepEqual(tallyVotes(['a', 'b'], [{ movieKey: 'a' }, { movieKey: 'b' }]).leaders, ['a', 'b']);
    assert.deepEqual(tallyVotes(['a', 'b'], []).leaders, []);
});

test('the map only ever keeps a rounded city-level location', () => {
    const h: Record<string, string> = {
        'x-vercel-ip-city': 'Philadelphia', 'x-vercel-ip-country': 'US', 'x-vercel-ip-country-region': 'PA',
        'x-vercel-ip-latitude': '39.95258', 'x-vercel-ip-longitude': '-75.16522',
    };
    const c = cityFromHeaders(n => h[n] ?? null)!;
    assert.deepEqual(c, { city: 'Philadelphia', region: 'PA', country: 'US', lat: 40, lng: -75.2 });
    assert.equal(cityKey(c), 'us_pa_philadelphia');
    assert.equal(cityFromHeaders(n => (n === 'x-vercel-ip-country' ? 'US' : null)), null); // no coordinates → not counted
    const sp = cityFromHeaders(n => ({ ...h, 'x-vercel-ip-city': 'S%C3%A3o%20Paulo' } as Record<string, string>)[n] ?? null)!;
    assert.equal(sp.city, 'São Paulo');
});

test('cities land in the right place on the map', () => {
    const philly = mapPosition(40, -75.2);
    const tobago = mapPosition(11.2, -60.7);
    const london = mapPosition(51.5, -0.1);
    assert.ok(philly.xPct > 25 && philly.xPct < 32 && philly.yPct > 25 && philly.yPct < 35);
    assert.ok(tobago.yPct > philly.yPct && tobago.xPct > philly.xPct); // south-east of Philly
    assert.ok(london.xPct > 49 && london.xPct < 51 && london.yPct < philly.yPct);
    const s = summarizeCities([
        { city: 'Philadelphia', region: 'PA', country: 'US', lat: 40, lng: -75.2, viewers: 12 },
        { city: 'Scarborough', region: 'TOB', country: 'TT', lat: 11.2, lng: -60.7, viewers: 4 },
    ]);
    assert.deepEqual([s.cities, s.countries, s.viewers, s.top[0].city], [2, 2, 16, 'Philadelphia']);
});
