import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHeldBackCategory, explainPlacement } from '../api/_lib/rokuWhy.js';

test('the Roku skips the same rows the website skips', () => {
    for (const k of ['featured', 'nowStreaming', 'zine', 'editorial', 'vault']) assert.equal(isHeldBackCategory(k, k, false), true);
    assert.equal(isHeldBackCategory('fromNow', 'From Now', false), false);
    assert.equal(isHeldBackCategory('cratemas', 'Cratemas', false), true);
    assert.equal(isHeldBackCategory('cratemas', 'Cratemas', true), false);
});

test('?why= says where a film sits in the rows', () => {
    const cats = { fromNow: { title: 'From Now', movieKeys: ['a'] }, drama: { title: 'Drama', movieKeys: ['b'] } };
    assert.match(explainPlacement('a', cats, {}, false)[0], /row "From Now"/);
    assert.match(explainPlacement('z', cats, {}, false)[0], /not in any row/);
    assert.match(explainPlacement('a', cats, { categories: { hidden: ['fromNow'] } }, false)[0], /switched off for the Roku/);
    assert.ok(explainPlacement('b', cats, { content: { hiddenMovies: ['b'] } }, false).some(n => /hidden films/.test(n)));
});
