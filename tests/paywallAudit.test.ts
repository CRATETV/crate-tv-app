// Oct 23 2026 paywall audit: each test is one loophole that was open.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paidFestivalFilmKeys, isFreeForEveryone, publicSafeMovie, publicSafeData } from '../api/_lib/paidRules';
import { sealSnapshot, openSnapshot } from '../api/_lib/privateSnapshot';
import { resolveMovieAccess } from '../api/_lib/entitlements';

const S3 = 'https://cratetelevision.s3.us-east-1.amazonaws.com/';
const festivalData = [
    { day: 1, blocks: [
        { id: 'paid-block', price: 10, movieKeys: ['festFilm'] },
        { id: 'no-price-block', movieKeys: ['unpricedFilm'] },
        { id: 'free-block', price: 0, movieKeys: ['freeFestFilm'] },
    ] },
];

test('a film in a paid festival block is NOT free (it was, on the Roku and TV feeds)', () => {
    const paid = paidFestivalFilmKeys(festivalData);
    assert.equal(isFreeForEveryone({ key: 'festFilm' }, paid), false);
    assert.equal(isFreeForEveryone({ key: 'unpricedFilm' }, paid), false, 'no price set counts as paid');
    assert.equal(isFreeForEveryone({ key: 'freeFestFilm' }, paid), true, 'a $0 block stays free');
    assert.equal(isFreeForEveryone({ key: 'plain' }, paid), true);
    assert.equal(isFreeForEveryone({ key: 'party', isWatchPartyPaid: true }, paid), false);
    assert.equal(isFreeForEveryone({ key: 'rental', isForSale: true }, paid), false);
});

test('the public film list never carries our video links', () => {
    const paid = paidFestivalFilmKeys(festivalData);
    const safe = publicSafeMovie({
        key: 'meridian', isForSale: true,
        fullMovie: S3 + 'Meridian.mp4', rokuStreamUrl: S3 + 'Meridian_roku.mp4',
        episodes: [{ title: 'Ep 1', url: S3 + 'ep1.m3u8' }],
    }, paid) as any;
    assert.equal(safe.fullMovie, undefined);
    assert.equal('rokuStreamUrl' in safe, false);
    assert.equal(safe.episodes[0].url, undefined);
    // YouTube embeds are public anyway and still shown
    assert.equal((publicSafeMovie({ key: 'yt', fullMovie: 'https://www.youtube.com/watch?v=x' }, paid) as any).fullMovie, 'https://www.youtube.com/watch?v=x');
    // a free series keeps its episode links (the website plays them directly)
    assert.equal((publicSafeMovie({ key: 'free', episodes: [{ url: S3 + 'e.m3u8' }] }, paid) as any).episodes[0].url, S3 + 'e.m3u8');
});

test('the public copy of the published data has no links and no promo codes', () => {
    const data = { festivalData, promoCodes: { FREE: {} }, movies: { festFilm: { key: 'festFilm', fullMovie: S3 + 'f.m3u8' } } };
    const safe = publicSafeData(data) as any;
    assert.equal(safe.movies.festFilm.fullMovie, undefined);
    assert.equal(safe.promoCodes, undefined);
    assert.equal(data.movies.festFilm.fullMovie, S3 + 'f.m3u8', 'the original is never changed');
});

test('the private copy can only be read with the server secret', () => {
    const before = process.env.AWS_SECRET_ACCESS_KEY;
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-one';
    const sealed = sealSnapshot({ movies: { a: { fullMovie: S3 + 'a.mp4' } } })!;
    assert.ok(!sealed.toString('utf8').includes('a.mp4'), 'links are not readable in the stored file');
    assert.equal(openSnapshot(sealed).movies.a.fullMovie, S3 + 'a.mp4');
    process.env.AWS_SECRET_ACCESS_KEY = 'a-different-secret';
    assert.throws(() => openSnapshot(sealed));
    if (before === undefined) delete process.env.AWS_SECRET_ACCESS_KEY; else process.env.AWS_SECRET_ACCESS_KEY = before;
});

// ── Access rules on the film page (on demand) ─────────────────────────
function fakeDb(users: Record<string, any>, movies: Record<string, any>) {
    const docOf = (data: any) => ({ exists: data !== undefined, data: () => data });
    return {
        collection: (name: string) => ({
            doc: (id: string) => ({
                get: async () => docOf(name === 'users' ? users[id] : name === 'movies' ? movies[id] : undefined),
                collection: () => ({ get: async () => {
                    const docs = festivalData.map(d => ({ data: () => d }));
                    return { docs, forEach: (fn: any) => docs.forEach(fn) };
                } }),
            }),
        }),
    } as any;
}
const future = new Date(Date.now() + 86_400_000).toISOString();
const db = fakeDb(
    { nobody: {}, ticket: { unlockedWatchPartyKeys: ['partyFilm'] }, renter: { rentals: { partyFilm: future } } },
    { partyFilm: { isWatchPartyPaid: true }, freeFilm: {}, unpricedFilm: {}, festFilm: {} },
);
const onDemand = (uid: string, movieKey: string) => resolveMovieAccess(db, { uid, movieKey, mode: 'ondemand' }).then(r => r.granted);

test('REGRESSION: a paid watch party film is not free on its regular film page', async () => {
    assert.equal(await onDemand('nobody', 'partyFilm'), false);
    assert.equal(await onDemand('ticket', 'partyFilm'), true);
    assert.equal(await onDemand('renter', 'partyFilm'), true);
});

test('REGRESSION: a festival block with no price set does not make its films free', async () => {
    assert.equal(await onDemand('nobody', 'unpricedFilm'), false);
    assert.equal(await onDemand('nobody', 'festFilm'), false);
    assert.equal(await onDemand('nobody', 'freeFilm'), true);
});
