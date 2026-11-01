import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanInviteRequest } from '../api/_lib/inviteRequest.js';
import { buildInquiryRecord } from '../api/_lib/mailLog.js';

test('an invite request needs a name and a real email; bots are quietly dropped', () => {
    assert.equal((cleanInviteRequest({ name: 'Ama', email: 'AMA@Example.com', note: 'Hi', movieKey: 'm1', movieTitle: 'Sunday Table' }) as any).request.email, 'ama@example.com');
    assert.equal(cleanInviteRequest({ name: '', email: 'a@b.co' }).ok, false);
    assert.equal(cleanInviteRequest({ name: 'Ama', email: 'nope' }).ok, false);
    assert.equal((cleanInviteRequest({ name: 'Bot', email: 'a@b.co', company_site: 'x' }) as any).spam, true);
    assert.equal(cleanInviteRequest(null).ok, false);
});

test('an invite request shows in the dashboard as "Invite request: <screening>"', () => {
    const r = buildInquiryRecord({ kind: 'invite', name: 'Ama', email: 'a@b.co', message: 'Hello', details: [['Screening', 'Sunday Table']] }, 'x');
    assert.equal(r.subject, 'Invite request: Sunday Table');
    assert.equal(r.read, false);
    assert.equal(r.meta.kind, 'invite');
});
