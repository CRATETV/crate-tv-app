// api/_lib/runBackup.ts — does the backup. Rules and wording: backup.ts (tested).
import { gzipSync } from 'node:zlib';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import type { Firestore } from 'firebase-admin/firestore';
import { getApiData } from './data.js';
import { backupFolder, backupHeader, backupLine, foldersToDelete, SKIP_COLLECTIONS, SUB_COLLECTIONS, BackupStatus } from './backup.js';

/** The PRIVATE backup bucket. Never the film bucket: that one serves files to the public. */
export function backupStore(): { client: S3Client; bucket: string } | null {
    const bucket = process.env.AWS_BACKUP_BUCKET_NAME;
    const accessKeyId = process.env.AWS_BACKUP_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_BACKUP_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    let region = process.env.AWS_BACKUP_REGION || process.env.AWS_S3_REGION || 'us-east-1';
    if (region === 'global') region = 'us-east-1';
    if (!bucket || !accessKeyId || !secretAccessKey) return null;
    if (bucket === process.env.AWS_S3_BUCKET_NAME) return null;      // refuse to back up into the public film bucket
    return { client: new S3Client({ region, credentials: { accessKeyId, secretAccessKey } }), bucket };
}

async function dumpQuery(q: FirebaseFirestore.Query | FirebaseFirestore.CollectionReference, seen: Set<string>): Promise<{ text: string; paths: string[] }> {
    let text = '';
    const paths: string[] = [];
    let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (;;) {
        let page = q.orderBy('__name__').limit(500);
        if (last) page = page.startAfter(last);
        const snap = await page.get();
        if (snap.empty) break;
        for (const d of snap.docs) {
            if (seen.has(d.ref.path)) continue;
            seen.add(d.ref.path);
            text += backupLine(d.ref.path, d.data()); paths.push(d.ref.path);
        }
        last = snap.docs[snap.docs.length - 1];
        if (snap.size < 500) break;
    }
    return { text, paths };
}

export async function runBackup(db: Firestore, now = new Date()): Promise<BackupStatus> {
    const store = backupStore();
    if (!store) throw new Error('No private backup bucket is set up (AWS_BACKUP_BUCKET_NAME).');
    const folder = backupFolder(now);
    const day = now.toISOString().slice(0, 10);
    let bytes = 0;
    const put = async (name: string, body: Buffer, type: string) => {
        bytes += body.length;
        await store.client.send(new PutObjectCommand({ Bucket: store.bucket, Key: `${folder}${name}`, Body: body, ContentType: type, ServerSideEncryption: 'AES256' }));
    };

    // ONE file, same layout as `npm run backup`, so `npm run restore` reads it.
    const parts: string[] = [backupHeader(now)];
    const seen = new Set<string>();
    const collections = new Set<string>();
    let documents = 0;
    const add = (text: string, paths: string[]) => { parts.push(text); documents += paths.length; };
    for (const col of await db.listCollections()) {
        if (SKIP_COLLECTIONS.has(col.id)) continue;
        const r = await dumpQuery(col, seen);
        add(r.text, r.paths); collections.add(col.id);
    }
    for (const sub of SUB_COLLECTIONS) {
        const r = await dumpQuery(db.collectionGroup(sub), seen);
        add(r.text, r.paths);
    }
    await put(`crate-backup-${day}.ndjson.gz`, gzipSync(Buffer.from(parts.join(''), 'utf8')), 'application/gzip');
    // The catalog file the site is built from (films, rows, festival, about).
    const catalog = await getApiData({ noCache: true });
    await put('catalog-file.json.gz', gzipSync(Buffer.from(JSON.stringify(catalog), 'utf8')), 'application/gzip');

    // Keep the newest 8 backups.
    const listed = await store.client.send(new ListObjectsV2Command({ Bucket: store.bucket, Prefix: 'crate-backups/', Delimiter: '/' }));
    const folders = (listed.CommonPrefixes || []).map(p => p.Prefix || '');
    for (const old of foldersToDelete(folders)) {
        const objs = await store.client.send(new ListObjectsV2Command({ Bucket: store.bucket, Prefix: old }));
        const keys = (objs.Contents || []).map(o => ({ Key: o.Key! }));
        if (keys.length) await store.client.send(new DeleteObjectsCommand({ Bucket: store.bucket, Delete: { Objects: keys } }));
    }
    return { ok: true, at: now.toISOString(), folder, collections: collections.size, documents, bytes };
}

export async function runAndRecordBackup(db: Firestore): Promise<BackupStatus> {
    let status: BackupStatus;
    try { status = await runBackup(db); }
    catch (e) { status = { ok: false, at: new Date().toISOString(), error: (e instanceof Error ? e.message : String(e)).slice(0, 300) }; }
    await db.collection('admin_status').doc('backup').set(status);
    return status;
}
