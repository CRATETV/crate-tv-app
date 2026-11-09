import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPollInput, voteProblem, tally, percentages } from '../api/_lib/watchPartyPoll';

test('a good question and answers are tidied', () => {
    const r: any = cleanPollInput('  Will Marcus   tell the truth? ', [' Yes ', 'No', '', 'yes']);
    assert.equal(r.ok, true);
    assert.equal(r.question, 'Will Marcus tell the truth?');
    assert.deepEqual(r.options, ['Yes', 'No']); // blanks and repeats dropped
});

test('bad polls are refused in plain words', () => {
    assert.equal((cleanPollInput('', ['a', 'b']) as any).ok, false);
    assert.match((cleanPollInput('Q?', ['a', 'b']) as any).error, /question/i);
    assert.match((cleanPollInput('Who wins?', ['only one']) as any).error, /two/);
    assert.match((cleanPollInput('Who wins?', ['a', 'b', 'c', 'd', 'e']) as any).error, /at most 4/);
    assert.match((cleanPollInput('x'.repeat(141), ['a', 'b']) as any).error, /140/);
    assert.equal((cleanPollInput('Who wins?', 'nope' as any) as any).ok, false);
});

test('voting only works while the poll is open and for a real answer', () => {
    const poll = { id: 'p1', options: ['Yes', 'No'], status: 'open' as const };
    assert.equal(voteProblem(poll, 0), null);
    assert.equal(voteProblem(poll, 1), null);
    assert.match(voteProblem(poll, 2)!, /Pick one/);
    assert.match(voteProblem(poll, -1)!, /Pick one/);
    assert.match(voteProblem(poll, '1')!, /Pick one/);
    assert.match(voteProblem({ ...poll, status: 'closed' }, 0)!, /closed/);
    assert.match(voteProblem(null, 0)!, /no poll/);
});

test('the tally counts only this poll, and ignores junk', () => {
    const votes = [
        { pollId: 'p1', option: 0 }, { pollId: 'p1', option: 0 }, { pollId: 'p1', option: 1 },
        { pollId: 'old', option: 1 }, { pollId: 'p1', option: 9 }, { pollId: 'p1', option: 'x' }, {},
    ];
    assert.deepEqual(tally(votes, 'p1', 2), [2, 1]);
});

test('percentages always add up to 100', () => {
    assert.deepEqual(percentages([0, 0]), [0, 0]);
    assert.deepEqual(percentages([1, 1, 1]).reduce((s, n) => s + n, 0), 100);
    assert.deepEqual(percentages([3, 1]), [75, 25]);
    assert.equal(percentages([5, 3, 2, 1]).reduce((s, n) => s + n, 0), 100);
});
