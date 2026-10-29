import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeValue, backupLine, backupHeader, foldersToDelete, backupFolder, backupHealth } from '../api/_lib/backup.js';

const ts = (iso: string) => ({ seconds: Date.parse(iso) / 1000, nanoseconds: 0, toDate: () => new Date(iso) });

test('serializeValue keeps plain data and turns special values into markers', () => {
    const out = serializeValue({ a: 1, b: 'x', c: [1, { t: ts('2026-10-29T10:00:00.000Z') }], d: null, e: { path: 'users/u1', firestore: {} }, f: new Uint8Array([1, 2]) });
    assert.deepEqual(out, { a: 1, b: 'x', c: [1, { t: { __type: 'timestamp', value: '2026-10-29T10:00:00.000Z' } }], d: null, e: { __type: 'ref', path: 'users/u1' }, f: { __type: 'bytes', base64: 'AQI=' } });
});

test('backupLine is one JSON line ending in a newline', () => {
    const l = backupLine('movies/a', { title: 'A' });
    assert.ok(l.endsWith('\n'));
    assert.deepEqual(JSON.parse(l), { path: 'movies/a', data: { title: 'A' } });
});

test('folders: newest 8 kept, strangers ignored', () => {
    const f = Array.from({ length: 10 }, (_, i) => `crate-backups/2026-09-${String(i + 1).padStart(2, '0')}/`);
    const del = foldersToDelete([...f, 'crate-backups/notes/', 'other/2026-01-01/']);
    assert.deepEqual(del, f.slice(0, 2));
    assert.deepEqual(foldersToDelete(f.slice(0, 5)), []);
});

test('backupFolder uses the date', () => {
    assert.equal(backupFolder(new Date('2026-11-01T07:00:00Z')), 'crate-backups/2026-11-01/');
});

test('backupHealth tones', () => {
    const now = Date.parse('2026-11-10T00:00:00Z');
    assert.equal(backupHealth(false, null, now).tone, 'warn');
    assert.equal(backupHealth(true, null, now).tone, 'warn');
    assert.equal(backupHealth(true, { ok: true, at: '2026-11-09T00:00:00Z', documents: 5, collections: 2 }, now).tone, 'good');
    assert.equal(backupHealth(true, { ok: true, at: '2026-10-25T00:00:00Z' }, now).tone, 'bad');
    assert.equal(backupHealth(true, { ok: false, at: '2026-11-09T00:00:00Z', error: 'x' }, now).tone, 'bad');
});

test('backup file starts with the same kind of header line as npm run backup', () => {
    const h = JSON.parse(backupHeader(new Date('2026-11-01T07:00:00Z')));
    assert.equal(h.backup, 'crate-firestore');
    assert.equal(h.version, 1);
});
