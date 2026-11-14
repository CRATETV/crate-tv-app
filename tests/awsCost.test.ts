import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAwsCost, friendlyAwsError } from '../api/_lib/awsCost.js';

const row = (service: string, kind: string, amount: string) => ({ Keys: [service, kind], Metrics: { UnblendedCost: { Amount: amount } } });
const OCT = { TimePeriod: { Start: '2026-10-01' }, Groups: [row('Amazon Simple Storage Service', 'Usage', '30.00'), row('Amazon CloudFront', 'Usage', '10.00'), row('Amazon Simple Storage Service', 'Credit', '-40.00')] };
const NOV = { TimePeriod: { Start: '2026-11-01' }, Groups: [row('Amazon Simple Storage Service', 'Usage', '12.00'), row('Amazon CloudFront', 'Usage', '3.00'), row('Tax', 'Tax', '0.50'), row('Amazon Simple Storage Service', 'Credit', '-15.50')] };

test('charges, credits and what is owed are kept apart', () => {
    const s = summarizeAwsCost([OCT, NOV], new Date('2026-11-13T15:00:00Z'))!;
    assert.deepEqual(s.thisMonth, { month: '2026-11', charges: 15.5, credits: 15.5, owed: 0 });
    assert.deepEqual(s.lastMonth, { month: '2026-10', charges: 40, credits: 40, owed: 0 });
});
test('storage (S3) is pulled out and services are biggest first', () => {
    const s = summarizeAwsCost([OCT, NOV], new Date('2026-11-13T15:00:00Z'))!;
    assert.equal(s.storage, 12);
    assert.equal(s.storageLastMonth, 30);
    assert.equal(s.services[0].name, 'Amazon Simple Storage Service');
});
test('month estimate uses finished days only (AWS is a day behind)', () => {
    const s = summarizeAwsCost([OCT, NOV], new Date('2026-11-13T15:00:00Z'))!;
    assert.equal(s.estimateCharges, Math.round(15.5 / 12 * 30 * 100) / 100);
});
test('no estimate in the first days of a month', () => {
    assert.equal(summarizeAwsCost([OCT, NOV], new Date('2026-11-02T15:00:00Z'))!.estimateCharges, null);
});
test('credits smaller than charges leave a real amount owed', () => {
    const r = { TimePeriod: { Start: '2026-11-01' }, Groups: [row('Amazon Simple Storage Service', 'Usage', '20'), row('Amazon Simple Storage Service', 'Credit', '-5')] };
    assert.equal(summarizeAwsCost([r], new Date('2026-11-13T00:00:00Z'))!.thisMonth.owed, 15);
});
test('empty answer is null, and errors come out in plain words', () => {
    assert.equal(summarizeAwsCost([], new Date()), null);
    assert.match(friendlyAwsError({ name: 'AccessDeniedException', message: 'x' }), /ce:GetCostAndUsage/);
    assert.match(friendlyAwsError({ name: 'DataUnavailableException' }), /Launch Cost Explorer/);
});
