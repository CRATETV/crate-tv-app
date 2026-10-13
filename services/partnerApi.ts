// services/partnerApi.ts — browser helpers for "Festival in a box".

export type GetToken = () => Promise<string | null | undefined>;

export async function callPartnerPortal<T = any>(getToken: GetToken, action: string, payload: Record<string, unknown> = {}): Promise<T> {
    const idToken = await getToken();
    if (!idToken) throw new Error('Please sign in again.');
    const res = await fetch('/api/partner-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, idToken, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data as T;
}

export async function callAdminPartners<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    const password = sessionStorage.getItem('adminPassword') || '';
    const res = await fetch('/api/admin-partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, password, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data as T;
}

/** Uploads a file straight to storage with a presigned link; returns its public URL. */
export async function uploadPartnerFile(
    getToken: GetToken,
    partnerId: string,
    kind: 'poster' | 'video' | 'logo' | 'hero',
    file: File,
    onProgress?: (pct: number) => void,
): Promise<string> {
    const fileType = file.type || (file.name.toLowerCase().endsWith('.mov') ? 'video/quicktime' : '');
    const { signedUrl, publicUrl } = await callPartnerPortal<{ signedUrl: string; publicUrl: string }>(getToken, 'uploadUrl', {
        partnerId, kind, fileName: file.name, fileType, size: file.size,
    });
    await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl, true);
        xhr.setRequestHeader('Content-Type', fileType);
        xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}). Please try again.`)));
        xhr.onerror = () => reject(new Error('Upload failed — check your connection and try again.'));
        xhr.send(file);
    });
    return publicUrl;
}

/** Reads a video file's length in the browser (no upload needed). Minutes, rounded up. */
export function readVideoMinutes(file: File): Promise<number | null> {
    return new Promise(resolve => {
        try {
            const url = URL.createObjectURL(file);
            const v = document.createElement('video');
            v.preload = 'metadata';
            const done = (val: number | null) => { URL.revokeObjectURL(url); resolve(val); };
            v.onloadedmetadata = () => done(Number.isFinite(v.duration) && v.duration > 0 ? Math.ceil(v.duration / 60) : null);
            v.onerror = () => done(null);
            setTimeout(() => done(null), 15000);
            v.src = url;
        } catch {
            resolve(null);
        }
    });
}

export const money = (n: number | undefined | null) =>
    (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/** ISO (UTC) → value for <input type="datetime-local"> in the viewer's time zone. */
export function isoToLocalInput(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function localInputToIso(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function formatWhen(iso: string, timeZone?: string): string {
    if (!iso) return 'Time to be announced';
    try {
        return new Date(iso).toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            timeZoneName: 'short', ...(timeZone ? { timeZone } : {}),
        });
    } catch {
        return new Date(iso).toLocaleString();
    }
}
