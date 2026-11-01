// Contracts signed inside CRATE.
//
// Public (the person signing):
//   GET  ?token=<link token>                 the agreement behind a signing link (or its signed copy)
//   GET  ?template=actor-portal&name=<name>  a public template to read before signing up
//   POST { action:'sign', token, typedName, email, agree:true }
//
// Admin (master password / session pass):
//   POST { action:'admin-list' }                                       templates, links and signatures
//   POST { action:'admin-create', templateId, recipientName, recipientEmail, movieKey?, filmmakerPercent?, sendEmail? }
//   POST { action:'admin-void', token }   POST { action:'admin-resend', token }
//   POST { action:'admin-view', signatureId }                          the full signed text
//
// Signing links are long random tokens, so the link itself is the key.
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { isMasterAdmin } from './_lib/adminAuth.js';
import { CONTRACT_TEMPLATES, getTemplate, renderContract } from './_lib/contractTemplates.js';
import { recordSignature, maskEmail, fingerprint, createSigningRequest, renderFilmmakerNextStepsHtml, ensureFilmOnboardingRequests, renderOnboardingStepsHtml } from './_lib/contracts.js';
import { fetchFilmDeals } from './_lib/filmmakerBalance.js';
import { filmmakerShareOf } from './_lib/revenueSplit.js';
import { cleanLine, isValidEmail, escapeHtml } from './_lib/validation.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { renderBrandedEmail, renderEmailButton } from './_lib/emailBranding.js';
import { ownerEmails } from './_lib/partnerEmails.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const SITE = 'https://cratetv.net';
const PUBLIC_TEMPLATES = ['actor-portal'];
const linkFor = (token: string) => `${SITE}/sign?t=${token}`;
const FROM = () => `CRATE TV <${process.env.FROM_EMAIL || 'noreply@cratetv.net'}>`;

const toIso = (v: any): string | null => {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    if (typeof v._seconds === 'number') return new Date(v._seconds * 1000).toISOString();
    return null;
};

function db() {
    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const d = getAdminDb();
    if (!d) throw new Error('Database connection failed.');
    return d;
}

async function sendMail(to: string | string[], subject: string, bodyHtml: string) {
    if (!process.env.RESEND_API_KEY) return;
    try {
        await new Resend(process.env.RESEND_API_KEY).emails.send({ from: FROM(), to, subject, html: renderBrandedEmail({ title: subject, bodyHtml }) });
    } catch (e) { console.error('[contracts] email failed', e); }
}

