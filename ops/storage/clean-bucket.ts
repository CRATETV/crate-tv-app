// ops/storage/clean-bucket.ts — delete video files CRATE no longer uses.
//
// Run from the project folder, in two steps:
//
//   1. See what would go (deletes NOTHING):
//        npx tsx ops/storage/clean-bucket.ts
//      Writes a list to your Desktop: crate-bucket-cleanup.csv
//
//   2. Delete exactly that list (asks you to type DELETE first):
//        npx tsx ops/storage/clean-bucket.ts --delete
//
// What counts as "not in use", and what is always kept: api/_lib/storageCleanup.ts.
// Needs: the aws command (already set up for ops/video) and your admin password
// (typed in, never saved). Deleting is permanent.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline';
import { buildPlan, gb, monthlyCost, type BucketObject, type PlanItem } from '../../api/_lib/storageCleanup';

const BUCKET = process.env.CRATE_BUCKET || 'cratetelevision';
const SITE = process.env.CRATE_SITE || 'https://cratetv.net';
const OUT_DIR = existsSync(join(homedir(), 'Desktop')) ? join(homedir(), 'Desktop') : process.cwd();
const PLAN_JSON = join(OUT_DIR, 'crate-bucket-cleanup.json');
const PLAN_CSV = join(OUT_DIR, 'crate-bucket-cleanup.csv');
const DONE_CSV = join(OUT_DIR, 'crate-bucket-cleanup-deleted.csv');
const PLAN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const fmtGb = (bytes: number) => `${gb(bytes).toFixed(2)} GB`;
const money = (n: number) => `$${n.toFixed(2)}`;

// One reader for the whole run (a fresh one per question can lose typed lines).
let rl: readline.Interface | null = null;
let muted = false;
const lineQueue: string[] = [];
const waiting: ((line: string | null) => void)[] = [];
let inputClosed = false;
function reader(): readline.Interface {
    if (rl) return rl;
    rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
    const r: any = rl;
    const write = r._writeToOutput?.bind(r);
    if (write) r._writeToOutput = (str: string) => { if (!muted || /:\s*$/.test(str)) write(str); };
    rl.on('line', line => { const w = waiting.shift(); if (w) w(line); else lineQueue.push(line); });
    rl.on('close', () => { inputClosed = true; while (waiting.length) waiting.shift()!(null); });
    return rl;
}
function ask(question: string, hidden = false): Promise<string> {
    reader();
    process.stdout.write(question);
    muted = hidden;
    return new Promise(resolve => {
        const done = (line: string | null) => { if (hidden) { muted = false; process.stdout.write('\n'); } resolve((line ?? '').trim()); };
        if (lineQueue.length) return done(lineQueue.shift()!);
        if (inputClosed) return done(null);
        waiting.push(done);
    });
}
const closeReader = () => { rl?.close(); };

function aws(args: string[]): string {
    return execFileSync('aws', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 });
}

async function loadSiteData(password: string): Promise<any> {
    const res = await fetch(`${SITE}/api/get-live-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, noCache: true }),
    });
    const data: any = await res.json().catch(() => null);
    if (res.status === 401) throw new Error('That admin password was not accepted.');
    // The endpoint answers "re-syncing" or built-in sample data when it can't
    // read the real catalog: never plan deletions from that.
    const films = Object.values(data?.movies || {}) as any[];
    if (!data || data.error || films.length < 10 || !films.some(m => typeof m?.fullMovie === 'string' && m.fullMovie)) {
        throw new Error('Could not load the real CRATE catalog right now (it may be re-syncing). Nothing was planned. Try again in a few minutes.');
    }
    return data;
}

function listBucket(): BucketObject[] {
    const raw = aws(['s3api', 'list-objects-v2', '--bucket', BUCKET, '--output', 'json']);
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    return (parsed.Contents || []).map((o: any) => ({ Key: o.Key, Size: Number(o.Size) || 0, LastModified: o.LastModified }));
}

const csvCell = (s: string) => `"${String(s).replace(/"/g, '""')}"`;

