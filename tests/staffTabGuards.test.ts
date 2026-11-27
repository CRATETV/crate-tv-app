import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Every endpoint behind a staff tab must check that the staff member was given THAT tab,
// not just "is some valid staff key". If you add a tab's endpoint, add it here.
const GUARDED: Record<string, string[]> = {
    'api/send-individual-email.ts': ['email', 'users', 'ticketCodes'],
    'api/generate-ticket-codes.ts': ['ticketCodes'],
    'api/manage-ticket-codes.ts': ['ticketCodes'],
    'api/get-watch-party-states.ts': ['watchParty'],
    'api/set-director-welcome.ts': ['watchParty'],
    'api/start-watch-party.ts': ['watchParty'],
    'api/terminate-watch-party.ts': ['watchParty'],
    'api/get-backstage-key.ts': ['watchParty'],
    'api/send-chat-message.ts': ['watchParty'],
    'api/delete-chat-message.ts': ['watchParty'],
    'api/advance-block-film.ts': ['watchParty'],
    'api/admin-watch-party-stats.ts': ['watchParty', 'earnings'],
    'api/pwff-notify-live.ts': ['pwff'],
    'api/send-submission.ts': ['submissions'],
};

for (const [file, tabs] of Object.entries(GUARDED)) {
    test(`${file} only opens for staff given: ${tabs.join(', ')}`, () => {
        const src = readFileSync(file, 'utf8');
        assert.match(src, /canUseTab\(/, 'must call canUseTab');
        for (const t of tabs) assert.ok(src.includes(`'${t}'`), `must name the ${t} tab`);
        assert.doesNotMatch(src, /verifyAdminPassword\(|isValidAdminKey\(/, 'must not fall back to "any staff key"');
    });
}