async function sendSigningEmail(req: any, token: string) {
    await sendMail(req.recipientEmail, `Please review and sign: ${req.templateTitle}`, `
<h1 style="margin:0 0 16px;font-size:24px;font-weight:900;">${escapeHtml(req.templateTitle)}</h1>
<p style="margin:0 0 12px;">Hi ${escapeHtml(req.recipientName)},</p>
<p style="margin:0 0 12px;">CRATE TV has sent you an agreement to review and sign${req.filmTitle ? ` for <strong>${escapeHtml(req.filmTitle)}</strong>` : ''}. It takes about two minutes. You can read it in full before signing, and you'll get a copy by email afterwards.</p>
${renderEmailButton('Review & sign', linkFor(token))}
<p style="margin:16px 0 0;font-size:13px;color:#666;">Questions? Just reply to this email.</p>`);
}

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const token = url.searchParams.get('token') || '';
        const templateId = url.searchParams.get('template') || '';

        if (templateId) {
            const t = getTemplate(templateId);
            if (!t || !PUBLIC_TEMPLATES.includes(t.id)) return json({ error: 'Agreement not found.' }, 404);
            const name = cleanLine(url.searchParams.get('name'), 120);
            return json({ template: { id: t.id, title: t.title, version: t.version }, text: renderContract(t, { signerName: name }) });
        }

        if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return json({ error: 'This signing link is not valid.' }, 404);
        const d = db();
        const doc = await d.collection('contract_requests').doc(token).get();
        if (!doc.exists) return json({ error: 'This signing link is not valid.' }, 404);
        const r = doc.data()!;
        if (r.status === 'void') return json({ error: 'This agreement was withdrawn by CRATE. If you think that is a mistake, reply to the email you received.' }, 410);

        if (r.status === 'signed' && r.signatureId) {
            const sig = (await d.collection('contract_signatures').doc(r.signatureId).get()).data();
            return json({
                status: 'signed',
                template: { id: r.templateId, title: r.templateTitle, version: sig?.templateVersion || r.templateVersion },
                text: sig?.text || '',
                signature: sig ? { signerName: sig.signerName, typedSignature: sig.typedSignature, signedAt: sig.signedAtIso || toIso(sig.signedAt), fingerprint: sig.textSha256 } : null,
            });
        }

        const t = getTemplate(r.templateId);
        if (!t) return json({ error: 'This agreement is no longer available.' }, 410);
        return json({
            status: 'awaiting',
            template: { id: t.id, title: t.title, version: t.version },
            recipientName: r.recipientName,
            recipientEmailMasked: maskEmail(r.recipientEmail),
            filmTitle: r.filmTitle || null,
            text: renderContract(t, { signerName: r.recipientName, filmTitle: r.filmTitle, filmmakerPercent: r.filmmakerPercent }),
        });
    } catch (e) {
        console.error('[contracts GET]', e);
        return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const action = String(body.action || '');

        // ── Public: sign ──
        if (action === 'sign') {
            if (!rateLimit(`contract-sign:${getIP(request)}`, 15, 60 * 60_000)) return json({ error: 'Too many attempts. Please try again later.' }, 429);
            const token = String(body.token || '');
            if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return json({ error: 'This signing link is not valid.' }, 404);
            const typedName = cleanLine(body.typedName, 120);
            const email = cleanLine(body.email, 200).toLowerCase();
            if (body.agree !== true) return json({ error: 'Please tick the box to confirm you agree.' }, 400);
            if (typedName.length < 2) return json({ error: 'Type your full name to sign.' }, 400);
            if (!isValidEmail(email)) return json({ error: 'Enter your email address.' }, 400);

            const d = db();
            const ref = d.collection('contract_requests').doc(token);
            const doc = await ref.get();
            if (!doc.exists) return json({ error: 'This signing link is not valid.' }, 404);
            const r = doc.data()!;
            if (r.status === 'signed') return json({ error: 'This agreement has already been signed.' }, 409);
            if (r.status === 'void') return json({ error: 'This agreement was withdrawn by CRATE.' }, 410);
            if (email !== String(r.recipientEmail || '').toLowerCase()) {
                return json({ error: `Please use the email address this agreement was sent to (${maskEmail(r.recipientEmail)}).` }, 403);
            }
            const t = getTemplate(r.templateId);
            if (!t) return json({ error: 'This agreement is no longer available.' }, 410);
            // The text they signed is the text they were shown — rendered with the name CRATE sent it to.
            const text = renderContract(t, { signerName: r.recipientName, filmTitle: r.filmTitle, filmmakerPercent: r.filmmakerPercent });
            if (body.fingerprint && body.fingerprint !== fingerprint(text)) {
                return json({ error: 'This agreement was updated while you were reading it. Please reload the page and review it again.' }, 409);
            }

            const signatureId = await recordSignature(d, {
                template: t, text, signerName: r.recipientName, signerEmail: email, typedSignature: typedName,
                ip: getIP(request), userAgent: request.headers.get('user-agent') || '',
                context: 'signing-link', requestToken: token, movieKey: r.movieKey, filmTitle: r.filmTitle, filmmakerPercent: r.filmmakerPercent,
            });
            await ref.update({ status: 'signed', signatureId, signedAt: FieldValue.serverTimestamp() });

            // The person who signs a film's distribution agreement becomes the one CRATE pays for that film
            // (first signer only; a different payee can still be named in Earnings & payouts).
            let payeeNote = '';
            if (r.movieKey && ['filmmaker-distribution', 'filmmaker-master'].includes(t.id)) {
                try {
                    await d.collection('film_payees').doc(String(r.movieKey)).create({
                        name: r.recipientName, email, signatureId, templateId: t.id, signedAt: FieldValue.serverTimestamp(),
                    });
                    payeeNote = `${r.recipientName} is now the person CRATE pays for this film.`;
                } catch {
                    const current = (await d.collection('film_payees').doc(String(r.movieKey)).get()).data();
                    payeeNote = `${current?.name || 'Someone else'} stays the person CRATE pays for this film (they signed first). To change it, name a payee in Earnings & payouts.`;
                }
            }

            const when = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'long', timeStyle: 'short' });
            await sendMail(email, `Your signed copy: ${t.title}`, `
<h1 style="margin:0 0 16px;font-size:24px;font-weight:900;">Signed — thank you</h1>
<p style="margin:0 0 12px;">You signed the <strong>${escapeHtml(t.title)}</strong>${r.filmTitle ? ` for <strong>${escapeHtml(r.filmTitle)}</strong>` : ''} on ${escapeHtml(when)} (Eastern).</p>
<p style="margin:0 0 20px;">You can view or print your signed copy any time:</p>
${renderEmailButton('View signed copy', linkFor(token))}
${t.audience === 'filmmaker' ? renderFilmmakerNextStepsHtml() : ''}`);
            const owners = ownerEmails();
            if (owners.length) {
                await sendMail(owners, `Signed: ${t.title} — ${r.recipientName}`, `<p style="margin:0 0 12px;"><strong>${escapeHtml(r.recipientName)}</strong> signed the ${escapeHtml(t.title)}${r.filmTitle ? ` for ${escapeHtml(r.filmTitle)}` : ''}.</p>${payeeNote ? `<p style="margin:0 0 12px;">${escapeHtml(payeeNote)}</p>` : ''}${renderEmailButton('Open Contracts in admin', `${SITE}/admin`)}`);
            }
            return json({ success: true });
        }

        // ── Admin ──
        if (!action.startsWith('admin-')) return json({ error: 'Unknown action.' }, 400);
        if (!(await isMasterAdmin(body.password))) return json({ error: 'Unauthorized' }, 401);
        const d = db();

        if (action === 'admin-list') {
            const [reqSnap, sigSnap] = await Promise.all([
                d.collection('contract_requests').orderBy('createdAt', 'desc').limit(500).get(),
                d.collection('contract_signatures').orderBy('signedAt', 'desc').limit(500).get(),
            ]);
            return json({
                templates: CONTRACT_TEMPLATES.map(({ body: _b, ...rest }) => rest),
                requests: reqSnap.docs.map(doc => {
                    const x = doc.data();
                    return {
                        token: doc.id, link: linkFor(doc.id), templateId: x.templateId, templateTitle: x.templateTitle,
                        recipientName: x.recipientName, recipientEmail: x.recipientEmail, filmTitle: x.filmTitle || null, movieKey: x.movieKey || null,
                        filmmakerPercent: x.filmmakerPercent ?? null, status: x.status, createdAt: toIso(x.createdAt), signedAt: toIso(x.signedAt),
                        lastSentAt: toIso(x.lastSentAt), signatureId: x.signatureId || null,
                    };
                }),
                signatures: sigSnap.docs.map(doc => {
                    const x = doc.data();
                    return {
                        id: doc.id, templateId: x.templateId, templateTitle: x.templateTitle, templateVersion: x.templateVersion,
                        signerName: x.signerName, signerEmail: x.signerEmail, typedSignature: x.typedSignature,
                        signedAt: x.signedAtIso || toIso(x.signedAt), context: x.context, filmTitle: x.filmTitle || null, requestToken: x.requestToken || null,
                    };
                }),
            });
        }

        if (action === 'admin-create') {
            const t = getTemplate(String(body.templateId || ''));
            if (!t) return json({ error: 'Choose an agreement.' }, 400);
            const recipientName = cleanLine(body.recipientName, 120);
            const recipientEmail = cleanLine(body.recipientEmail, 200).toLowerCase();
            if (recipientName.length < 2) return json({ error: 'Add the person’s full name.' }, 400);
            if (!isValidEmail(recipientEmail)) return json({ error: 'Add a valid email address.' }, 400);
            let movieKey = '', filmTitle = '';
            let filmmakerPercent: number | null = null;
            if (t.needsFilm) {
                movieKey = cleanLine(body.movieKey, 200);
                const movie = movieKey ? await d.collection('movies').doc(movieKey).get() : null;
                if (!movie?.exists) return json({ error: 'Choose the film this agreement is for.' }, 400);
                filmTitle = String(movie.data()?.title || '');
                const pct = Number(body.filmmakerPercent);
                filmmakerPercent = Number.isFinite(pct) && pct >= 0 && pct <= 100
                    ? Math.round(pct * 100) / 100
                    : Math.round(filmmakerShareOf((await fetchFilmDeals(d))[movieKey]) * 10000) / 100;
            }
            const { token, link } = await createSigningRequest(d, {
                templateId: t.id, recipientName, recipientEmail, movieKey: movieKey || null, filmTitle: filmTitle || null,
                filmmakerPercent, source: 'admin', emailed: body.sendEmail === true,
            });
            if (body.sendEmail === true) await sendSigningEmail({ templateTitle: t.title, recipientName, recipientEmail, filmTitle: filmTitle || null }, token);
            return json({ success: true, token, link });
        }

        // Both film agreements in one email — for films already on CRATE without them.
        if (action === 'admin-onboard') {
            const movieKey = cleanLine(body.movieKey, 200);
            const movie = movieKey ? await d.collection('movies').doc(movieKey).get() : null;
            if (!movie?.exists) return json({ error: 'Film not found.' }, 404);
            const recipientName = cleanLine(body.recipientName, 120);
            const recipientEmail = cleanLine(body.recipientEmail, 200).toLowerCase();
            if (recipientName.length < 2) return json({ error: 'Add the filmmaker’s full name.' }, 400);
            if (!isValidEmail(recipientEmail)) return json({ error: 'Add a valid email address.' }, 400);
            const filmTitle = String(movie.data()?.title || '');
            const filmmakerPercent = Math.round(filmmakerShareOf((await fetchFilmDeals(d))[movieKey]) * 10000) / 100;
            const links = await ensureFilmOnboardingRequests(d, { movieKey, filmTitle, recipientName, recipientEmail, filmmakerPercent });
            if (!links.length) return json({ error: 'Both agreements for this film are already signed.' }, 409);
            await sendMail(recipientEmail, `Your CRATE TV agreements for ${filmTitle}`, `
<h1 style="margin:0 0 16px;font-size:24px;font-weight:900;">Thank you for being on CRATE</h1>
<p style="margin:0 0 12px;">Hi ${escapeHtml(recipientName)},</p>
<p style="margin:0 0 12px;">We're putting our agreements in writing for every film on CRATE TV, including <strong>${escapeHtml(filmTitle)}</strong>. Nothing changes about how your film is shown. These simply confirm your share (${filmmakerPercent}%), how payouts work, and that the film's music and footage are cleared.</p>
${renderOnboardingStepsHtml(links)}
${renderFilmmakerNextStepsHtml()}`);
            return json({ success: true, sent: links.length });
        }

        if (action === 'admin-void' || action === 'admin-resend') {
            const token = String(body.token || '');
            const ref = d.collection('contract_requests').doc(token);
            const doc = await ref.get();
            if (!doc.exists) return json({ error: 'Not found.' }, 404);
            const r = doc.data()!;
            if (r.status !== 'sent') return json({ error: `This agreement is already ${r.status}.` }, 409);
            if (action === 'admin-void') {
                await ref.update({ status: 'void', voidedAt: FieldValue.serverTimestamp() });
            } else {
                await sendSigningEmail(r, token);
                await ref.update({ lastSentAt: FieldValue.serverTimestamp() });
            }
            return json({ success: true });
        }

        if (action === 'admin-view') {
            const doc = await d.collection('contract_signatures').doc(String(body.signatureId || '')).get();
            if (!doc.exists) return json({ error: 'Not found.' }, 404);
            const x = doc.data()!;
            return json({
                signature: {
                    id: doc.id, templateTitle: x.templateTitle, templateVersion: x.templateVersion, text: x.text,
                    signerName: x.signerName, signerEmail: x.signerEmail, typedSignature: x.typedSignature,
                    signedAt: x.signedAtIso || toIso(x.signedAt), ip: x.ip, userAgent: x.userAgent, fingerprint: x.textSha256, context: x.context, filmTitle: x.filmTitle,
                },
            });
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (e) {
        console.error('[contracts POST]', e);
        return json({ error: (e as Error).message }, 500);
    }
}
