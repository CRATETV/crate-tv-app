import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMovieAccess } from '../api/_lib/entitlements';

// Code-only screening: free price or not, nobody gets in without a ticket.
const docOf = (data: any) => ({ exists: data !== undefined, data: () => data });
function db(users: Record<string, any>, movies: Record<string, any>) {
    return { collection: (name: string) => ({ doc: (id: string) => ({
        get: async () => docOf(name === 'users' ? users[id] : name === 'movies' ? movies[id] : undefined),
        collection: () => ({ get: async () => ({ docs: [], forEach: () => {} }) }),
    }) }) } as any;
}
const started = new Date(Date.now() - 600_000).toISOString();
const film = { isPrivateScreening: true, isWatchPartyEnabled: true, watchPartyStartTime: started };

for (const mode of ['live', 'ondemand'] as const) {
    test(`private screening, ${mode}: no ticket means no entry, even unpaid`, async () => {
        const d = db({ a: {} }, { p: film });
        assert.equal((await resolveMovieAccess(d, { uid: 'a', movieKey: 'p', mode })).granted, false);
    });
    test(`private screening, ${mode}: invite-code ticket gets in`, async () => {
        const d = db({ a: { unlockedWatchPartyKeys: ['p'] } }, { p: film });
        assert.equal((await resolveMovieAccess(d, { uid: 'a', movieKey: 'p', mode })).granted, true);
    });
}
test('an ordinary free party still lets everyone in', async () => {
    const d = db({ a: {} }, { p: { isWatchPartyEnabled: true, watchPartyStartTime: started } });
    assert.equal((await resolveMovieAccess(d, { uid: 'a', movieKey: 'p', mode: 'live' })).granted, true);
});
