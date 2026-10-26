import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanInquiry } from '../api/_lib/inquiry';

const festival = { kind: 'festival', name: 'Ana Ruiz', email: 'Ana@Fest.org', festivalName: 'Philly Shorts Fest', dates: 'May 2027', filmCount: '24', message: 'Hi!' };

test('festival request is cleaned and kept in order', () => {
    const r = cleanInquiry(festival);
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.inquiry.email, 'ana@fest.org');
    assert.deepEqual(r.inquiry.details, [['Festival', 'Philly Shorts Fest'], ['Dates', 'May 2027'], ['Number of films', '24']]);
});

test('premiere request needs a film title', () => {
    const r = cleanInquiry({ kind: 'premiere', name: 'Jo', email: 'jo@x.com' });
    assert.equal(r.ok, false);
});

test('premiere ticketing choice is labelled; unknown choices dropped', () => {
    const a = cleanInquiry({ kind: 'premiere', name: 'Jo', email: 'jo@x.com', filmTitle: 'Rain', ticketing: 'pwyw' });
    assert.ok(a.ok && a.inquiry.details.some(([k, v]) => k === 'Tickets' && v === 'Pay what you want'));
    const b = cleanInquiry({ kind: 'premiere', name: 'Jo', email: 'jo@x.com', filmTitle: 'Rain', ticketing: '<script>' });
    assert.ok(b.ok && !b.inquiry.details.some(([k]) => k === 'Tickets'));
});

test('bad email, missing name, unknown form are refused', () => {
    assert.equal(cleanInquiry({ ...festival, email: 'nope' }).ok, false);
    assert.equal(cleanInquiry({ ...festival, name: '  ' }).ok, false);
    assert.equal(cleanInquiry({ ...festival, kind: 'other' }).ok, false);
    assert.equal(cleanInquiry(null).ok, false);
});

test('links: bare domains get https, unsafe schemes refused', () => {
    const a = cleanInquiry({ ...festival, link: 'phillyshorts.org' });
    assert.ok(a.ok && a.inquiry.link === 'https://phillyshorts.org/');
    assert.equal(cleanInquiry({ ...festival, link: 'javascript:alert(1)' }).ok, false);
});

test('hidden bot field marks it as spam', () => {
    const r = cleanInquiry({ ...festival, company_site: 'http://spam' });
    assert.ok(!r.ok && r.spam === true);
});

test('long text is capped', () => {
    const r = cleanInquiry({ ...festival, message: 'x'.repeat(10000), festivalName: 'y'.repeat(500) });
    assert.ok(r.ok && r.inquiry.message.length === 3000 && r.inquiry.details[0][1].length === 150);
});
