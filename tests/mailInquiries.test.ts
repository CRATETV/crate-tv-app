import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInquiryRecord } from '../api/_lib/mailLog.js';
import { MAIL_TEMPLATES, fillTemplate, bookingLink } from '../components/mailTemplates.js';

test('a premiere request becomes an unread Received message the dashboard can reply to', () => {
    const r = buildInquiryRecord({ kind: 'premiere', name: 'Ama Boateng', email: 'Ama@Example.com', message: 'Hello!', details: [['Film', 'Sunday Table'], ['Runtime', '12 min']] }, '2026-10-31T20:00:00.000Z');
    assert.equal(r.direction, 'in');
    assert.equal(r.read, false);
    assert.equal(r.fromEmail, 'ama@example.com');
    assert.equal(r.subject, 'Premiere request: Sunday Table');
    assert.match(r.text, /Runtime: 12 min/);
    assert.match(r.text, /Hello!/);
    assert.deepEqual(r.meta, { source: 'inquiry', kind: 'premiere', film: 'Sunday Table' });
});

test('stored (object-shaped) details and festival requests also work', () => {
    const r = buildInquiryRecord({ kind: 'festival', name: 'Ann', email: 'a@b.co', details: { Festival: 'Hilltop Film Fest' } }, 'x');
    assert.equal(r.subject, 'Festival hosting request: Hilltop Film Fest');
});

test('reply templates fill in the name, film and booking link with the real prices', () => {
    const t = MAIL_TEMPLATES.find(x => x.id === 'premiere-how-it-works')!;
    const f = fillTemplate(t, { name: 'Ama Boateng', film: 'Sunday Table', link: bookingLink('Sunday Table') });
    assert.match(f.subject, /Sunday Table/);
    assert.match(f.body, /^Hi Ama,/);
    assert.match(f.body, /\$25 booking fee/);
    assert.match(f.body, /\$75 in total/);
    assert.match(f.body, /30% of ticket sales/);
    assert.match(f.body, /https:\/\/cratetv\.net\/book-premiere\?film=Sunday%20Table/);
    assert.doesNotMatch(f.body, /\{(name|film|link)\}/);
    assert.match(fillTemplate(t, {}).body, /^Hi there,/);
});
