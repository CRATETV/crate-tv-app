import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deletionBlocker } from '../api/_lib/partners';
import { PWFF_PARTNER_ID } from '../api/_lib/partnerRules';

test('a test festival with no sales can be deleted', () => {
    assert.equal(deletionBlocker({ id: 'test-fest' }, []), null);
});

test('free and promo-code tickets do not block deleting', () => {
    assert.equal(deletionBlocker({ id: 'test-fest' }, [{ amountPaid: 0 }, { amountPaid: undefined }]), null);
});

test('a refunded paid ticket does not block deleting', () => {
    assert.equal(deletionBlocker({ id: 'test-fest' }, [{ amountPaid: 10, refunded: true }]), null);
});

test('an unrefunded paid ticket blocks deleting', () => {
    const why = deletionBlocker({ id: 'real-fest' }, [{ amountPaid: 10 }, { amountPaid: 5, refunded: true }]);
    assert.match(why || '', /1 paid ticket was sold/);
});

test('PWFF can never be deleted this way', () => {
    assert.match(deletionBlocker({ id: PWFF_PARTNER_ID }, []) || '', /PWFF/);
});
