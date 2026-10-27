import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CODE_LINKED_URLS } from '../api/_lib/codeLinkedFiles';
import { buildPlan, filmOnlyFiles } from '../api/_lib/storageCleanup';

const RX = /https:\/\/(?:cratetelevision\.s3[a-z0-9.-]*\.amazonaws\.com|d3jhtrl1gnrh4b\.cloudfront\.net)\/[^'"`\s)<>]+/g;
function codeLinks(): Set<string> {
    const out = new Set<string>();
    const scan = (f: string) => { let t = ''; try { t = readFileSync(f, 'utf8'); } catch { return; } for (const m of t.match(RX) || []) out.add(m); };
    const walk = (d: string) => {
        let e: string[] = []; try { e = readdirSync(d); } catch { return; }
        for (const n of e) {
            const p = join(d, n);
            if (statSync(p).isDirectory()) { if (n !== 'node_modules') walk(p); }
            else if (/\.(ts|tsx|js|brs|xml|html|json|css)$/.test(n) && !p.endsWith('codeLinkedFiles.ts')) scan(p);
        }
    };
    ['components', 'api', 'services', 'hooks', 'roku', 'public', 'src', 'utils', 'lib'].forEach(walk);
    ['App.tsx', 'constants.ts', 'index.html', 'index.tsx', 'vercel.json'].forEach(scan);
    return out;
}

test('every bucket file the site code links to is on the always-keep list', () => {
    const listed = new Set(CODE_LINKED_URLS);
    const missing = [...codeLinks()].filter(u => !listed.has(u));
    assert.deepEqual(missing, [], 'Add these to api/_lib/codeLinkedFiles.ts');
});

const B = 'https://cratetelevision.s3.us-east-1.amazonaws.com/';
const data: any = { movies: {
    a: { title: 'A', fullMovie: B + 'films/a.mp4' }, b: { title: 'B', fullMovie: B + 'films/b.mp4' }, c: { title: 'C', fullMovie: B + 'films/c.mp4' },
    d: { title: 'D', fullMovie: B + 'films/d.mp4' }, e: { title: 'E', fullMovie: B + 'films/e.mp4' }, f: { title: 'F', fullMovie: B + 'films/f.mp4' },
    g: { title: 'G', fullMovie: B + 'films/g.mp4' }, h: { title: 'H', fullMovie: B + 'films/h.mp4' }, i: { title: 'I', fullMovie: B + 'films/i.mp4' },
    gone: { title: 'Gone', isUnlisted: true, fullMovie: B + 'New+Intro+.mp4', poster: 'https://d3jhtrl1gnrh4b.cloudfront.net/photos+/Defaultpic.png' },
} };
const OLD = '2026-01-01T00:00:00Z';

test('clean-up never lists the website intro or the Roku built-in videos', () => {
    const objects = [
        { Key: 'New Intro .mp4', Size: 5, LastModified: OLD },
        { Key: 'Ruko compatible movies /Autumn_roku.mp4', Size: 5, LastModified: OLD },
        { Key: 'random/unused.mov', Size: 5, LastModified: OLD },
    ];
    const keys = buildPlan(objects, data, Date.parse('2026-10-27T00:00:00Z')).plan.map(p => p.key);
    assert.deepEqual(keys, ['random/unused.mov']);
});

test('removing a film never takes a file the code uses, even if the film pointed at it', () => {
    const objects = [{ Key: 'New Intro .mp4', Size: 5 }, { Key: 'photos /Defaultpic.png', Size: 1 }];
    assert.deepEqual(filmOnlyFiles('gone', data, objects).keys, []);
});
