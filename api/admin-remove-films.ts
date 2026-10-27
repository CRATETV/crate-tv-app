// Admin → Films → "Remove selected" (Oct 2026). Main admin only.
//
//   POST { password, action:'check',  keys:[...] }
//        → for each film: can it be removed (and if not, why), and which of
//          its files in the bucket go with it (count + size).
//   POST { password, action:'remove', keys:[...] }
//        → checks again on the server, then for each film that may go:
//          deletes the bucket files ONLY it uses (video, streaming folder,
//          poster, trailer, photos), and removes it from the catalog and rows.
//
// Never removed: films that earned money (they stay on Earnings & payouts),
// festival or partner films, films with a watch party coming up or just held
// (filmRemovalCheck in api/_lib/storageCleanup.ts). Files another film or the
// site's own code uses are never deleted (filmOnlyFiles).
import { isMasterAdmin } from './_lib/adminAuth.js';
import { getApiData } from './_lib/data.js';
import { getAdminDb } from './_lib/firebaseAdmin.js';
import { filmRemovalCheck, filmOnlyFiles, looksLikeRealCatalog } from './_lib/storageCleanup.js';
import { bucketStore, listAllObjects, deleteKeys, earnedByTitle, removeFilmRecords } from './_lib/filmRemoval.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function plan(keys: string[]) {
    const store = bucketStore();
    if (!store) throw new Error('Storage is not set up on the server.');
    const db = getAdminDb();
    if (!db) throw new Error('The database is not reachable right now.');
    const data = await getApiData({ noCache: true });
    if (!looksLikeRealCatalog(data)) throw new Error('Could not load the real CRATE catalog right now. Nothing was changed. Try again in a few minutes.');
    const [objects, earned] = await Promise.all([listAllObjects(store.client, store.bucket), earnedByTitle(db, data)]);
    const now = Date.now();
    const checks = keys.map(key => ({ key, title: data.movies?.[key]?.title || key, check: filmRemovalCheck(key, data, earned, now) }));
    const going = new Set(checks.filter(c => c.check.ok).map(c => c.key));
    const films = checks.map(c => {
        if (!c.check.ok) return { key: c.key, title: c.title, ok: false, why: c.check.why, files: [] as string[], size: 0 };
        // Files only this film uses, counting the other films being removed as gone too.
        const others: any = { ...data, movies: { ...data.movies } };
        for (const k of going) if (k !== c.key) delete others.movies[k];
        const mine = filmOnlyFiles(c.key, others, objects);
        return { key: c.key, title: c.title, ok: true, why: null, files: mine.keys, size: mine.size };
    });
    return { films, store, db };
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await isMasterAdmin(body.password))) return json({ error: 'Only the main admin can remove films.' }, 401);
        const keys: string[] = [...new Set<string>((Array.isArray(body.keys) ? body.keys : []).filter((k: unknown) => typeof k === 'string' && k))].slice(0, 500);
        if (keys.length === 0) return json({ error: 'No films selected.' }, 400);
        const action = String(body.action || 'check');

        if (action === 'check') {
            const { films } = await plan(keys);
            return json({ films: films.map(f => ({ key: f.key, title: f.title, ok: f.ok, why: f.why, files: f.files.length, size: f.size })) });
        }

        if (action === 'remove') {
            const { films, store, db } = await plan(keys);
            const going = films.filter(f => f.ok);
            const fileKeys = going.flatMap(f => f.files);
            const del = fileKeys.length ? await deleteKeys(store.client, store.bucket, fileKeys) : { deleted: 0, failed: new Set<string>(), errors: [] as string[] };
            const titles = Object.fromEntries(films.map(f => [f.key, f.title]));
            const removed = await removeFilmRecords(db, going.map(f => f.key), titles, 'Films → Remove selected');
            return json({
                removed: removed.map(k => titles[k]),
                kept: [
                    ...films.filter(f => !f.ok).map(f => ({ title: f.title, why: f.why })),
                    ...going.filter(f => !removed.includes(f.key)).map(f => ({ title: f.title, why: "couldn't be removed just now" })),
                ],
                filesDeleted: del.deleted,
                bytes: going.reduce((s, f) => s + f.size, 0),
                fileErrors: del.errors.slice(0, 20),
            });
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (e) {
        console.error('[admin-remove-films]', e);
        return json({ error: (e as Error).message || 'Removing films failed.' }, 500);
    }
}
