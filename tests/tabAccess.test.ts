import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveTabs, grantAllows, MASTER_ONLY_TABS } from '../api/_lib/tabAccess.js';

test('a staff grant opens only the tabs the owner switched on', () => {
    assert.deepEqual(effectiveTabs(['movies']).sort(), ['bulkUpload', 'movies']);
    assert.equal(grantAllows(['movies'], ['email']), false);
    assert.equal(grantAllows(['movies'], ['subscribers', 'email']), false);
    assert.equal(grantAllows(['email'], ['subscribers', 'email']), true);
});

test('no grant, or junk, opens nothing', () => {
    assert.equal(grantAllows(undefined, ['email']), false);
    assert.equal(grantAllows(null, ['email']), false);
    assert.equal(grantAllows([], ['email']), false);
    assert.equal(grantAllows('email', ['email']), false);
    assert.equal(grantAllows([42, {}], ['email']), false);
});

test('master-only tabs can never be opened by a staff grant, even if saved in Firestore', () => {
    for (const t of MASTER_ONLY_TABS) {
        assert.equal(grantAllows([t], [t]), false, t);
    }
});

test('old tab names keep working under their new tab', () => {
    assert.equal(grantAllows(['mail'], ['email']), true);
    assert.equal(grantAllows(['pipeline'], ['submissions']), true);
    // legacy names that now live in a master-only tab stay closed
    assert.equal(grantAllows(['payouts'], ['money']), false);
    assert.equal(grantAllows(['audit'], ['system']), false);
});

test('Submissions also opens actor approvals; Films also opens bulk upload', () => {
    assert.equal(grantAllows(['submissions'], ['actors']), true);
    assert.equal(grantAllows(['movies'], ['bulkUpload']), true);
    assert.equal(grantAllows(['actors'], ['submissions']), false);
});
