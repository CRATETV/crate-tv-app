// services/videoUpload.ts — the browser side of "Upload & convert" (Oct 2026),
// shared by the single-film box (components/admin/FilmUploadConvert.tsx) and
// the Bulk upload tab (components/admin/BulkFilmUploadTab.tsx).
// Uploads the original to S3 in 64 MB pieces (4 at a time, each retried),
// then asks AWS MediaConvert to make the streaming version.
// Server side: api/admin-video.ts.

export async function videoApi<T = any>(body: Record<string, unknown>): Promise<T> {
    let password = '';
    try { password = sessionStorage.getItem('adminPassword') || ''; } catch { /* no storage */ }
    const res = await fetch('/api/admin-video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data as T;
}

export interface JobStatus { status: string; percent: number | null; masterUrl: string | null; minutes: number | null; error: string | null; appliedToFilm?: boolean }

const PARALLEL = 4;
const SIGN_BATCH = 40;

/**
 * Uploads `file`, starts its conversion for film `movieKey`, and returns the
 * conversion's job id. `onProgress(percent, sentBytes)` reports the upload.
 */
export async function uploadAndConvert(
    file: File, movieKey: string, title: string,
    onProgress: (percent: number, sentBytes: number) => void,
): Promise<string> {
    let key = '', uploadId = '';
    try {
        const s = await videoApi<{ key: string; uploadId: string; partSize: number; parts: number }>({ action: 'start-upload', fileName: file.name, contentType: file.type, size: file.size });
        key = s.key; uploadId = s.uploadId;
        const total = s.parts;
        const done: { PartNumber: number; ETag: string }[] = [];
        const loaded = new Array(total + 1).fill(0);
        const report = () => {
            const sum = loaded.reduce((a, b) => a + b, 0);
            onProgress(Math.min(99, Math.floor((sum / file.size) * 100)), sum);
        };
        const putPart = (url: string, blob: Blob, n: number) => new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', url, true);
            xhr.upload.onprogress = ev => { loaded[n] = ev.loaded; report(); };
            xhr.onload = () => {
                if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(`piece ${n} failed (${xhr.status})`));
                const etag = xhr.getResponseHeader('ETag');
                if (!etag) return reject(new Error('S3 needs one setting first: in the bucket\'s CORS, add "ETag" to ExposeHeaders (see setup steps).'));
                resolve(etag);
            };
            xhr.onerror = () => reject(new Error(`piece ${n}: connection problem`));
            xhr.send(blob);
        });

        for (let first = 1; first <= total; first += SIGN_BATCH) {
            const nums = Array.from({ length: Math.min(SIGN_BATCH, total - first + 1) }, (_, i) => first + i);
            const { urls } = await videoApi<{ urls: Record<number, string> }>({ action: 'sign-parts', key, uploadId, partNumbers: nums });
            let idx = 0;
            const worker = async () => {
                while (idx < nums.length) {
                    const n = nums[idx++];
                    const blob = file.slice((n - 1) * s.partSize, Math.min(file.size, n * s.partSize));
                    let lastErr: unknown;
                    for (let attempt = 0; attempt < 3; attempt++) {
                        try { const etag = await putPart(urls[n], blob, n); done.push({ PartNumber: n, ETag: etag }); lastErr = null; break; }
                        catch (e) { lastErr = e; loaded[n] = 0; if (/ETag/.test((e as Error).message)) break; await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); }
                    }
                    if (lastErr) throw lastErr;
                    loaded[n] = blob.size; report();
                }
            };
            await Promise.all(Array.from({ length: Math.min(PARALLEL, nums.length) }, worker));
        }
        await videoApi({ action: 'complete-upload', key, uploadId, parts: done });
        onProgress(100, file.size);
        const c = await videoApi<{ jobId: string }>({ action: 'convert', key, movieKey, title });
        return c.jobId;
    } catch (e) {
        if (key && uploadId) videoApi({ action: 'abort-upload', key, uploadId }).catch(() => {});
        throw e;
    }
}
