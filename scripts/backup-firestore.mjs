// CRATE TV database backup — free, runs on your own computer.
//
//   npm run backup
//
// Saves every document in Firestore (films, users, festivals, tickets,
// payouts, contracts, signatures…) to one file in ~/crate-backups, e.g.
//   ~/crate-backups/crate-backup-2026-10-16.ndjson.gz
//
// It only READS the database. It uses the admin key you keep at
//   ~/keys/crate-firebase-admin.json
// (or set CRATE_ADMIN_KEY=/path/to/key.json).
//
// Not included: video files and images (those live in Amazon S3 / Firebase
// Storage, not in the database).
//
// Options:
//   --skip traffic_events,view_events   leave out big activity-log collections
//   --out /some/folder                  save somewhere else
//
// Run it once a month, and keep a copy somewhere other than your computer
// (Google Drive, a USB stick). Backups contain customer emails — keep them private.
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, GeoPoint, DocumentReference } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const skip = new Set((opt('skip') || '').split(',').map(s => s.trim()).filter(Boolean));
const outDir = opt('out') || path.join(os.homedir(), 'crate-backups');
const keyPath = process.env.CRATE_ADMIN_KEY || path.join(os.homedir(), 'keys', 'crate-firebase-admin.json');

if (!fs.existsSync(keyPath)) {
    console.error(`\n✗ Can't find the Firebase admin key at:\n   ${keyPath}\n`);
    console.error('Put it there (see docs/DEPLOY-OCT-2026.md, step 1), or run:');
    console.error('   CRATE_ADMIN_KEY=/path/to/key.json npm run backup\n');
    process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) });
const db = getFirestore();

// Firestore values that JSON can't hold are tagged so restore can rebuild them.
const encode = (v) => {
    if (v instanceof Timestamp) return { __type: 'timestamp', value: v.toDate().toISOString() };
    if (v instanceof GeoPoint) return { __type: 'geopoint', lat: v.latitude, lng: v.longitude };
    if (v instanceof DocumentReference) return { __type: 'ref', path: v.path };
    if (Buffer.isBuffer(v) || v instanceof Uint8Array) return { __type: 'bytes', base64: Buffer.from(v).toString('base64') };
    if (Array.isArray(v)) return v.map(encode);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)]));
    return v;
};

const stamp = new Date().toISOString().slice(0, 10);
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, `crate-backup-${stamp}.ndjson.gz`);
const gz = zlib.createGzip();
const out = fs.createWriteStream(file);
gz.pipe(out);
const write = (obj) => new Promise(res => { if (!gz.write(JSON.stringify(obj) + '\n')) gz.once('drain', res); else res(); });

const counts = {};
let total = 0;

async function dumpCollection(col, top) {
    let last = null;
    for (;;) {
        let q = col.orderBy('__name__').limit(500);
        if (last) q = q.startAfter(last);
        const snap = await q.get();
        if (snap.empty) break;
        for (const doc of snap.docs) {
            await write({ path: doc.ref.path, data: encode(doc.data()) });
            counts[top] = (counts[top] || 0) + 1;
            total++;
            for (const sub of await doc.ref.listCollections()) await dumpCollection(sub, top);
        }
        last = snap.docs[snap.docs.length - 1];
        process.stdout.write(`\r  ${top}: ${counts[top]} documents…`);
    }
}

console.log(`\nBacking up the CRATE TV database to\n   ${file}\n`);
await write({ backup: 'crate-firestore', version: 1, createdAt: new Date().toISOString(), project: db.app.options.credential?.projectId || null, skipped: [...skip] });
for (const col of await db.listCollections()) {
    if (skip.has(col.id)) { console.log(`  ${col.id}: skipped`); continue; }
    await dumpCollection(col, col.id);
    process.stdout.write(`\r  ${col.id}: ${counts[col.id] || 0} documents      \n`);
}
gz.end();
await new Promise(res => out.on('finish', res));
const mb = (fs.statSync(file).size / 1024 / 1024).toFixed(1);
console.log(`\n✓ Backup complete: ${total} documents in ${Object.keys(counts).length} collections (${mb} MB)`);
console.log(`  ${file}`);
console.log('\nKeep a copy somewhere other than this computer. It contains customer emails — keep it private.\n');
process.exit(0);
