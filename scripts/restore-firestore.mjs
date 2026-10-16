// Restore from a CRATE TV database backup (made with `npm run backup`).
//
// SAFE BY DEFAULT: without --confirm it only shows what it WOULD do.
//
//   Preview a restore of one collection:
//     npm run restore -- ~/crate-backups/crate-backup-2026-10-16.ndjson.gz --only movies
//
//   Bring back a single deleted document:
//     npm run restore -- <backup file> --only movies/luna --confirm
//
//   Restore only documents that are MISSING now (never overwrites anything):
//     npm run restore -- <backup file> --only payout_requests --missing-only --confirm
//
// --only is required, so a whole-database overwrite can't happen by accident.
// Without --missing-only, existing documents in the chosen collection are
// replaced with their backed-up version.
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import readline from 'readline';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, GeoPoint } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--') && !['--only'].includes(args[args.indexOf(a) - 1]));
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const only = opt('only');
const confirm = args.includes('--confirm');
const missingOnly = args.includes('--missing-only');
const keyPath = process.env.CRATE_ADMIN_KEY || path.join(os.homedir(), 'keys', 'crate-firebase-admin.json');

if (!file || !fs.existsSync(file)) { console.error('\n✗ Give the backup file to restore from.\n   npm run restore -- ~/crate-backups/crate-backup-YYYY-MM-DD.ndjson.gz --only movies\n'); process.exit(1); }
if (!only) { console.error('\n✗ Say what to restore with --only, e.g. --only movies  or  --only movies/luna\n'); process.exit(1); }
if (!fs.existsSync(keyPath)) { console.error(`\n✗ Can't find the Firebase admin key at ${keyPath}\n`); process.exit(1); }

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) });
const db = getFirestore();

const decode = (v) => {
    if (Array.isArray(v)) return v.map(decode);
    if (v && typeof v === 'object') {
        if (v.__type === 'timestamp') return Timestamp.fromDate(new Date(v.value));
        if (v.__type === 'geopoint') return new GeoPoint(v.lat, v.lng);
        if (v.__type === 'ref') return db.doc(v.path);
        if (v.__type === 'bytes') return Buffer.from(v.base64, 'base64');
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decode(x)]));
    }
    return v;
};

const matches = (p) => p === only || p.startsWith(`${only}/`);
const rl = readline.createInterface({ input: fs.createReadStream(file).pipe(zlib.createGunzip()), crlfDelay: Infinity });

let seen = 0, written = 0, skippedExisting = 0;
console.log(`\n${confirm ? 'Restoring' : 'Preview (nothing will be written — add --confirm to restore)'}: ${only}${missingOnly ? ' (missing documents only)' : ''}\n`);
for await (const line of rl) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (!row.path || !matches(row.path)) continue;
    seen++;
    const ref = db.doc(row.path);
    if (missingOnly && (await ref.get()).exists) { skippedExisting++; continue; }
    if (confirm) { await ref.set(decode(row.data)); written++; }
    if (seen <= 20) console.log(`  ${confirm ? '✓' : '•'} ${row.path}`);
}
if (seen > 20) console.log(`  … and ${seen - 20} more`);
console.log(`\n${seen} matching document(s) in the backup.${missingOnly ? ` ${skippedExisting} already exist and were left alone.` : ''}`);
console.log(confirm ? `✓ ${written} restored.\n` : 'Nothing was changed. Add --confirm to restore.\n');
process.exit(0);
