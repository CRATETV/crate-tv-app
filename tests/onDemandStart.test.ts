import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMovieAccess } from '../api/_lib/entitlements';

// A ticket holder opening the regular film page BEFORE the screening used to be
// handed the video. Now the film page waits for the start, like the party page.
const docOf = (data: any) => ({ exists: data !== undefined, data: () => data });
function db(opts: { users: Record<string, any>; movies: Record<string, any>; blocks?: any[]; parties?: Record<string, any> }) {
    return {
        collection: (name: string) => ({
            doc: (id: string) => ({
                get: async () => {
                    if (name === 'users') return docOf(opts.users[id]);
                    if (name === 'movies') return docOf(opts.movies[id]);
                    if (name === 'watch_parties') return docOf(opts.parties?.[id]);
                    return docOf(undefined);   // settings/site etc.
                },
                collection: () => ({
                    get: async () => {
                        const docs = [{ data: () => ({ day: 1, blocks: opts.blocks || [] }) }];
                        return { docs, forEach: (fn: any) => docs.forEach(fn) };
                    },
                }),
            }),
        }),
    } as any;
}
const inAnHour = new Date(Date.now() + 3_600_000).toISOString();
const anHourAgo = new Date(Date.now() - 3_600_000).toISOString();
const week = new Date(Date.now() + 7 * 86_400_000).toISOString();
const ask = (d: any, uid: string, movieKey: string) => resolveMovieAccess(d, { uid, movieKey, mode: 'ondemand' });

test('LOOPHOLE: a paid ticket holder cannot watch a standalone party film early on the film page', async () => {
    const d = db({ users: { buyer: { unlockedWatchPartyKeys: ['p'] } }, movies: { p: { isWatchPartyPaid: true, isWatchPartyEnabled: true, watchPartyStartTime: inAnHour } } });
    const r = await ask(d, 'buyer', 'p');
    assert.equal(r.granted, false);
    assert.ok(r.notStarted, 'the viewer is told it has not started');
});

test('after the start time the same ticket holder gets in', async () => {
    const d = db({ users: { buyer: { unlockedWatchPartyKeys: ['p'] } }, movies: { p: { isWatchPartyPaid: true, isWatchPartyEnabled: true, watchPartyStartTime: anHourAgo } } });
    assert.equal((await ask(d, 'buyer', 'p')).granted, true);
});

test('a free party film is also held until its start', async () => {
    const d = db({ users: { anyone: {} }, movies: { f: { isWatchPartyEnabled: true, watchPartyStartTime: inAnHour } } });
    assert.equal((await ask(d, 'anyone', 'f')).granted, false);
});

test('a film with no watch party is never held back', async () => {
    const d = db({ users: { anyone: {} }, movies: { m: { watchPartyStartTime: inAnHour } } });
    assert.equal((await ask(d, 'anyone', 'm')).granted, true);
});

test('a party film with no start time that never ran is not locked out', async () => {
    const d = db({ users: { anyone: {} }, movies: { f: { isWatchPartyEnabled: true } } });
    assert.equal((await ask(d, 'anyone', 'f')).granted, true);
});

test('a free festival block film waits for its screening', async () => {
    const blocks = [{ id: 'b', price: 0, movieKeys: ['ff'], screeningStartTime: inAnHour }];
    const d = db({ users: { anyone: {} }, movies: { ff: {} }, blocks });
    assert.equal((await ask(d, 'anyone', 'ff')).granted, false);
});

test('a paid festival film is open to ticket holders only once the block has ended (and the time has passed)', async () => {
    const blocks = [{ id: 'b', price: 10, movieKeys: ['ff'], screeningStartTime: anHourAgo }];
    const d = db({ users: { t: { unlockedBlocks: { b: week } } }, movies: { ff: {} }, blocks, parties: { b: { status: 'ended', endedAt: Date.now() - 1000 } } });
    assert.equal((await ask(d, 't', 'ff')).granted, true);
});

test('a leftover "ended" from an earlier run does not let anyone in before a new start', async () => {
    const d = db({
        users: { buyer: { unlockedWatchPartyKeys: ['p'] } },
        movies: { p: { isWatchPartyPaid: true, isWatchPartyEnabled: true, watchPartyStartTime: inAnHour } },
        parties: { p: { status: 'ended', endedAt: Date.now() - 5 * 86_400_000 } },
    });
    assert.equal((await ask(d, 'buyer', 'p')).granted, false);
});
