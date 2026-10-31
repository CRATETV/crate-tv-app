import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import {
    prepareAttachments, cleanFilename, verifyWebhookSignature, parseInboundEvent, buildInboundRecord,
    buildSentRecord, parseAddress, replyToAddress, stripHtml, escapeHtml, MAX_ATTACHMENTS,
} from '../api/_lib/mailLog.js';

const b64 = (s: string) => Buffer.from(s).toString('base64');

test('no attachments is fine', () => {
    assert.deepEqual(prepareAttachments(undefined), { ok: true, files: [] });
    assert.deepEqual(prepareAttachments([]), { ok: true, files: [] });
});
test('a receipt PDF is accepted, with a data: start and a folder in the name', () => {
    const r = prepareAttachments([{ filename: '../../receipt 1.pdf', content: 'data:application/pdf;base64,' + b64('hello pdf') }]);
    assert.ok(r.ok);
    if (r.ok) { assert.equal(r.files[0].filename, 'receipt 1.pdf'); assert.equal(r.files[0].content.toString(), 'hello pdf'); assert.equal(r.files[0].size, 9); }
});
test('programs and scripts are refused', () => {
    for (const name of ['run.exe', 'a.js', 'b.html', 'c.svg', 'd.zip', 'noextension']) {
        const r = prepareAttachments([{ filename: name, content: b64('x') }]);
        assert.equal(r.ok, false, name);
    }
});
test('too many files, too big, empty and broken files are refused', () => {
    const many = Array.from({ length: MAX_ATTACHMENTS + 1 }, (_, i) => ({ filename: `a${i}.pdf`, content: b64('x') }));
    assert.equal(prepareAttachments(many).ok, false);
    const big = Buffer.alloc(3_100_000, 1).toString('base64');
    assert.equal(prepareAttachments([{ filename: 'big.pdf', content: big }]).ok, false);
    assert.equal(prepareAttachments([{ filename: 'x.pdf', content: '' }]).ok, false);
    assert.equal(prepareAttachments([{ filename: 'x.pdf', content: '***not base64***' }]).ok, false);
    assert.equal(prepareAttachments('nope').ok, false);
});
test('file names are cleaned', () => {
    assert.equal(cleanFilename('C:\\x\\My Film <1>.pdf'), 'My Film 1.pdf');
    assert.equal(cleanFilename(''), 'attachment');
    assert.equal(cleanFilename(undefined), 'attachment');
});

const secretRaw = Buffer.from('super-secret-key');
const secret = 'whsec_' + secretRaw.toString('base64');
const sign = (id: string, ts: string, body: string) => 'v1,' + createHmac('sha256', secretRaw).update(`${id}.${ts}.${body}`).digest('base64');

test('a correctly signed, recent webhook passes', () => {
    const body = '{"hello":1}', ts = '1790000000';
    assert.equal(verifyWebhookSignature({ id: 'msg_1', timestamp: ts, signature: sign('msg_1', ts, body), payload: body, secret, nowMs: 1790000100_000 }), true);
});
test('a second signature in the header still works (secret rotation)', () => {
    const body = '{}', ts = '1790000000';
    const header = 'v1,AAAA ' + sign('m', ts, body);
    assert.equal(verifyWebhookSignature({ id: 'm', timestamp: ts, signature: header, payload: body, secret, nowMs: 1790000000_000 }), true);
});
test('wrong body, wrong secret, old timestamp and missing parts are all refused', () => {
    const body = '{"a":1}', ts = '1790000000', sig = sign('m', ts, body);
    const base = { id: 'm', timestamp: ts, signature: sig, payload: body, secret, nowMs: 1790000000_000 };
    assert.equal(verifyWebhookSignature({ ...base, payload: '{"a":2}' }), false);
    assert.equal(verifyWebhookSignature({ ...base, secret: 'whsec_' + Buffer.from('other').toString('base64') }), false);
    assert.equal(verifyWebhookSignature({ ...base, nowMs: 1790000000_000 + 10 * 60_000 }), false);
    assert.equal(verifyWebhookSignature({ ...base, signature: null }), false);
    assert.equal(verifyWebhookSignature({ ...base, secret: '' }), false);
    assert.equal(verifyWebhookSignature({ ...base, timestamp: 'abc' }), false);
});

test('reads an incoming email webhook and ignores other events', () => {
    const ev = parseInboundEvent({ type: 'email.received', data: { email_id: 'e1', from: 'a@b.com', to: ['studio@reply.cratetv.net'], subject: 'Hi', message_id: '<1@x>', attachments: [{ id: 'at1', filename: 'r.pdf', content_type: 'application/pdf' }] } });
    assert.equal(ev?.emailId, 'e1');
    assert.equal(ev?.attachments[0].filename, 'r.pdf');
    assert.equal(parseInboundEvent({ type: 'email.sent', data: { email_id: 'e1' } }), null);
    assert.equal(parseInboundEvent(null), null);
    assert.equal(parseInboundEvent({ type: 'email.received', data: {} }), null);
});
test('saves a received email with the sender name, plain text, and attachment sizes', () => {
    const ev = parseInboundEvent({ type: 'email.received', data: { email_id: 'e1', from: 'ann@x.com', to: ['s@r.net'], subject: 'Receipt?', attachments: [{ id: 'at1', filename: 'p.png', content_type: 'image/png' }] } })!;
    const rec = buildInboundRecord(ev, { headers: { from: 'Ann Lee <Ann@X.com>' }, html: '<p>Hello<br>there</p><style>p{}</style>', text: null, attachments: [{ id: 'at1', size: 1234 }] }, '2026-10-31T12:00:00Z');
    assert.equal(rec.fromName, 'Ann Lee');
    assert.equal(rec.fromEmail, 'ann@x.com');
    assert.equal(rec.text, 'Hello\nthere');
    assert.equal(rec.attachments[0].size, 1234);
    assert.equal(rec.read, false);
    assert.equal(rec.direction, 'in');
    const noFull = buildInboundRecord(ev, null, '2026-10-31T12:00:00Z');
    assert.equal(noFull.fromEmail, 'ann@x.com');
    assert.equal(noFull.text, '');
});
test('saves a sent email with names and sizes only', () => {
    const rec = buildSentRecord({ fromEmail: 's@c.net', to: 'a@b.com', subject: 'S', text: 'T', files: [{ filename: 'a.pdf', size: 5 }], nowIso: 'x' });
    assert.deepEqual(rec.attachments, [{ filename: 'a.pdf', size: 5 }]);
    assert.equal(rec.direction, 'out');
});
test('small helpers', () => {
    assert.deepEqual(parseAddress('"Ann Lee" <A@x.com>'), { name: 'Ann Lee', email: 'a@x.com' });
    assert.deepEqual(parseAddress('b@x.com'), { name: '', email: 'b@x.com' });
    assert.equal(replyToAddress({ MAIL_INBOUND_ADDRESS: 'studio@reply.cratetv.net' }, 'studio@cratetv.net'), 'studio@reply.cratetv.net');
    assert.equal(replyToAddress({}, 'studio@cratetv.net'), 'studio@cratetv.net');
    assert.equal(replyToAddress({ MAIL_INBOUND_ADDRESS: 'not an email' }, 'studio@cratetv.net'), 'studio@cratetv.net');
    assert.equal(escapeHtml('<b>"x"</b> & y'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt; &amp; y');
    assert.equal(stripHtml('<div>A &amp; B</div><div>C</div>'), 'A & B\nC');
});
