// Recording signatures. Used by /api/contracts (signing links) and by the
// actor profile signup (Actor Portal Agreement).
//
// Each signature stores the exact text that was shown, its template version,
// a SHA-256 fingerprint of that text, the typed name, email, time, IP address
// and browser — the usual evidence for an electronic signature under the US
// ESIGN Act. Signatures are never edited afterwards.
import { createHash, randomBytes } from 'crypto';
import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { ContractTemplate, getTemplate } from './contractTemplates.js';

export const fingerprint = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

export interface SignatureInput {
    template: ContractTemplate;
    text: string;
    signerName: string;
    signerEmail: string;
    typedSignature: string;
    ip: string;
    userAgent: string;
    context: 'signing-link' | 'actor-signup';
    requestToken?: string;
    movieKey?: string;
    filmTitle?: string;
    filmmakerPercent?: number;
}

export async function recordSignature(db: Firestore, s: SignatureInput): Promise<string> {
    const ref = await db.collection('contract_signatures').add({
        templateId: s.template.id,
        templateTitle: s.template.title,
        templateVersion: s.template.version,
        text: s.text,
        textSha256: fingerprint(s.text),
        signerName: s.signerName,
        signerEmail: s.signerEmail,
        typedSignature: s.typedSignature,
        agreed: true,
        signedAt: FieldValue.serverTimestamp(),
        signedAtIso: new Date().toISOString(),
        ip: s.ip,
        userAgent: s.userAgent.slice(0, 400),
        context: s.context,
        requestToken: s.requestToken || null,
        movieKey: s.movieKey || null,
        filmTitle: s.filmTitle || null,
        filmmakerPercent: typeof s.filmmakerPercent === 'number' ? s.filmmakerPercent : null,
    });
    return ref.id;
}

/** Hides most of an email for public pages: an***@gmail.com */
export const maskEmail = (email: string) => {
    const [user, domain] = (email || '').split('@');
    if (!domain) return '';
    return `${user.slice(0, 2)}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
};

// ── Signing links ──────────────────────────────────────────────────────────
// A signing link is a contract_requests/<token> document. The token is long
// and random, so the link itself is the key (see api/contracts.ts).

export const SIGN_SITE = 'https://cratetv.net';
export const signLinkFor = (token: string) => `${SIGN_SITE}/sign?t=${token}`;

export interface SigningRequestInput {
    templateId: string;
    recipientName: string;
    recipientEmail: string;
    movieKey?: string | null;
    filmTitle?: string | null;
    filmmakerPercent?: number | null;
    /** Set when CRATE created it automatically (e.g. on film approval). */
    source?: 'admin' | 'film-approval';
    emailed?: boolean;
}

export async function createSigningRequest(db: Firestore, r: SigningRequestInput): Promise<{ token: string; link: string }> {
    const t = getTemplate(r.templateId);
    if (!t) throw new Error(`Unknown agreement "${r.templateId}"`);
    const token = randomBytes(24).toString('base64url');
    await db.collection('contract_requests').doc(token).set({
        templateId: t.id, templateTitle: t.title, templateVersion: t.version,
        recipientName: r.recipientName, recipientEmail: r.recipientEmail.toLowerCase(),
        movieKey: r.movieKey || null, filmTitle: r.filmTitle || null,
        filmmakerPercent: typeof r.filmmakerPercent === 'number' ? r.filmmakerPercent : null,
        status: 'sent', source: r.source || 'admin',
        createdAt: FieldValue.serverTimestamp(),
        lastSentAt: r.emailed ? FieldValue.serverTimestamp() : null,
    });
    return { token, link: signLinkFor(token) };
}

/** Agreements every newly approved film gets, in signing order. */
export const FILM_ONBOARDING_TEMPLATES = ['filmmaker-distribution', 'rights-warranty'];

/**
 * On film approval: create (or reuse) the filmmaker's signing links for that
 * film. Reuses an open or signed request for the same film + agreement, so
 * approving twice never sends duplicates. Returns the links still to sign.
 */
export async function ensureFilmOnboardingRequests(
    db: Firestore,
    o: { movieKey: string; filmTitle: string; recipientName: string; recipientEmail: string; filmmakerPercent: number },
): Promise<{ templateId: string; title: string; link: string }[]> {
    const existing = await db.collection('contract_requests').where('movieKey', '==', o.movieKey).get();
    const out: { templateId: string; title: string; link: string }[] = [];
    for (const templateId of FILM_ONBOARDING_TEMPLATES) {
        const t = getTemplate(templateId)!;
        const prior = existing.docs.find(d => d.data().templateId === templateId && d.data().status !== 'void');
        if (prior?.data().status === 'signed') continue;
        const link = prior
            ? signLinkFor(prior.id)
            : (await createSigningRequest(db, {
                templateId, recipientName: o.recipientName, recipientEmail: o.recipientEmail,
                movieKey: o.movieKey, filmTitle: o.filmTitle,
                filmmakerPercent: templateId === 'filmmaker-distribution' ? o.filmmakerPercent : null,
                source: 'film-approval', emailed: true,
            })).link;
        out.push({ templateId, title: t.title, link });
    }
    return out;
}

const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The "next steps" block for the approval email: sign, then set up the dashboard. */
export function renderOnboardingStepsHtml(links: { title: string; link: string }[]): string {
    if (!links.length) return '';
    const font = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;";
    const rows = links.map((l, i) => `
        <tr><td style="padding:10px 0;border-top:1px solid #e9e5ff;${font}">
          <p style="margin:0 0 8px;color:#1e1b4b;font-size:14px;font-weight:700;">${i + 1}. ${esc(l.title)}</p>
          <a href="${esc(l.link)}" style="display:inline-block;background:#7B4DFF;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:800;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Review &amp; sign</a>
        </td></tr>`).join('');
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
        <tr><td bgcolor="#f5f3ff" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:20px;">
          <p style="margin:0 0 6px;color:#6d28d9;font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase;${font}">Next: two quick agreements</p>
          <p style="margin:0 0 8px;color:#312e81;font-size:13px;line-height:1.6;${font}">Please read and sign these. They explain how CRATE streams your film, your share of the money, and how you get paid. Each takes about two minutes.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        </td></tr>
      </table>`;
}

/** Shown after a filmmaker signs: set up the dashboard and payout method. */
export function renderFilmmakerNextStepsHtml(): string {
    const font = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;";
    return `
      <div style="margin:24px 0 0;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;${font}">
        <p style="margin:0 0 6px;color:#15803d;font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase;">Next: get paid</p>
        <p style="margin:0 0 14px;color:#14532d;font-size:13px;line-height:1.6;">Set up your free filmmaker dashboard to see your views and earnings, then choose how you want to be paid (PayPal, Cash App, Venmo, Zelle or check). Use the name exactly as it appears in your film's credits.</p>
        <a href="${SIGN_SITE}/filmmaker-signup" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:800;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Set up my dashboard</a>
      </div>`;
}
