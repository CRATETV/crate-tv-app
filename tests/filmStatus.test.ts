import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filmStatus, groupCounts } from '../api/_lib/filmStatus';

const NOW = Date.parse('2026-10-29T14:00:00Z');
const cats = { a: { title: 'New Releases', movieKeys: ['live'] }, b: { title: 'Comedy', movieKeys: ['live', 'x'] } };

test('a listed film in a row is live and says which rows', () => {
    const s = filmStatus('live', { key: 'live' }, cats, [], NOW);
    assert.equal(s.headline, 'Live on CRATE');
    assert.equal(s.tone, 'green');
    assert.deepEqual(s.rows, ['New Releases', 'Comedy']);
    assert.ok(s.groups.includes('live'));
});

test('listed but in no row is flagged', () => {
    const s = filmStatus('lonely', {}, cats, [], NOW);
    assert.equal(s.headline, 'Live, but not in any row');
    assert.ok(s.groups.includes('norow'));
});

test('Unlisted switch explains itself', () => {
    const s = filmStatus('h', { isUnlisted: true }, cats, [], NOW);
    assert.match(s.headline, /Unlisted/);
    assert.ok(s.groups.includes('hidden'));
});

test('future release date is coming soon, not live', () => {
    const s = filmStatus('f', { releaseDateTime: '2026-12-01T00:00:00Z' }, cats, [], NOW);
    assert.equal(s.headline, 'Coming soon');
    assert.ok(s.groups.includes('soon') && !s.groups.includes('live'));
});

test('the "Just Now" case: premiere + festival block that does not release to the catalog', () => {
    const days = [{ day: 1, blocks: [{ title: 'Opening Night', movieKeys: ['jn'], releaseAfterScreening: false }] }];
    const movie = { isUnlisted: true, isWatchPartyEnabled: true, watchPartyStartTime: '2026-11-13T23:00:00Z' };
    const s = filmStatus('jn', movie, cats, days, NOW);
    assert.match(s.headline, /Festival only/);
    assert.match(s.detail, /Release films to the regular catalog/);
    assert.ok(s.groups.includes('festival') && s.groups.includes('premiere') && s.groups.includes('hidden'));
});

test('festival block that releases after the screening says it will appear by itself', () => {
    const days = [{ day: 1, blocks: [{ title: 'Block A', movieKeys: ['jn'], releaseAfterScreening: true }] }];
    const s = filmStatus('jn', { isUnlisted: true }, cats, days, NOW);
    assert.match(s.headline, /until its festival screening ends/);
});

test('an ended festival block no longer explains the hiding', () => {
    const days = [{ day: 1, blocks: [{ title: 'Block A', movieKeys: ['jn'], festivalEndTime: '2026-10-01T00:00:00Z' }] }];
    const s = filmStatus('jn', { isUnlisted: true }, cats, days, NOW);
    assert.match(s.headline, /Unlisted/);
});

test('premiere on a hidden film (no festival) is hidden until its premiere', () => {
    const s = filmStatus('p', { isUnlisted: true, isWatchPartyEnabled: true, watchPartyStartTime: '2026-11-13T23:00:00Z' }, cats, [], NOW);
    assert.equal(s.headline, 'Hidden until its premiere');
});

test('partner festival films are shown on the partner page only', () => {
    const days = [{ day: 1, partnerId: 'acme', blocks: [{ title: 'Acme Night', movieKeys: ['q'] }] }];
    const s = filmStatus('q', { isUnlisted: true }, cats, days, NOW);
    assert.match(s.headline, /partner festival page/);
});

test('hide-automatically date: passed means taken down, future is a chip', () => {
    assert.equal(filmStatus('t', { availableUntil: '2026-10-01T00:00:00Z' }, cats, [], NOW).headline, 'Taken down automatically');
    const later = filmStatus('t', { availableUntil: '2026-11-16T04:59:00Z' }, cats, [], NOW);
    assert.ok(later.tags.some(t => t.label.startsWith('Hides itself')));
});

test('series chip counts episodes; counts add up per group', () => {
    const a = filmStatus('live', { isSeries: true, episodes: [{}, {}, {}] }, cats, [], NOW);
    assert.ok(a.tags.some(t => t.label === 'Series · 3 episodes'));
    const b = filmStatus('h', { isUnlisted: true }, cats, [], NOW);
    const c = groupCounts([a, b]);
    assert.equal(c.live, 1); assert.equal(c.hidden, 1); assert.equal(c.series, 1);
});
