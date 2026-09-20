/**
 * Input hygiene for anything a member of the public can send us
 * (film submissions, contact forms, etc.).
 *
 * Rule of thumb: never trust a submitted string. Clean it on the way IN
 * (length caps, control characters, URL scheme checks) and escape it on the
 * way OUT (HTML emails). Both matter — the first protects the admin panel and
 * database, the second protects whoever opens the notification email.
 */

/** Escape a value for safe interpolation into an HTML email/template. */
export const escapeHtml = (value: unknown): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

// Everything in the C0 range plus DEL, except tab / newline / carriage return.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Multi-line text: strips control characters, trims, and caps the length. */
export const cleanText = (value: unknown, maxLength: number): string => {
    if (typeof value === 'number' && Number.isFinite(value)) value = String(value);
    if (typeof value !== 'string') return '';
    return value.replace(CONTROL_CHARS, '').trim().slice(0, maxLength);
};

/** Single-line text: same as cleanText, with any line breaks collapsed to a space. */
export const cleanLine = (value: unknown, maxLength: number): string =>
    cleanText(value, maxLength * 2).replace(/\s*[\r\n]+\s*/g, ' ').slice(0, maxLength);

export const isValidEmail = (value: string): boolean =>
    value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

interface SafeUrlOptions {
    /** Only accept these exact hostnames (lowercase). */
    allowedHosts?: string[];
    /** Accept plain http:// as well as https://. */
    allowHttp?: boolean;
    /** If the value has no scheme at all ("example.com"), treat it as https://. */
    assumeHttps?: boolean;
    maxLength?: number;
}

/**
 * Returns a normalized http(s) URL, or '' if the value isn't a safe web link.
 * This is what stops `javascript:`, `data:`, `file:` etc. from ever being stored
 * and later rendered as a clickable link in the admin panel.
 */
export const safeHttpUrl = (value: unknown, opts: SafeUrlOptions = {}): string => {
    if (typeof value !== 'string') return '';
    let raw = value.replace(CONTROL_CHARS, '').trim();
    if (!raw || raw.length > (opts.maxLength ?? 2048)) return '';
    if (opts.assumeHttps && !/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`;

    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        return '';
    }

    if (url.protocol !== 'https:' && !(opts.allowHttp && url.protocol === 'http:')) return '';
    if (url.username || url.password) return '';
    if (opts.allowedHosts && !opts.allowedHosts.includes(url.hostname.toLowerCase())) return '';
    return url.toString();
};
