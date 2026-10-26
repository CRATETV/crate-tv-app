import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMovieAccess } from '../api/_lib/entitlements';

// A tiny stand-in for the database: users, movies, watch_parties and the
// festival schedule.
function fakeDb(opts: { users: Record<string, any>; movies: Record<string, any>; blocks: any[] }) {
    const docOf = (data: any) => ({ exists: data !== undefined, data: () => data });
    return {
        collection: (name: string) => ({
            doc: (id: string) => ({
                get: async () => {
                    if (name === 'users') return docOf(opts.users[id]);
                    if (name === 'movies') return docOf(opts.movies[id]);
                    return docOf(undefined);
                },
                collection: () => ({
                    get: async () => {
                        const docs = [{ data: () => ({ day: 1, blocks: opts.blocks }) }];
                        return { docs, forEach: (fn: any) => docs.forEach(fn) };
                    },
                }),
            }),
        }),
    } as any;
}

const future = new Date(Date.now() + 86_400_000).toISOString();
const db = fakeDb({
    users: {
        passHolder: { hasFestivalAllAccess: true, festivalPassExpiry: future },
        oldPassHolder: { hasFestivalAllAccess: true },                       // a 2026 "forever" pass
        lastYearPass: { hasFestivalAllAccess: true, festivalPassExpiry: '2026-08-31T00:00:00Z' },
        ticketBuyer: { unlockedWatchPartyKeys: ['paidParty'] },
        renter: { rentals: { paidParty: future } },
        nobody: {},
    },
    movies: {
        paidParty: { isWatchPartyPaid: true, isWatchPartyEnabled: true },
        freeParty: { isWatchPartyEnabled: true },
        festFilm: { isWatchPartyEnabled: true },
    },
    blocks: [{ id: 'block-a', price: 10, movieKeys: ['festFilm'] }],
});
const live = (uid: string, movieKey: string) => resolveMovieAccess(db, { uid, movieKey, mode: 'live' }).then(r => r.granted);

test('REGRESSION: a festival pass does NOT open a standalone paid watch party', async () => {
    assert.equal(await live('passHolder', 'paidParty'), false);
});

test('a festival pass still opens festival blocks and festival films', async () => {
    assert.equal(await live('passHolder', 'block-a'), true);
    assert.equal(await live('passHolder', 'festFilm'), true);
});

test('a pass from a past festival does not open this festival', async () => {
    assert.equal(await live('oldPassHolder', 'block-a'), false);
    assert.equal(await live('oldPassHolder', 'festFilm'), false);
    assert.equal(await live('lastYearPass', 'block-a'), false);
});

test('people who paid for the party get in', async () => {
    assert.equal(await live('ticketBuyer', 'paidParty'), true);
    assert.equal(await live('renter', 'paidParty'), true);
});

test('no ticket means no entry to a paid party, but free parties are open', async () => {
    assert.equal(await live('nobody', 'paidParty'), false);
    assert.equal(await live('nobody', 'block-a'), false);
    assert.equal(await live('nobody', 'freeParty'), true);
});
