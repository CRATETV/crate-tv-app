// Admin → Storage clean-up (top admin password only).
//
//   POST { password, action:'scan' }
//        → the video files in the S3 bucket that CRATE doesn't use, one row
//          per film file (an HLS folder is one row), biggest first.
//   POST { password, action:'delete', ids:[...] }
//        → deletes those rows. The server works the list out AGAIN first and
//          only deletes files that are still unused right now: it never
//          trusts the browser's list. Permanent.
//        + removeFilms:true → also removes those rows' hidden films from the
//          catalog, but only films that never earned money and aren't in a
//          festival schedule (catalogRemoval in api/_lib/storageCleanup.ts).
//
// What counts as unused, and what is always kept: api/_lib/storageCleanup.ts.
import { FieldValue } from 'firebase-admin/firestore';
import { isMasterAdmin } from './_lib/adminAuth.js';
import { getApiData } from './_lib/data.js';
import { getAdminDb } from './_lib/firebaseAdmin.js';
import { buildPlan, groupPlan, looksLikeRealCatalog, catalogRemoval } from './_lib/storageCleanup.js';
import { bucketStore, listAllObjects, deleteKeys, earnedByTitle, removeFilmRecords } from './_lib/filmRemoval.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function currentPlan() {
    const store = bucketStore();
    if (!store) throw new Error('Storage is not set up on the server.');
    const data = await getApiData({ noCache: true });
    // Never plan deletions from sample data or a half-loaded catalog.
    if (!looksLikeRealCatalog(data)) throw new Error('Could not load the real CRATE catalog right now. Nothing was planned. Try again in a few minutes.');
    const objects = await listAllObjects(store.client, store.bucket);
    const result = buildPlan(objects, data, Date.now());
    return { ...result, groups: groupPlan(result.plan), store, totalObjects: objects.length, data };
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await isMasterAdmin(body.password))) return json({ error: 'Only the main admin can use storage clean-up.' }, 401);
        const action = String(body.action || 'scan');

        if (action === 'scan') {
            const { groups, keptVideos, filmsInUse, filmsNotInUse, totalObjects, data, inUseList, notInUseList } = await currentPlan();
            const now = Date.now();
            const earned = groups.some(g => g.filmKey) ? await earnedByTitle(getAdminDb(), data) : {};
            return json({
                groups: groups.map(g => {
                    const film = g.filmKey ? catalogRemoval(g.filmKey, data, earned, now) : null;
                    return {
                        id: g.id, label: g.label, detail: g.detail, reason: g.reason, size: g.size, files: g.keys.length, isFolder: g.isFolder,
                        ...(g.filmKey ? { filmKey: g.filmKey, filmTitle: data.movies?.[g.filmKey]?.title || g.filmKey, canRemoveFilm: film!.ok, keepFilmWhy: film!.ok ? null : (film as any).why } : {}),
                    };
                }),
                keptVideos, filmsInUse, filmsNotInUse, totalObjects, inUseList, notInUseList,
            });
        }

        if (action === 'delete') {
            const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === 'string').slice(0, 5000) : [];
            if (ids.length === 0) return json({ error: 'Nothing selected.' }, 400);
            const { groups, store, data } = await currentPlan();
            const byId = new Map(groups.map(g => [g.id, g]));
            const chosen = ids.map(id => byId.get(id)).filter((g): g is NonNullable<typeof g> => !!g);
            const keys = chosen.flatMap(g => g.keys);
            const skipped = ids.length - chosen.length; // now in use again, or already gone

            const { deleted, failed: failedKeys, errors } = await deleteKeys(store.client, store.bucket, keys);
            const bytes = chosen.reduce((s, g) => s + g.size, 0);
            const db = getAdminDb();

            // Also remove the hidden films themselves, when asked (and allowed).
            const filmsRemoved: string[] = [];
            const filmsKept: { title: string; why: string }[] = [];
            if (body.removeFilms === true && db) {
                // Only films whose video files really went.
                const filmKeys = [...new Set(chosen.filter(g => g.filmKey && !g.keys.some(k => failedKeys.has(k))).map(g => g.filmKey!))];
                const earned = filmKeys.length ? await earnedByTitle(db, data) : {};
                const now = Date.now();
                const titles: Record<string, string> = {};
                const allowed: string[] = [];
                for (const key of filmKeys) {
                    titles[key] = data.movies?.[key]?.title || key;
                    const check = catalogRemoval(key, data, earned, now);
                    if (check.ok) allowed.push(key); else filmsKept.push({ title: titles[key], why: check.why });
                }
                const removed = await removeFilmRecords(db, allowed, titles, 'Storage clean-up');
                for (const key of allowed) {
                    if (removed.includes(key)) filmsRemoved.push(titles[key]);
                    else filmsKept.push({ title: titles[key], why: "couldn't be removed just now" });
                }
            }
            await db?.collection('audit_logs').add({
                action: 'STORAGE_CLEANUP', type: 'CONTENT', operatorName: 'ADMIN', timestamp: FieldValue.serverTimestamp(),
                details: `Deleted ${deleted} file(s), ${(bytes / 1024 ** 3).toFixed(2)} GB: ${chosen.map(g => g.id).join(', ').slice(0, 1800)}`,
            }).catch(() => {});
            return json({ deleted, rows: chosen.length, skipped, bytes, errors: errors.slice(0, 20), filmsRemoved, filmsKept });
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (e) {
        console.error('[admin-storage-cleanup]', e);
        return json({ error: (e as Error).message || 'Storage clean-up failed.' }, 500);
    }
}
