// api/_lib/mailLog.ts
//
// The pieces behind the dashboard mailbox: what counts as an allowed
// attachment, how an incoming email (from Resend) is checked and saved, and
// how a message is shown in the list. Kept free of network calls so it can be
// tested.

import { createHmac, timingSafeEqual } from 'crypto';

export const MAIL_COLLECTION = 'mail_messages';
/** Where the saved signatures live (a document of their own, so site settings can't overwrite it). */
export const SIGNATURES_DOC = 'mail_config/signatures';

export const MAX_ATTACHMENTS = 5;
// Vercel accepts about 4.5 MB per request and email attachments grow by about a
// third when sent as text, so 3 MB of files in total is the safe ceiling.
export const MAX_ATTACHMENT_TOTAL_BYTES = 3_000_000;

const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'ppt', 'pptx'];

export interface PreparedAttachment { filename: string; content: Buffer; size: number; }
export type AttachmentResult = { ok: true; files: PreparedAttachment[] } | { ok: false; error: string };

/** Plain, safe file name: no folders, no odd characters. */
export function cleanFilename(name: unknown): string {
    const raw = typeof name === 'string' ? name : '';
    const base = raw.split(/[\\/]/).pop() || '';
    const cleaned = base.replace(/[^\w.\- ()]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
    return cleaned || 'attachment';
}

/**
 * Checks the files that came from the dashboard: [{ filename, content }]
 * where content is the file as base64 text (a "data:...;base64," start is fine).
 */
export function prepareAttachments(input: unknown): AttachmentResult {
    if (input === undefined || input === null || (Array.isArray(input) && input.length === 0)) return { ok: true, files: [] };
    if (!Array.isArray(input)) return { ok: false, error: 'Attachments were not understood.' };
    if (input.length > MAX_ATTACHMENTS) return { ok: false, error: `You can attach up to ${MAX_ATTACHMENTS} files per email.` };

    const files: PreparedAttachment[] = [];
    let total = 0;
    for (const item of input) {
        const filename = cleanFilename((item as any)?.filename);
        const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return { ok: false, error: `"${filename}" can't be attached. Allowed: PDF, pictures (PNG, JPG, WEBP, GIF), Word, Excel, PowerPoint, CSV and text files.` };
        }
        const text = typeof (item as any)?.content === 'string' ? (item as any).content : '';
        const base64 = text.replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
        if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return { ok: false, error: `"${filename}" could not be read. Try attaching it again.` };
        const content = Buffer.from(base64, 'base64');
        if (content.length === 0) return { ok: false, error: `"${filename}" is empty.` };
        total += content.length;
        if (total > MAX_ATTACHMENT_TOTAL_BYTES) {
            return { ok: false, error: `Attachments are too big. Keep the total under ${Math.round(MAX_ATTACHMENT_TOTAL_BYTES / 1_000_000)} MB (a receipt or two as PDF is no problem).` };
        }
        files.push({ filename, content, size: content.length });
    }
    return { ok: true, files };
}

