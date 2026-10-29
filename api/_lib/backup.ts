// api/_lib/backup.ts — the rules for the weekly Firebase backup (Oct 29 2026).
//
// Every Sunday, api/backup-firestore.ts copies the database (every collection,
// plus the sub-collections below) into ONE file in the same format as
// `npm run backup` (so `npm run restore` reads it), and the catalog file next
// to it, in a PRIVATE bucket, one folder per backup, keeping the newest 8.
// This file holds the parts that need no database, so they can be tested.
// Tested: tests/backup.test.ts.

/** Folders inside collections that hold their own documents. Fetched across the whole database. */
export const SUB_COLLECTIONS = ['messages', 'sentiment', 'shards', 'days', 'live_reactions', 'lobby_viewers', 'seen'];

/** Large, rebuildable and not worth restoring: left out so the backup stays quick. */
export const SKIP_COLLECTIONS = new Set(['traffic_events', 'view_locations', 'rate_limits']);

export const KEEP_BACKUPS = 8;

export const backupFolder = (d: Date) => `crate-backups/${d.toISOString().slice(0, 10)}/`;

/** Turn Firestore values into plain JSON that can be turned back (timestamps, references, bytes).
 *  Same tags as `npm run backup` (scripts/backup-firestore.mjs), so `npm run restore` reads these files too. */
export function serializeValue(v: any): any {
    if (v === null || v === undefined) return v ?? null;
    if (typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(serializeValue);
    if (typeof v.toDate === 'function' && typeof v.seconds === 'number') return { __type: 'timestamp', value: v.toDate().toISOString() };
    if (typeof v.latitude === 'number' && typeof v.longitude === 'number' && Object.keys(v).length <= 4 && !('path' in v)) return { __type: 'geopoint', lat: v.latitude, lng: v.longitude };
    if (typeof v.path === 'string' && typeof v.firestore === 'object') return { __type: 'ref', path: v.path };
    if (v instanceof Uint8Array) return { __type: 'bytes', base64: Buffer.from(v).toString('base64') };
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) out[k] = serializeValue(val);
    return out;
}

/** First line of a backup file, like the one `npm run backup` writes. */
export const backupHeader = (now: Date) => JSON.stringify({ backup: 'crate-firestore', version: 1, createdAt: now.toISOString(), source: 'weekly-server-backup' }) + '\n';

/** One line of a backup file. */
export const backupLine = (path: string, data: unknown) => JSON.stringify({ path, data: serializeValue(data) }) + '\n';

/** From the folder names found in the bucket, which old ones should go? Keeps the newest `keep`. */
export function foldersToDelete(folders: string[], keep: number = KEEP_BACKUPS): string[] {
    const valid = folders.filter(f => /^crate-backups\/\d{4}-\d{2}-\d{2}\/$/.test(f)).sort();
    return valid.length > keep ? valid.slice(0, valid.length - keep) : [];
}

export interface BackupStatus { ok?: boolean; at?: string; folder?: string; collections?: number; documents?: number; bytes?: number; error?: string }

/** What the Overview card should say. */
export function backupHealth(configured: boolean, status: BackupStatus | null | undefined, nowMs: number) {
    if (!configured) return { tone: 'warn' as const, headline: 'Backups are not set up yet', detail: 'Add a private backup bucket (see CHANGELOG) and the weekly backup starts by itself.' };
    if (!status || !status.at) return { tone: 'warn' as const, headline: 'No backup has run yet', detail: 'The first one runs Sunday morning, or press Back up now.' };
    const days = Math.floor((nowMs - Date.parse(status.at)) / 86_400_000);
    if (status.ok === false) return { tone: 'bad' as const, headline: 'The last backup failed', detail: status.error || 'Press Back up now to try again.' };
    if (days > 8) return { tone: 'bad' as const, headline: `Last backup was ${days} days ago`, detail: 'It should run every week. Press Back up now.' };
    return { tone: 'good' as const, headline: days <= 0 ? 'Backed up today' : `Backed up ${days} day${days === 1 ? '' : 's'} ago`, detail: `${(status.documents ?? 0).toLocaleString()} records in ${status.collections ?? 0} collections.` };
}
