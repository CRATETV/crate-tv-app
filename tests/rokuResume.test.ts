import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumeSeconds, annotateResume } from '../api/_lib/rokuResume';

test('resume point', () => {
    assert.equal(resumeSeconds(600, 30), 600);
    assert.equal(resumeSeconds(5, 30), 0);            // barely started
    assert.equal(resumeSeconds(1750, 30), 0);         // within the last 2 minutes of a 30 min film
    assert.equal(resumeSeconds(600, 30, true), 0);    // already watched
    assert.equal(resumeSeconds(600, undefined), 600); // unknown runtime still resumes
    assert.equal(resumeSeconds('x', 30), 0);
});
test('annotates started films only', () => {
    const items: any[] = [{ id: 'a', durationInMinutes: 30 }, { id: 'b' }, { id: 'c' }, {}];
    assert.equal(annotateResume(items, { a: 300, c: 4 }, []), 1);
    assert.equal(items[0].resumePosition, 300);
    assert.equal(items[1].resumePosition, undefined);
    assert.equal(annotateResume(items, undefined), 0);
});
