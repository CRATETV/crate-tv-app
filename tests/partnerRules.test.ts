// Festival in a box — rules tests. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    checkDraft, sanitizeDraft, buildPublishPlan, computeSales, computePayout, blocksRemovedWithSales,
    partnerIdFromPassItem, partnerPassItemId, partnerFilmKey, partnerBlockId, slugify, emptyDraft, PartnerDraft,
} from '../api/_lib/partnerRules.js';

const ROUTE_SAFE = /^[a-zA-Z0-9_-]+$/;

function goodDraft(): PartnerDraft {
    return {
        details: { ...emptyDraft('Unnamed Fest').details, description: 'Indie films', passPrice: 25, timeZone: 'America/New_York' },
        films: [
            { id: 'film1', title: 'First', director: 'A', synopsis: '', durationInMinutes: 12, posterUrl: 'https://x/p1.jpg', videoUrl: 'https://x/v1.mp4' },
            { id: 'film2', title: 'Second', director: 'B', synopsis: '', durationInMinutes: 9, posterUrl: 'https://x/p2.jpg', videoUrl: 'https://x/v2.mp4' },
        ],
        days: [{ day: 1, date: 'Friday, May 14', blocks: [
            { id: 'blk1', title: 'Opening Night', filmIds: ['film1', 'film2'], screeningStartTime: '2027-05-14T23:00:00.000Z', price: 10 },
        ] }],
    };
}

test('a complete lineup has no blocking problems', () => {
    assert.deepEqual(checkDraft(goodDraft()).errors, []);
});

test('missing runtime, video, start time and films are all caught before submitting', () => {
    const d = goodDraft();
    d.films[0].durationInMinutes = 0;
    d.films[1].videoUrl = '';
    d.days[0].blocks[0].screeningStartTime = '';
    d.days[0].blocks.push({ id: 'blk2', title: 'Empty', filmIds: [], screeningStartTime: '2027-05-15T23:00:00Z', price: 5 });
    const { errors } = checkDraft(d);
    assert.ok(errors.some(e => e.includes('runtime')));
    assert.ok(errors.some(e => e.includes('video')));
    assert.ok(errors.some(e => e.includes('start date')));
    assert.ok(errors.some(e => e.includes('has no films')));
});

test('a block pointing at a deleted film is an error', () => {
    const d = goodDraft();
    d.days[0].blocks[0].filmIds.push('ghost');
    assert.ok(checkDraft(d).errors.some(e => e.includes('removed')));
});

test('sanitizeDraft drops junk, bad URLs and invalid prices', () => {
    const s = sanitizeDraft({
        details: { title: 'X', accentColor: 'red', logoUrl: 'javascript:alert(1)', passPrice: -5, evil: true },
        films: [{ id: '../../etc', title: 'T', videoUrl: 'http://insecure', durationInMinutes: '12.2' }],
        days: [{ day: 1, blocks: [{ id: 'ok-id', title: 'B', price: 'abc', filmIds: ['ok', '../bad'], screeningStartTime: 'not a date' }] }],
    });
    assert.equal((s.details as any).evil, undefined);
    assert.equal(s.details.accentColor, '#e11d48');
    assert.equal(s.details.logoUrl, '');
    assert.equal(s.details.passPrice, 0);
    assert.notEqual(s.films[0].id, '../../etc');
    assert.equal(s.films[0].videoUrl, '');
    assert.equal(s.films[0].durationInMinutes, 13);
    assert.equal(s.days[0].blocks[0].price, -1);
    assert.deepEqual(s.days[0].blocks[0].filmIds, ['ok']);
    assert.equal(s.days[0].blocks[0].screeningStartTime, '');
    assert.ok(checkDraft(s).errors.length > 0);
});

