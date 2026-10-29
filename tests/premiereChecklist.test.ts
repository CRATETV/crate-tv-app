import { test } from 'node:test';
import assert from 'node:assert/strict';
import { premiereReadiness, countdownText } from '../api/_lib/premiereChecklist';

const NOW = Date.parse('2026-10-29T14:00:00Z');
const ready = {
    fullMovie: 'https://b/hsl/ydkmn/ydkmn.m3u8', poster: 'p', tvPoster: 't', trailer: 'tr', synopsis: 's', director: 'd', durationInMinutes: 95,
    isWatchPartyEnabled: true, watchPartyStartTime: '2026-11-14T00:30:00Z', isWatchPartyPaid: true, watchPartyPrice: 5,
    isForSale: true, salePrice: 5, availableUntil: '2026-11-16T04:59:00Z', isUnlisted: true,
};

test('a fully set up premiere is ready, and says when it starts (New York time)', () => {
    const r = premiereReadiness(ready, NOW);
    assert.equal(r.ready, true);
    assert.equal(r.done, r.total);
    assert.match(r.items.find(i => i.id === 'party')!.detail, /Fri, Nov 13 at 7:30 PM/);
});

test('an empty film lists everything that is missing', () => {
    const r = premiereReadiness({}, NOW);
    assert.equal(r.ready, false);
    const todo = r.items.filter(i => i.state === 'todo').map(i => i.id);
    for (const id of ['party', 'video', 'poster', 'tvposter', 'runtime', 'words', 'weekend', 'takedown']) assert.ok(todo.includes(id), id);
});

test('an unconverted file (mov/mp4) is flagged', () => {
    const r = premiereReadiness({ ...ready, fullMovie: 'https://b/films/ydkmn.mov' }, NOW);
    assert.equal(r.items.find(i => i.id === 'video')!.state, 'todo');
});

test('hide time before the premiere is flagged; missing is flagged', () => {
    assert.equal(premiereReadiness({ ...ready, availableUntil: '2026-11-01T00:00:00Z' }, NOW).items.find(i => i.id === 'takedown')!.state, 'todo');
    assert.equal(premiereReadiness({ ...ready, availableUntil: '' }, NOW).items.find(i => i.id === 'takedown')!.state, 'todo');
});

test('paid party without a price is flagged; pay-what-you-want and free are fine', () => {
    assert.equal(premiereReadiness({ ...ready, watchPartyPrice: 0 }, NOW).items.find(i => i.id === 'ticket')!.state, 'todo');
    assert.equal(premiereReadiness({ ...ready, watchPartyPrice: 0, watchPartyPayWhatYouWant: true }, NOW).ready, true);
    assert.equal(premiereReadiness({ ...ready, isWatchPartyPaid: false }, NOW).ready, true);
});

test('party switched off or time passed is flagged', () => {
    assert.match(premiereReadiness({ ...ready, isWatchPartyEnabled: false }, NOW).items.find(i => i.id === 'party')!.detail, /switched off/);
    assert.match(premiereReadiness(ready, Date.parse('2026-11-15T00:00:00Z')).items.find(i => i.id === 'party')!.detail, /already passed/);
});

test('countdown text', () => {
    assert.equal(countdownText(null), '');
    assert.equal(countdownText(-5), 'started');
    assert.equal(countdownText(15 * 86400_000 + 3 * 3600_000), '15 days, 3 hours');
    assert.equal(countdownText(2 * 3600_000 + 5 * 60_000), '2 hours, 5 minutes');
    assert.equal(countdownText(30_000), '1 minute');
});