async function main() {
    const doDelete = process.argv.includes('--delete');
    console.log(bold(doDelete ? 'CRATE bucket clean-up: DELETE step' : 'CRATE bucket clean-up: planning (nothing will be deleted)'));
    try { aws(['--version']); } catch { console.log(red('The aws command is not available. It is the same one ops/video uses.')); process.exit(1); }

    const password = await ask('Admin password (not saved): ', true);
    console.log('Loading CRATE films...');
    const data = await loadSiteData(password);
    console.log(`Loading the list of files in ${BUCKET} (can take a minute)...`);
    const objects = listBucket();
    const now = Date.now();
    const { plan, keptVideos, filmsInUse, filmsNotInUse } = buildPlan(objects, data, now);
    const total = plan.reduce((s, p) => s + p.size, 0);

    console.log('');
    console.log(`Films in use: ${filmsInUse}   Films not in use (hidden, past): ${filmsNotInUse}`);
    console.log(`Video files kept: ${keptVideos}`);
    console.log(bold(`Video files to delete: ${plan.length}  (${fmtGb(total)}, about ${money(monthlyCost(total))} a month)`));

    if (!doDelete) {
        writeFileSync(PLAN_JSON, JSON.stringify({ createdAt: now, bucket: BUCKET, items: plan }, null, 2));
        writeFileSync(PLAN_CSV, ['File,Size (GB),Why'].concat(plan.map(p => [csvCell(p.key), gb(p.size).toFixed(3), csvCell(p.reason)].join(','))).join('\n'));
        console.log('');
        console.log(`The full list is on your Desktop: ${green('crate-bucket-cleanup.csv')} (biggest first). Nothing was deleted.`);
        console.log('Look through it. If anything on it should stay, make that film visible (or switch its watch party on) and run this again.');
        console.log(`When you're happy, run:  ${bold('npx tsx ops/storage/clean-bucket.ts --delete')}`);
        return;
    }

    // --- DELETE: only files on the saved list that are STILL not in use ---
    if (!existsSync(PLAN_JSON)) { console.log(red('No list found. Run the planning step first (without --delete).')); process.exit(1); }
    const saved = JSON.parse(readFileSync(PLAN_JSON, 'utf8')) as { createdAt: number; bucket: string; items: PlanItem[] };
    if (saved.bucket !== BUCKET || now - saved.createdAt > PLAN_MAX_AGE_MS) {
        console.log(red('The saved list is more than a day old (or for another bucket). Run the planning step again first.'));
        process.exit(1);
    }
    const stillUnused = new Set(plan.map(p => p.key));
    const toDelete = saved.items.filter(i => stillUnused.has(i.key));
    const skipped = saved.items.length - toDelete.length;
    const delBytes = toDelete.reduce((s, p) => s + p.size, 0);
    if (skipped) console.log(`${skipped} file(s) on the list are in use again now and will be KEPT.`);
    if (toDelete.length === 0) { console.log('Nothing to delete.'); return; }

    let versioning = '';
    try { versioning = JSON.parse(aws(['s3api', 'get-bucket-versioning', '--bucket', BUCKET, '--output', 'json']) || '{}').Status || ''; } catch { /* unknown */ }
    if (versioning) {
        console.log(red(`Note: this bucket has versioning "${versioning}". Deleting hides the files, but AWS keeps old copies (and bills for them) until a lifecycle rule removes them. Tell Claude and it'll give you the one-time setting.`));
    }

    console.log('');
    console.log(red(bold(`This permanently deletes ${toDelete.length} video files (${fmtGb(delBytes)}) from ${BUCKET}. It cannot be undone.`)));
    const confirm = await ask('Type DELETE to go ahead, anything else to stop: ');
    if (confirm !== 'DELETE') { console.log('Stopped. Nothing was deleted.'); return; }

    const dir = mkdtempSync(join(tmpdir(), 'crate-clean-'));
    const done: string[] = ['File,Size (GB),Result'];
    let deleted = 0, failed = 0;
    for (let i = 0; i < toDelete.length; i += 1000) {
        const batch = toDelete.slice(i, i + 1000);
        const file = join(dir, `batch-${i}.json`);
        writeFileSync(file, JSON.stringify({ Objects: batch.map(b => ({ Key: b.key })), Quiet: false }));
        let result: any = {};
        try { result = JSON.parse(aws(['s3api', 'delete-objects', '--bucket', BUCKET, '--delete', `file://${file}`, '--output', 'json']) || '{}'); }
        catch (e) { result = { Errors: batch.map(b => ({ Key: b.key, Message: (e as Error).message })) }; }
        const ok = new Set((result.Deleted || []).map((d: any) => d.Key));
        for (const b of batch) {
            if (ok.has(b.key)) { deleted++; done.push([csvCell(b.key), gb(b.size).toFixed(3), 'deleted'].join(',')); }
            else { failed++; done.push([csvCell(b.key), gb(b.size).toFixed(3), 'NOT deleted'].join(',')); }
        }
        console.log(`  ${Math.min(i + 1000, toDelete.length)} / ${toDelete.length}`);
    }
    writeFileSync(DONE_CSV, done.join('\n'));
    console.log('');
    console.log(green(bold(`Done: ${deleted} deleted${failed ? `, ${failed} could not be deleted` : ''}.`)) + ` A record is on your Desktop: crate-bucket-cleanup-deleted.csv`);
}

main().then(closeReader).catch(e => { closeReader(); console.error(red(`Stopped: ${(e as Error).message}`)); process.exit(1); });