export const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function stripHtml(html: string): string {
    return html
        .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/** Splits `Name <a@b.com>` into its parts. */
export function parseAddress(value: unknown): { name: string; email: string } {
    const s = typeof value === 'string' ? value.trim() : '';
    const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
    if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
    return { name: '', email: s.toLowerCase() };
}

// ── Resend → us (incoming email) ──────────────────────────────────────────

/**
 * Resend signs every webhook (Svix scheme). Returns true only when the
 * signature matches the secret and the timestamp is recent.
 */
export function verifyWebhookSignature(args: {
    id: string | null; timestamp: string | null; signature: string | null;
    payload: string; secret: string; nowMs?: number; toleranceSec?: number;
}): boolean {
    const { id, timestamp, signature, payload, secret } = args;
    if (!id || !timestamp || !signature || !secret) return false;
    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return false;
    const now = Math.floor((args.nowMs ?? Date.now()) / 1000);
    if (Math.abs(now - ts) > (args.toleranceSec ?? 300)) return false;

    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${payload}`).digest();
    for (const part of signature.split(' ')) {
        const [version, value] = part.split(',');
        if (version !== 'v1' || !value) continue;
        const given = Buffer.from(value, 'base64');
        if (given.length === expected.length && timingSafeEqual(given, expected)) return true;
    }
    return false;
}

export interface InboundEvent {
    emailId: string; from: string; to: string[]; subject: string; messageId: string;
    attachments: { id: string; filename: string; contentType: string }[];
}

/** Reads a Resend "email.received" webhook. Returns null for anything else. */
export function parseInboundEvent(body: any): InboundEvent | null {
    if (!body || body.type !== 'email.received' || !body.data || typeof body.data.email_id !== 'string') return null;
    const d = body.data;
    return {
        emailId: d.email_id,
        from: typeof d.from === 'string' ? d.from : '',
        to: Array.isArray(d.to) ? d.to.filter((x: unknown) => typeof x === 'string') : [],
        subject: typeof d.subject === 'string' ? d.subject : '',
        messageId: typeof d.message_id === 'string' ? d.message_id : '',
        attachments: Array.isArray(d.attachments)
            ? d.attachments.map((a: any) => ({ id: String(a?.id || ''), filename: cleanFilename(a?.filename), contentType: String(a?.content_type || '') }))
            : [],
    };
}

/** The saved record for one received email. `full` is Resend's "retrieve received email" answer (may be null). */
export function buildInboundRecord(event: InboundEvent, full: any, nowIso: string) {
    const headerFrom = full?.headers?.from ?? full?.headers?.From;
    const who = parseAddress(headerFrom || event.from);
    const text = typeof full?.text === 'string' && full.text.trim()
        ? full.text.trim()
        : typeof full?.html === 'string' ? stripHtml(full.html) : '';
    const sizes = new Map<string, number>((Array.isArray(full?.attachments) ? full.attachments : []).map((a: any) => [String(a?.id), Number(a?.size) || 0]));
    return {
        direction: 'in' as const,
        resendId: event.emailId,
        fromName: who.name,
        fromEmail: who.email || event.from.toLowerCase(),
        to: event.to,
        subject: event.subject || '(no subject)',
        text: text.slice(0, 60_000),
        attachments: event.attachments.map(a => ({ id: a.id, filename: a.filename, type: a.contentType, size: sizes.get(a.id) || 0 })),
        messageId: event.messageId,
        createdAt: nowIso,
        read: false,
    };
}

/** The saved record for one sent email (file contents are not kept, only names and sizes). */
export function buildSentRecord(args: {
    resendId?: string; fromEmail: string; to: string; subject: string; text: string;
    files: { filename: string; size: number }[]; sentBy?: string; movieTitle?: string; nowIso: string;
}) {
    return {
        direction: 'out' as const,
        resendId: args.resendId || '',
        fromEmail: args.fromEmail,
        to: [args.to],
        subject: args.subject,
        text: args.text.slice(0, 60_000),
        attachments: args.files.map(f => ({ filename: f.filename, size: f.size })),
        sentBy: args.sentBy || '',
        movieTitle: args.movieTitle || '',
        createdAt: args.nowIso,
        read: true,
    };
}

/** Where replies should go: the dashboard address if one is set up, otherwise the normal studio address. */
export function replyToAddress(env: { MAIL_INBOUND_ADDRESS?: string }, businessEmail: string): string {
    const a = (env.MAIL_INBOUND_ADDRESS || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a) ? a : businessEmail;
}

// ── Signatures ────────────────────────────────────────────────────────────

export interface MailSignature { id: string; name: string; text: string; ownerOnly?: boolean; }

export const DEFAULT_SIGNATURES: MailSignature[] = [
    { id: 'crate-team', name: 'Crate Team', text: 'The Crate TV Team\nTelevision powered by Creatives.\ncratetv.net' },
    { id: 'salome', name: 'Salome Denoon (Founder)', text: 'Salome Denoon\nFounder | Crate TV\nTelevision powered by Creatives.\ncratetv.net', ownerOnly: true },
];

export const MAX_SIGNATURES = 12;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/** Cleans a list of signatures coming from the screen or the database. Falls back to the two defaults. */
export function normalizeSignatures(input: unknown): MailSignature[] {
    if (!Array.isArray(input) || input.length === 0) return DEFAULT_SIGNATURES.map(s => ({ ...s }));
    const seen = new Set<string>();
    const out: MailSignature[] = [];
    for (const raw of input.slice(0, MAX_SIGNATURES)) {
        const name = (typeof raw?.name === 'string' ? raw.name : '').replace(/<[^>]*>/g, '').trim().slice(0, 40);
        const text = (typeof raw?.text === 'string' ? raw.text : '').replace(/<[^>]*>/g, '').replace(/\r\n/g, '\n').trim().slice(0, 600);
        if (!name || !text) continue;
        let id = slug(typeof raw?.id === 'string' && raw.id ? raw.id : name) || 'signature';
        while (seen.has(id)) id = `${id}-2`;
        seen.add(id);
        out.push({ id, name, text, ...(raw?.ownerOnly ? { ownerOnly: true } : {}) });
    }
    return out.length ? out : DEFAULT_SIGNATURES.map(s => ({ ...s }));
}

/** Only the owner sees (and can use) owner-only signatures. */
export const visibleSignatures = (list: MailSignature[], isOwner: boolean) => list.filter(s => isOwner || !s.ownerOnly);

const LINKABLE = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|(?<![@\w.-])((?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:net|com|org|tv|co|io)\b(?:\/[^\s<]*)?)/gi;

/** The signature as email HTML: first line bold, web addresses and emails clickable. */
export function renderSignatureHtml(sig: MailSignature): string {
    const lines = sig.text.split('\n').map(l => l.trim());
    const html = lines.map((line, i) => {
        let out = '', last = 0;
        for (const m of line.matchAll(LINKABLE)) {
            out += escapeHtml(line.slice(last, m.index));
            if (m[1]) out += `<a href="mailto:${escapeHtml(m[1])}" style="color:#ef4444;text-decoration:none;">${escapeHtml(m[1])}</a>`;
            else {
                const url = /^https?:/i.test(m[2]) ? m[2] : `https://${m[2]}`;
                out += `<a href="${escapeHtml(url)}" style="color:#ef4444;text-decoration:none;">${escapeHtml(m[2])}</a>`;
            }
            last = (m.index ?? 0) + m[0].length;
        }
        out += escapeHtml(line.slice(last));
        if (!line) return '<br>';
        return i === 0 ? `<strong style="color:#1a1a1a;font-size:15px;">${out}</strong>` : out;
    });
    return html.join('<br>');
}
