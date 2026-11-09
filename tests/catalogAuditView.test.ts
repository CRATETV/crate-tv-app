import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditDefaultView } from '../api/_lib/catalogAuditView.js';

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, views: 100 - i, hasStream: true }));

test('shows the top 10 and counts the rest as hidden', () => {
    const r = auditDefaultView(rows(25));
    assert.equal(r.shown.length, 10);
    assert.equal(r.hidden, 15);
    assert.equal(r.shown[0].id, 0);
});

test('a film with a missing video is always shown, even with no views', () => {
    const list = rows(25);
    list[24].hasStream = false;
    const r = auditDefaultView(list);
    assert.equal(r.shown.length, 11);
    assert.equal(r.shown[10].id, 24);   // stays in views order, at the bottom
    assert.equal(r.broken, 1);
    assert.equal(r.hidden, 14);
});

test('a short catalog shows everything', () => {
    const r = auditDefaultView(rows(4));
    assert.deepEqual([r.shown.length, r.hidden], [4, 0]);
});
