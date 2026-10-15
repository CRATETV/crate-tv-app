// The alert robot's rules (api/_lib/healthRules.ts). Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    decideStuckParty, recoveredTicketRecord, recoveredTicketDocId, isViewerSide, explainError,
    groupErrors, errorItems, shouldSend, reportSubject, reportHtml, HOUR, MINUTE,
} from '../api/_lib/healthRules.js';

const NOW = Date.parse('2026-10-14T22:00:00Z');

test('a party is only ended when it is old AND quiet', () => {
    // 2 hours in: fine
    assert.equal(decideStuckParty({ id: 'a', startedMs: NOW - 2 * HOUR, lastActivityMs: NOW - 2 * HOUR }, NOW), 'ok');
    // 7 hours in, nothing for 7 hours: end it
    assert.equal(decideStuckParty({ id: 'b', startedMs: NOW - 7 * HOUR, lastActivityMs: NOW - 7 * HOUR }, NOW), 'end');
    // 7 hours in, but a film started 1 hour ago (long festival day): only report
    assert.equal(decideStuckParty({ id: 'c', startedMs: NOW - 7 * HOUR, lastActivityMs: NOW - 1 * HOUR }, NOW), 'report');
    // no start time recorded: never guess
    assert.equal(decideStuckParty({ id: 'd', startedMs: null, lastActivityMs: null }, NOW), 'ok');
});

test('a lost ticket sale is rebuilt from its error, never twice', () => {
    const r = recoveredTicketRecord({
        errorId: 'E1', timestampMs: NOW,
        context: { itemId: 'block-1', paymentType: 'block', amountPaid: 10, email: 'a@b.com', note: 'Block 1', promoCode: null, uid: 'u1', partnerId: null },
    });
    assert.ok(r);
    assert.equal(r!.itemId, 'block-1');
    assert.equal(r!.isFestivalBlock, true);
    assert.equal(r!.uid, 'u1');
    assert.equal(r!.partnerId, null);
    assert.equal(recoveredTicketDocId('E1'), 'recovered-E1'); // fixed id = can't duplicate
});

test('a lost sale without enough detail is left for a person', () => {
    assert.equal(recoveredTicketRecord({ errorId: 'E2', timestampMs: NOW, context: null }), null);
    assert.equal(recoveredTicketRecord({ errorId: 'E3', timestampMs: NOW, context: { itemId: 'x', paymentType: 'rental', amountPaid: 5, partnerId: null } }), null);
    // Older errors without partner info: could pay the wrong festival, so no
    assert.equal(recoveredTicketRecord({ errorId: 'E4', timestampMs: NOW, context: { itemId: 'x', paymentType: 'block', amountPaid: 5, email: 'a@b.com' } }), null);
});

test('viewer-side noise is told apart from real site errors', () => {
    assert.equal(isViewerSide({ source: 'client', origin: 'client', message: 'TypeError: Failed to fetch' }), true);
    assert.equal(isViewerSide({ source: 'client', origin: 'client', message: 'Loading chunk 12 failed' }), true);
    assert.equal(isViewerSide({ source: 'api/x', origin: 'server', message: 'Failed to fetch' }), false); // the server failing is real
    assert.match(explainError({ source: 'client', origin: 'client', message: 'Loading chunk 3 failed' }).todo, /Nothing/);
    assert.match(explainError({ source: 'api/login', origin: 'server', message: 'Missing or insufficient permissions' }).meaning, /log in/);
});

test('errors are grouped and only alert past the thresholds', () => {
    const fetchFail = { source: 'client', origin: 'client', message: 'Failed to fetch' };
    const siteErr = { source: 'api/roku-feed', origin: 'server', message: 'Cannot read properties of undefined' };
    assert.deepEqual(groupErrors([fetchFail, fetchFail, siteErr]).map(g => g.count), [2, 1]);
    // A few viewer hiccups: silence
    assert.equal(errorItems(Array(10).fill(fetchFail), 20).length, 0);
    // Lots of them: one warning
    assert.equal(errorItems(Array(40).fill(fetchFail), 20)[0].key, 'errors:viewer');
    // 5 site errors: warning naming the source
    assert.equal(errorItems(Array(5).fill(siteErr), 20)[0].key, 'errors:site:api/roku-feed');
    // One permission error is already critical
    const perm = errorItems([{ source: 'api/x', origin: 'server', message: 'PERMISSION_DENIED' }], 20);
    assert.equal(perm[0].severity, 'critical');
});

test('the same unfixed problem is not emailed every 15 minutes', () => {
    const open = { key: 'k', severity: 'warning' as const, summary: '', detail: '' };
    assert.equal(shouldSend(open, undefined, NOW), true);
    assert.equal(shouldSend(open, NOW - 15 * MINUTE, NOW), false);
    assert.equal(shouldSend(open, NOW - 7 * HOUR, NOW), true);
    assert.equal(shouldSend({ ...open, severity: 'fixed' }, NOW - MINUTE, NOW), true); // fixes are always reported
});

test('the report reads clearly and is safe to put in an email', () => {
    assert.match(reportSubject([]), /all clear/);
    assert.match(reportSubject([{ key: 'a', severity: 'fixed', summary: '', detail: '' }]), /fixed automatically/);
    assert.match(reportSubject([{ key: 'a', severity: 'critical', summary: '', detail: '' }, { key: 'b', severity: 'fixed', summary: '', detail: '' }]), /🚨.*1 needs a look, 1 fixed/);
    const html = reportHtml([{ key: 'x', severity: 'warning', summary: '<script>alert(1)</script>', detail: 'd', todo: 't' }], 'now');
    assert.ok(!html.includes('<script>'));
    assert.match(html, /What to do/);
});