test('publishing produces route-safe ids, tagged and hidden from the main catalog', () => {
    const plan = buildPublishPlan({ id: 'unnamed-fest', name: 'Unnamed Fest', slug: 'unnamed-fest' }, goodDraft());
    for (const key of plan.filmKeys) assert.match(key, ROUTE_SAFE);
    for (const id of plan.blockIds) assert.match(id, ROUTE_SAFE);
    const movie = plan.movies[partnerFilmKey('unnamed-fest', 'film1')];
    assert.equal(movie.isUnlisted, true);
    assert.equal(movie.partnerId, 'unnamed-fest');
    assert.equal(movie.durationInMinutes, 12);
    const day = plan.days[0];
    assert.equal(day.docId, 'partner_unnamed-fest_day_1');
    assert.equal(day.data.partnerId, 'unnamed-fest');
    const block = (day.data.blocks as any[])[0];
    assert.equal(block.id, partnerBlockId('unnamed-fest', 'blk1'));
    assert.equal(block.partnerId, 'unnamed-fest');
    assert.equal(block.isWatchPartyEnabled, true);
    assert.deepEqual(block.movieKeys, plan.filmKeys);
    assert.match(block.time, /7:00\sPM\sEDT/); // 23:00Z shown in the festival's own time zone
});

test('sales are attributed to the right partner, block, pass and rentals', () => {
    const pid = 'unnamed-fest';
    const b1 = partnerBlockId(pid, 'blk1');
    const film = partnerFilmKey(pid, 'film1');
    const sales = computeSales([
        { itemId: b1, paymentType: 'block', amountPaid: 10, purchasedAt: '2027-05-01T10:00:00Z' },
        { itemId: b1, paymentType: 'block', amountPaid: 0, purchasedAt: '2027-05-02T10:00:00Z' },
        { itemId: partnerPassItemId(pid), paymentType: 'block', amountPaid: 25 },
        { itemId: film, paymentType: 'movie', amountPaid: 5 },
        { itemId: 'p_other_b_x', paymentType: 'block', amountPaid: 99 }, // another festival
        { itemId: 'full-festival-pass', paymentType: 'block', amountPaid: 50 }, // PWFF
        { itemId: 'p_unnamed_fest_b_old', paymentType: 'block', amountPaid: 7, partnerId: pid }, // since-removed block
    ], { partnerId: pid, blocks: [{ id: b1, title: 'Opening Night' }], filmKeys: [film] });
    assert.equal(sales.blocks.find(l => l.id === b1)!.orders, 2);
    assert.equal(sales.blocks.find(l => l.id === b1)!.gross, 10);
    assert.equal(sales.pass.gross, 25);
    assert.equal(sales.rentals.gross, 5);
    assert.equal(sales.blocks.find(l => l.label === 'Removed block')!.gross, 7);
    assert.equal(sales.totals.gross, 47);
    assert.equal(sales.totals.orders, 5);
    assert.equal(sales.totals.free, 1);
    assert.equal(sales.lastSaleAt, '2027-05-02T10:00:00Z');
});

test('payout uses the PWFF method: deductions first, then CRATE %', () => {
    assert.deepEqual(computePayout(1000, 50, 30), { gross: 1000, deductions: 50, net: 950, crateSharePct: 30, crateAmount: 285, partnerAmount: 665 });
    assert.equal(computePayout(100, 500, 30).net, 0); // deductions can't exceed sales
    const p = computePayout(33.33, 0, 30);
    assert.equal(p.crateAmount + p.partnerAmount, 33.33); // no cents lost to rounding
});

test('republishing cannot silently drop a block with tickets sold', () => {
    assert.deepEqual(blocksRemovedWithSales(['a', 'b', 'c'], ['a', 'c'], new Set(['b'])), ['b']);
    assert.deepEqual(blocksRemovedWithSales(['a', 'b'], ['a'], new Set(['a'])), []);
});

test('pass ids and slugs are parsed safely', () => {
    assert.equal(partnerIdFromPassItem('partner-pass:unnamed-fest'), 'unnamed-fest');
    assert.equal(partnerIdFromPassItem('partner-pass:../../x'), null);
    assert.equal(partnerIdFromPassItem('full-festival-pass'), null);
    assert.equal(slugify('Philadelphia Unnamed Film Festival — 2027!'), 'philadelphia-unnamed-film-festival-2027');
    assert.equal(slugify('Café Noir'), 'cafe-noir');
});
