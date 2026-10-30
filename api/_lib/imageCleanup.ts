// api/_lib/imageCleanup.ts
//
// Decides which POSTER / PHOTO files in the S3 bucket can be deleted (Oct 2026).
// Used by Admin → Storage clean-up (api/admin-storage-cleanup.ts, action
// 'scanImages' / 'deleteImages'). Pure (no network), tested in
// tests/imageCleanup.test.ts.
//
// An image is listed ONLY when nothing points at it. "Points at it" is wide on
// purpose: every web address anywhere in the site data (visible AND hidden
// films, actors, festivals, settings), every web address in the extra
// records passed in (actor profiles, film submissions, stories...), and the
// pictures the site's own code links to.
//
// NEVER listed, whatever else happens:
//   - anything uploaded in the last 14 days (it may not be saved on a film yet)
//   - files in folders other tools own: submissions/, partners/, originals/,
//     hsl/, backups/ and the data files themselves
//   - a file whose NAME matches a picture something uses (kept in case it is
//     reached through a different web address)
import { CODE_LINKED_URLS } from './codeLinkedFiles.js';
import { collectUrls, keysFromUrl, type BucketObject } from './storageCleanup.js';

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.heic'];
const RECENT_MS = 14 * 24 * 60 * 60 * 1000;
export const IMAGE_SKIP_FOLDERS = ['submissions/', 'partners/', 'originals/', 'hsl/', 'backups/', 'backup/'];

export const isImageKey = (key: string) => {
    const k = key.toLowerCase();
    return IMAGE_EXTENSIONS.some(ext => k.endsWith(ext));
};
const baseName = (key: string) => key.split('/').pop()!.toLowerCase();

export interface ImageItem { key: string; size: number; reason: string; lastModified?: string }

export function buildImagePlan(objects: BucketObject[], data: any, extraRecords: unknown[], nowMs: number): { items: ImageItem[]; keptImages: number; totalImages: number } {
    const protectedKeys = new Set<string>();
    const protect = (url: string) => { for (const k of keysFromUrl(url)) protectedKeys.add(k); };
    collectUrls(data).forEach(protect);
    for (const rec of extraRecords) collectUrls(rec).forEach(protect);
    CODE_LINKED_URLS.forEach(protect);
    const protectedNames = new Set([...protectedKeys].filter(isImageKey).map(baseName));

    const items: ImageItem[] = [];
    let keptImages = 0, totalImages = 0;
    for (const o of objects) {
        if (!o?.Key || !isImageKey(o.Key)) continue;
        totalImages++;
        const lower = o.Key.toLowerCase();
        if (IMAGE_SKIP_FOLDERS.some(f => lower.startsWith(f))) { keptImages++; continue; }
        const lm = o.LastModified ? Date.parse(o.LastModified) : NaN;
        // Unknown date counts as recent: when in doubt, keep.
        const recent = !Number.isFinite(lm) || nowMs - lm < RECENT_MS;
        if (protectedKeys.has(o.Key) || protectedNames.has(baseName(o.Key)) || recent) { keptImages++; continue; }
        items.push({ key: o.Key, size: o.Size || 0, reason: 'not used anywhere on CRATE', lastModified: o.LastModified });
    }
    items.sort((a, b) => b.size - a.size);
    return { items, keptImages, totalImages };
}
