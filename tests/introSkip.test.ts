import { test } from 'node:test';
import assert from 'node:assert/strict';
import { introWindow, inIntro } from '../api/_lib/introSkip';

test('nothing set: no button', () => {
    assert.equal(introWindow({}, {}), null);
    assert.equal(introWindow(null, null), null);
    assert.equal(introWindow({ introEnd: 0 }, { introEnd: 0 }), null);
});

test('series intro applies to every episode; an episode can set its own', () => {
    assert.deepEqual(introWindow({ introEnd: 45 }, {}), { start: 0, end: 45 });
    assert.deepEqual(introWindow({ introStart: 5, introEnd: 45 }, { introEnd: 0 }), { start: 5, end: 45 });
    assert.deepEqual(introWindow({ introEnd: 45 }, { introStart: 2, introEnd: 30 }), { start: 2, end: 30 });
});

test('bad numbers are ignored', () => {
    assert.equal(introWindow({ introEnd: -5 }, {}), null);
    assert.equal(introWindow({ introEnd: NaN }, {}), null);
    assert.equal(introWindow({ introStart: 50, introEnd: 40 }, {}), null);
    assert.equal(introWindow({ introEnd: '45' as any }, {}), null);
});

test('button shows during the intro only', () => {
    const w = { start: 5, end: 45 };
    assert.equal(inIntro(w, 0), false);
    assert.equal(inIntro(w, 5), true);
    assert.equal(inIntro(w, 30), true);
    assert.equal(inIntro(w, 44.5), false);
    assert.equal(inIntro(w, 60), false);
    assert.equal(inIntro(null, 10), false);
});
