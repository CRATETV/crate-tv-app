import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inviteOnlyProblem } from '../api/_lib/paymentRules';
import { resolveMovieAccess } from '../api/_lib/entitlements';
import { isFreeForEveryone } from '../api/_lib/paidRules';

const film = { isInviteOnly: true, isForSale: true, salePrice: 5 };

test('an ordinary film has no invite rule', () => {
    assert.equal(inviteOnlyProblem({ isForSale: true }, null, 'f'), null);
});
test('invite-only film: no code means no sale', () => {
    assert.match(inviteOnlyProblem(film, null, 'f')!, /invite only/);
});
test('invite-only film: a code made for another film is refused', () => {
    assert.match(inviteOnlyProblem(film, { itemId: 'other' }, 'f')!, /isn't for this film/);
});
test('invite-only film: a code with no film is refused', () => {
    assert.match(inviteOnlyProblem(film, { type: 'discount', discountValue: 0 }, 'f')!, /isn't for this film/);
});
test('invite-only film: a code made for this film works (free or 0% pay code)', () => {
    assert.equal(inviteOnlyProblem(film, { itemId: 'f', type: 'one_time_access' }, 'f'), null);
    assert.equal(inviteOnlyProblem(film, { itemId: 'f', type: 'discount', discountValue: 0 }, 'f'), null);
});
test('invite-only film is never free for everyone', () => {
    assert.equal(isFreeForEveryone({ key: 'f', isInviteOnly: true }, new Set()), false);
});

const docOf = (data: any) => ({ exists: data !== undefined, data: () => data });
const db = (users: Record<string, any>, movies: Record<string, any>) => ({ collection: (n: string) => ({ doc: (id: string) => ({
    get: async () => docOf(n === 'users' ? users[id] : n === 'movies' ? movies[id] : undefined),
    collection: () => ({ get: async () => ({ docs: [], forEach: () => {} }) }),
}) }) }) as any;

test('invite-only film: no rental, no watching (even when not marked for sale)', async () => {
    const d = db({ a: {} }, { f: { isInviteOnly: true } });
    assert.equal((await resolveMovieAccess(d, { uid: 'a', movieKey: 'f', mode: 'ondemand' })).granted, false);
});
test('invite-only film: a rental from a code gets in', async () => {
    const d = db({ a: { rentals: { f: new Date(Date.now() + 3600_000).toISOString() } } }, { f: { isInviteOnly: true, isForSale: true } });
    assert.equal((await resolveMovieAccess(d, { uid: 'a', movieKey: 'f', mode: 'ondemand' })).granted, true);
});
