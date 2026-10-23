// The full published data (with every film's real video link) is stored in
// S3 scrambled, so nobody can read it even though the bucket is public.
// Only the server, which holds the secret, can unscramble it.
//
// Before Oct 23 2026 the full data sat in the public file live-data.json, so
// anyone could download every paid film's link. live-data.json now holds a
// public-safe copy (no video links); this file holds the real one.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export const PRIVATE_SNAPSHOT_KEY = 'private/live-data.enc';
const MAGIC = Buffer.from('CRS1');

function snapshotKey(): Buffer | null {
    const secret = process.env.PRIVATE_SNAPSHOT_SECRET || process.env.AWS_SECRET_ACCESS_KEY;
    if (!secret) return null;
    return createHash('sha256').update(`crate-private-snapshot-v1:${secret}`).digest();
}

export function sealSnapshot(data: unknown): Buffer | null {
    const key = snapshotKey();
    if (!key) return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const body = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
    return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
}

export function openSnapshot(sealed: Uint8Array): any {
    const key = snapshotKey();
    if (!key) throw new Error('No snapshot secret configured.');
    const buf = Buffer.from(sealed);
    if (!buf.subarray(0, 4).equals(MAGIC)) throw new Error('Not a CRATE snapshot.');
    const iv = buf.subarray(4, 16);
    const tag = buf.subarray(16, 32);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(buf.subarray(32)), decipher.final()]).toString('utf8');
    return JSON.parse(json);
}
