import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonFor, applySeason, type Season } from '../components/seasonalAvatars.js';

const d = (m: number, day: number) => new Date(2026, m - 1, day, 12, 0, 0);

test('each holiday turns on and off on its dates', () => {
    assert.equal(seasonFor(d(10, 23)), null);
    assert.equal(seasonFor(d(10, 24)), 'halloween');
    assert.equal(seasonFor(d(10, 31)), 'halloween');
    assert.equal(seasonFor(d(11, 1)), 'halloween');
    assert.equal(seasonFor(d(11, 2)), null);
    assert.equal(seasonFor(d(12, 9)), null);
    assert.equal(seasonFor(d(12, 10)), 'christmas');
    assert.equal(seasonFor(d(12, 26)), 'christmas');
    assert.equal(seasonFor(d(12, 27)), null);
    assert.equal(seasonFor(d(2, 6)), null);
    assert.equal(seasonFor(d(2, 14)), 'valentines');
    assert.equal(seasonFor(d(2, 15)), null);
    assert.equal(seasonFor(d(3, 9)), null);
    assert.equal(seasonFor(d(3, 17)), 'stpatricks');
    assert.equal(seasonFor(d(3, 18)), null);
    assert.equal(seasonFor(d(7, 4)), null);
});
test('?season= previews a look any day, and off turns it off', () => {
    assert.equal(seasonFor(d(7, 4), 'christmas'), 'christmas');
    assert.equal(seasonFor(d(10, 31), 'off'), null);
    assert.equal(seasonFor(d(7, 4), 'nonsense'), null);
});
test('out of season an avatar is exactly the normal one', () => {
    const svg = '<svg viewBox="0 0 100 100"><circle r="1"/></svg>';
    assert.equal(applySeason(svg, 'fox', null), svg);
});
test('every look is drawn inside the avatar, before its closing tag, and stays well-formed', () => {
    const svg = '<svg viewBox="0 0 100 100"><circle cx="43" cy="55" r="3"/></svg>';
    for (const season of ['halloween', 'christmas', 'valentines', 'stpatricks'] as Season[]) {
        for (const key of ['fox', 'bear', 'cat', 'owl', 'penguin', 'crate', 'crate_fire']) {
            const out = applySeason(svg, key, season);
            assert.ok(out.length > svg.length, `${season}/${key} added something`);
            assert.ok(out.endsWith('</svg>'));
            assert.equal(out.split('</svg>').length, 2);
            const opens = (out.match(/<g[ >]/g) || []).length, closes = (out.match(/<\/g>/g) || []).length;
            assert.equal(opens, closes, `${season}/${key} groups balanced`);
            assert.ok(!/NaN|undefined/.test(out), `${season}/${key} has no NaN`);
        }
    }
});
test('Valentine heart eyes sit on each animal\'s eyes', () => {
    const out = applySeason('<svg></svg>', 'owl', 'valentines');
    assert.ok(out.includes('M 38 ') && out.includes('M 62 '));
});
