// Festival help button — what the self-service helper may fix. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseTicket, ownedTickets, maskEmail, pwffWindowOf, HelpBlockInfo, HelpTicket } from '../api/_lib/festivalHelpRules.js';

const DAY = 864e5;
const WEEK = 7 * DAY;
const now = Date.parse('2027-08-21T12:00:00Z');
const blocks = new Map<string, HelpBlockInfo>([
    ['b1', { id: 'b1', title: 'Opening Night', screeningStartTime: '2027-08-20T23:00:00Z' }],
    ['old', { id: 'old', title: 'Last Year', screeningStartTime: '2026-08-20T23:00:00Z' }],
]);
const pwff = pwffWindowOf([{ screeningStartTime: '2027-08-20T23:00:00Z' }, { screeningStartTime: '2027-08-22T23:00:00Z' }]);
const ctx = { nowMs: now, rewatchWindowMs: WEEK, blocks, pwff };
const t = (p: Partial<HelpTicket>): HelpTicket => ({ id: 't', uid: 'u1', purchasedAtMs: Date.parse('2027-07-01T00:00:00Z'), ...p });

test('a paid block ticket with missing access is restored with the purchase expiry', () => {
    const r = diagnoseTicket(t({ itemId: 'b1', paymentType: 'block' }), {}, ctx);
    assert.equal(r.action.kind, 'grant-block');
    if (r.action.kind === 'grant-block') assert.ok(Date.parse(r.action.expiresAt) >= Date.parse('2027-08-20T23:00:00Z') + WEEK);
    assert.equal(r.label, 'Opening Night');
});

test('access that is already there is left alone', () => {
    const far = new Date(Date.parse('2027-08-20T23:00:00Z') + 9 * DAY).toISOString();
    assert.equal(diagnoseTicket(t({ itemId: 'b1', paymentType: 'block' }), { unlockedBlocks: { b1: far } }, ctx).action.kind, 'ok');
});

test('never re-opens a ticket whose viewing window has ended', () => {
    const r = diagnoseTicket(t({ itemId: 'old', paymentType: 'block', purchasedAtMs: Date.parse('2026-08-01T00:00:00Z') }), {}, ctx);
    assert.equal(r.action.kind, 'ended');
});

test('refunded or revoked tickets and film rentals always go to a person', () => {
    assert.equal(diagnoseTicket(t({ itemId: 'b1', paymentType: 'block', refunded: true }), {}, ctx).action.kind, 'refunded');
    assert.equal(diagnoseTicket(t({ itemId: 'b1', paymentType: 'block', status: 'revoked' }), {}, ctx).action.kind, 'refunded');
    assert.equal(diagnoseTicket(t({ itemId: 'film9', paymentType: 'movie' }), {}, ctx).action.kind, 'needs-person');
    assert.equal(diagnoseTicket(t({ itemId: 'ghost', paymentType: 'block' }), {}, ctx).action.kind, 'needs-person');
});

test('the all-access pass is restored only for THIS year\'s festival', () => {
    assert.equal(diagnoseTicket(t({ itemId: 'full-festival-pass', paymentType: 'block' }), {}, ctx).action.kind, 'grant-all-access');
    assert.equal(diagnoseTicket(t({ itemId: 'full-festival-pass', paymentType: 'block' }), { hasFestivalAllAccess: true, festivalPassExpiry: '2027-09-01T00:00:00Z' }, ctx).action.kind, 'ok');
    // An old pass with no end date (or last year's end date) needs restoring, not "ok".
    assert.equal(diagnoseTicket(t({ itemId: 'full-festival-pass', paymentType: 'block' }), { hasFestivalAllAccess: true }, ctx).action.kind, 'grant-all-access');
    // A 2026 pass doesn't unlock the 2027 festival.
    assert.equal(diagnoseTicket(t({ itemId: 'full-festival-pass', paymentType: 'block', purchasedAtMs: Date.parse('2026-08-01T00:00:00Z') }), {}, ctx).action.kind, 'ended');
    // After the rewatch week, nothing to restore.
    assert.equal(diagnoseTicket(t({ itemId: 'full-festival-pass', paymentType: 'block' }), {}, { ...ctx, nowMs: Date.parse('2027-09-10T00:00:00Z') }).action.kind, 'ended');
});

test('partner passes and single watch-party tickets are restored when missing', () => {
    assert.deepEqual(diagnoseTicket(t({ itemId: 'partner-pass:fest-a', paymentType: 'block' }), {}, ctx).action, { kind: 'grant-partner-pass', partnerId: 'fest-a' });
    assert.equal(diagnoseTicket(t({ itemId: 'partner-pass:fest-a', paymentType: 'block' }), { partnerPasses: { 'fest-a': 'x' } }, ctx).action.kind, 'ok');
    // Last year's partner pass doesn't open this year's edition.
    const cleaned = { ...ctx, partnerCleanedAt: new Map([['fest-a', Date.parse('2026-09-01T00:00:00Z')]]) };
    assert.equal(diagnoseTicket(t({ itemId: 'partner-pass:fest-a', paymentType: 'block', purchasedAtMs: Date.parse('2026-08-01T00:00:00Z') }), {}, cleaned).action.kind, 'ended');
    assert.equal(diagnoseTicket(t({ itemId: 'partner-pass:fest-a', paymentType: 'block' }), { partnerPasses: { 'fest-a': '2026-08-01T00:00:00Z' } }, cleaned).action.kind, 'grant-partner-pass');
    assert.deepEqual(diagnoseTicket(t({ itemId: 'luna', paymentType: 'watchPartyTicket' }), {}, ctx).action, { kind: 'grant-watch-party', movieKey: 'luna' });
});

test('only the account\'s own tickets count; someone else\'s are never touched', () => {
    const tickets: HelpTicket[] = [
        { id: 'a', uid: 'u1', email: 'x@y.com' },
        { id: 'b', uid: null, email: 'Me@Mail.com' },   // bought with my email, never linked
        { id: 'c', uid: 'u2', email: 'me@mail.com' },   // on another account
        { id: 'd', uid: null, email: 'other@mail.com' },
    ];
    assert.deepEqual(ownedTickets(tickets, 'u1', 'me@mail.com').map(x => x.id), ['a', 'b']);
    assert.equal(maskEmail('jane@gmail.com'), 'j•••@gmail.com');
    assert.equal(maskEmail(''), '');
});
