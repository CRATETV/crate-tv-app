import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friendlyTicketLabel, collapseTickets } from '../api/_lib/helpTicketLabels.js';

test('raw codes become words and keep the code in brackets', () => {
    assert.match(friendlyTicketLabel('block_1781650941844'), /no longer on the schedule \(block_1781650941844\)/);
    assert.match(friendlyTicketLabel('movie_1793373848571'), /no title on file \(movie_1793373848571\)/);
});
test('real titles are left alone and empty ones are named', () => {
    assert.equal(friendlyTicketLabel('You Don’t Know My Name'), 'You Don’t Know My Name');
    assert.equal(friendlyTicketLabel(''), 'Unknown ticket');
});
test('five identical tickets become one line counted five', () => {
    const t = Array.from({ length: 5 }, () => ({ label: 'X', status: 'needs-person' }));
    const c = collapseTickets([{ label: 'A', status: 'ok' }, ...t]);
    assert.equal(c.length, 2);
    assert.equal(c[1].count, 5);
    assert.equal(c[0].count, 1);
});
test('same label with a different status stays separate', () => {
    assert.equal(collapseTickets([{ label: 'A', status: 'ok' }, { label: 'A', status: 'ended' }]).length, 2);
});
