import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countOpenHelp } from '../api/_lib/mailBadge.js';

test('a help request counts until it has a status or is deleted', () => {
    assert.equal(countOpenHelp(['a', 'b', 'c'], [], []), 3);
    assert.equal(countOpenHelp(['a', 'b', 'c'], ['help_a'], []), 2);   // replied / solved
    assert.equal(countOpenHelp(['a', 'b', 'c'], [], ['help_b']), 2);   // deleted from the inbox
    assert.equal(countOpenHelp(['a', 'b', 'c'], ['help_a'], ['help_b', 'help_c']), 0);
});

test('other messages in the status or hidden lists do not matter', () => {
    assert.equal(countOpenHelp(['a'], ['some-email-id'], ['inquiry_9']), 1);
});
