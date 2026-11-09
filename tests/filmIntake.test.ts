import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIntakeLines, intakeState } from '../api/_lib/filmIntake.js';

const films = [
    { key: 'a', title: 'The Mirror Dance' },
    { key: 'b', title: 'You Don’t Know My Name' },
    { key: 'c', title: 'Neighbors' },
];

test('parses one film per line, with optional filmmaker, bullets and duplicates', () => {
    const r = parseIntakeLines('1. Mirror Dance - Jane Doe\n\n- Neighbors | Sam Lee\nneighbors\nBig Fish — A. Person', 'PWFF 2026');
    assert.deepEqual(r.map(x => [x.title, x.filmmaker, x.festival]), [
        ['Mirror Dance', 'Jane Doe', 'PWFF 2026'],
        ['Neighbors', 'Sam Lee', 'PWFF 2026'],
        ['Big Fish', 'A. Person', 'PWFF 2026'],
    ]);
});

test('a hyphen inside a title is not a separator', () => {
    assert.equal(parseIntakeLines('Spider-Man Returns')[0].title, 'Spider-Man Returns');
});

test('exact title in the catalog ticks itself, ignoring "The" and apostrophes', () => {
    assert.equal(intakeState({ title: 'Mirror Dance' }, films).state, 'done');
    assert.equal(intakeState({ title: "You Don't Know My Name" }, films).state, 'done');
});

test('an unrelated film stays on the list', () => {
    assert.deepEqual(intakeState({ title: 'Big Fish' }, films), { state: 'todo' });
});

test('manual tick works when the film is not in the catalog (yet)', () => {
    const s = intakeState({ title: 'Big Fish', manualDone: true }, films);
    assert.deepEqual(s, { state: 'done', via: 'manual' });
});

test('a near match is only suggested, never auto-ticked', () => {
    const s = intakeState({ title: 'Neighbors Next Door Again' }, [{ key: 'n', title: 'Neighbors Next Door' }]);
    assert.equal(s.state, 'maybe');
});

test('caps the list length', () => {
    const many = Array.from({ length: 500 }, (_, i) => `Film ${i}`).join('\n');
    assert.equal(parseIntakeLines(many).length, 300);
});
