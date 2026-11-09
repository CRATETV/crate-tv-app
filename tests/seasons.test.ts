import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inWindow, daysLeft, activeSeason, normalizeSeasons, legacySeason, currentSeason, Season } from '../api/_lib/seasons';

const mk = (o: Partial<Season>): Season => ({ id: 'a', name: 'A', theme: 'christmas', start: '12-01', end: '12-31', mode: 'auto', movieKeys: [], ...o });
const at = (iso: string) => new Date(iso);

test('window is inclusive and handles the new-year wrap', () => {
    assert.equal(inWindow('12-01', '12-01', '12-31'), true);
    assert.equal(inWindow('12-31', '12-01', '12-31'), true);
    assert.equal(inWindow('11-30', '12-01', '12-31'), false);
    assert.equal(inWindow('01-02', '12-20', '01-05'), true);
    assert.equal(inWindow('06-01', '12-20', '01-05'), false);
    assert.equal(inWindow('06-01', 'bad', '01-05'), false);
});
test('active season follows the calendar in Eastern time', () => {
    const s = [mk({})];
    assert.equal(activeSeason(s, at('2026-12-10T12:00:00-05:00'))?.id, 'a');
    assert.equal(activeSeason(s, at('2026-11-09T12:00:00-05:00')), null);
    // 11 PM Eastern on Nov 30 is already Dec 1 in UTC but still Nov 30 here
    assert.equal(activeSeason(s, at('2026-12-01T04:00:00Z')), null);
});
test('mode on always shows, off never does', () => {
    assert.equal(activeSeason([mk({ mode: 'on' })], at('2026-07-01T12:00:00-04:00'))?.id, 'a');
    assert.equal(activeSeason([mk({ mode: 'off' })], at('2026-12-10T12:00:00-05:00')), null);
});
test('days left counts today and the last day', () => {
    assert.equal(daysLeft(at('2026-12-31T12:00:00-05:00'), '12-01', '12-31'), 1);
    assert.equal(daysLeft(at('2026-12-24T12:00:00-05:00'), '12-01', '12-31'), 8);
    assert.equal(daysLeft(at('2026-12-28T12:00:00-05:00'), '12-20', '01-05'), 9);
    assert.equal(daysLeft(at('2026-11-09T12:00:00-05:00'), '12-01', '12-31'), 0);
});
test('normalize drops junk and fills gaps', () => {
    const r = normalizeSeasons([null, { id: '' }, { id: 'x', theme: 'nope', start: '13-40', movieKeys: ['k', 5] }]);
    assert.equal(r.length, 1);
    assert.equal(r[0].theme, 'generic');
    assert.equal(r[0].start, '01-01');
    assert.deepEqual(r[0].movieKeys, ['k']);
    assert.deepEqual(normalizeSeasons('x'), []);
});
test('old holiday switch still works as a season', () => {
    assert.equal(legacySeason({ isHolidayModeActive: false }, []), null);
    const l = legacySeason({ isHolidayModeActive: true, holidayName: 'Cratemas', holidayTheme: 'christmas' }, ['m1'])!;
    assert.deepEqual([l.name, l.theme, l.movieKeys], ['Cratemas', 'christmas', ['m1']]);
    assert.equal(currentSeason({ isHolidayModeActive: true }, ['m1'], at('2026-07-01T12:00:00-04:00'))?.id, 'cratemas');
    assert.equal(currentSeason({ seasons: [mk({ id: 'xm' })], isHolidayModeActive: true }, [], at('2026-12-10T12:00:00-05:00'))?.id, 'xm');
    assert.equal(currentSeason({}, [], at('2026-12-10T12:00:00-05:00')), null);
});
