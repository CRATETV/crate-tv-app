import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { LOGO_URL_ON_DARK, renderBrandedEmail } from './_lib/emailBranding.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { escapeHtml, cleanText, cleanLine, isValidEmail, safeHttpUrl } from './_lib/validation.js';
import { getSubmissionBucket, inspectUpload, deleteUpload, parseStorageUrl, storageBucketName, InspectResult } from './_lib/submissionFiles.js';

/**
 * SERVER-SIDE FILM SUBMISSION HANDLER
 *
 * Receives film submission data from the client after files are uploaded,
 * saves to movie_pipeline collection using Admin SDK (bypasses client permissions),
 * and sends notification email to admin.
 *
 * This endpoint is PUBLIC (anyone can submit), so everything in the body is
 * untrusted. It is cleaned before storage (lengths, control characters, URL
 * schemes) and escaped before going into the admin email. File links must
 * point at our own Firebase Storage bucket — that's where SubmitPage uploads.
 *
 * Note the order: hard failures are limited to fields we truly need. Optional
 * fields (website, genre, etc.) are sanitized or dropped instead of rejected,
 * because by the time we're called the filmmaker has already uploaded their
 * files and shouldn't have to redo a multi-GB upload over a typo.
 */

const MAX_BODY_BYTES = 100_000;
const MAX_IP_REQUESTS_PER_HOUR = 10;
const MAX_SUBMISSIONS_PER_EMAIL_PER_DAY = 5;
const CONTENT_TYPES = ['short', 'feature', 'series'];
// Only the download-URL form the upload page produces (it carries the ownership token we verify).
const STORAGE_HOSTS = ['firebasestorage.googleapis.com'];
// Set to 'true' once the antivirus scanner is deployed: new submissions then start as
// scan "pending" and can't be opened or approved until the scanner reports "clean".
const VIRUS_SCAN_ENABLED = process.env.VIRUS_SCAN_ENABLED === 'true';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** A validated https link to a file in OUR Firebase Storage bucket, or ''. */
const ownStorageUrl = (value: unknown): string => {
    const href = safeHttpUrl(value, { allowedHosts: STORAGE_HOSTS });
    if (!href) return '';
    const bucket = storageBucketName();
    if (!bucket) return href; // bucket not configured here — host allowlist alone
    return new URL(href).pathname.startsWith(`/v0/b/${bucket}/o/`) ? href : '';
};

export async function POST(request: Request) {
    try {
        if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
            return json({ error: 'Submission is too large.' }, 413);
        }
        const rawBody = await request.text();
        if (rawBody.length > MAX_BODY_BYTES) {
            return json({ error: 'Submission is too large.' }, 413);
        }
        let body: any;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return json({ error: 'Invalid request.' }, 400);
        }
        if (!body || typeof body !== 'object') {
            return json({ error: 'Invalid request.' }, 400);
        }

        // ── Clean everything that came in ───────────────────────────────
        const title = cleanLine(body.title, 200);
        const director = cleanLine(body.director, 200);
        const email = cleanLine(body.email, 254).toLowerCase();
        const posterUrl = ownStorageUrl(body.posterUrl);
        const filmUrl = ownStorageUrl(body.filmUrl);

        // Validate required fields
        if (!title || !director || !email || !posterUrl || !filmUrl) {
            return json({
                error: 'Missing or invalid required fields: title, director, email, poster, and film are required.'
            }, 400);
        }
        if (!isValidEmail(email)) {
            return json({ error: 'Please enter a valid email address.' }, 400);
        }

        const synopsis = cleanText(body.synopsis, 5000);
        const runtime = cleanLine(body.runtime, 30);
        const yearInput = cleanLine(body.year, 4);
        const year = /^\d{4}$/.test(yearInput) ? yearInput : new Date().getFullYear().toString();
        const genre = cleanLine(body.genre, 50) || 'Drama';
        const instagram = cleanLine(body.instagram, 100);
        const website = safeHttpUrl(body.website, { allowHttp: true, assumeHttps: true });
        const submitterName = cleanLine(body.submitterName, 200) || director;
        const contentType = CONTENT_TYPES.includes(body.contentType) ? body.contentType : 'short';
        const isSeries = contentType === 'series';
        const episodeCount = isSeries ? cleanLine(body.episodeCount, 10) : '';
        const episodeLinks = isSeries ? cleanText(body.episodeLinks, 4000) : '';

        // Best-effort per-IP throttle (in-memory, so per server instance).
        if (!rateLimit(`submit-film:${getIP(request)}`, MAX_IP_REQUESTS_PER_HOUR, 60 * 60_000)) {
            return json({ error: 'Too many submissions from this connection. Please try again later.' }, 429);
        }

        // Check Firebase Admin initialization
        const initError = getInitializationError();
        if (initError) {
            console.error('Firebase Admin init error:', initError);
            return json({ error: 'Server configuration error. Please try again later.' }, 500);
        }

        const db = getAdminDb();
        if (!db) {
            return json({ error: 'Database connection failed. Please try again later.' }, 500);
        }

        // Per-email daily cap. Single-field equality query (no composite index needed);
        // the 24h window is applied in memory.
        const priorSnap = await db.collection('movie_pipeline').where('email', '==', email).get();
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recentCount = priorSnap.docs.filter(doc => (doc.get('submittedAt')?.toMillis?.() ?? 0) >= dayAgo).length;
        if (recentCount >= MAX_SUBMISSIONS_PER_EMAIL_PER_DAY) {
            return json({
                error: `You have reached the daily submission limit (${MAX_SUBMISSIONS_PER_EMAIL_PER_DAY} per day). Please try again tomorrow.`
            }, 429);
        }

        // Inspect the uploaded files themselves (real type, size, ownership) before accepting.
        // Definite problems reject the submission and remove the bad upload; if we simply
        // can't check (storage unreachable) the submission is accepted but marked unverified.
        const bucket = getSubmissionBucket();
        let posterCheck: InspectResult = { status: 'unverified', reason: 'storage unavailable' };
        let filmCheck: InspectResult = { status: 'unverified', reason: 'storage unavailable' };
        if (bucket) {
            [posterCheck, filmCheck] = await Promise.all([
                inspectUpload(bucket, posterUrl, 'poster'),
                inspectUpload(bucket, filmUrl, 'film'),
            ]);
            const rejected = [posterCheck, filmCheck].filter(c => c.status === 'rejected') as Extract<InspectResult, { status: 'rejected' }>[];
            if (rejected.length) {
                // Remove every upload we've proven belongs to this attempt (including a good
                // file whose partner was rejected) so nothing is left orphaned in the bucket.
                const owned = [posterCheck, filmCheck].filter(c => c.status !== 'unverified' && c.path) as { path: string }[];
                await Promise.all(owned.map(c => deleteUpload(bucket, c.path)));
                console.warn('[SECURITY] Rejected submission upload:', rejected.map(c => c.message).join(' | '));
                return json({ error: rejected.map(c => c.message).join(' ') }, 400);
            }
            [posterCheck, filmCheck].forEach(c => c.status === 'unverified' && console.warn('[submit] file not verified:', c.reason));
        }
        const filesVerified = posterCheck.status === 'ok' && filmCheck.status === 'ok';

        // Generate submission key
        const timestamp = Date.now();
        const submissionKey = `sub_${timestamp}_${Math.random().toString(36).substring(2, 8)}`;

        // Save to movie_pipeline collection
        await db.collection('movie_pipeline').doc(submissionKey).set({
            key: submissionKey,
            title,
            director,
            email,
            synopsis,
            runtime,
            year,
            genre,
            poster: posterUrl,
            posterUrl: posterUrl, // Include both for compatibility
            fullMovie: filmUrl,
            movieUrl: filmUrl, // Include both for compatibility
            website,
            instagram,
            submitterName,
            filmStoragePath: parseStorageUrl(filmUrl)?.path || '',
            posterStoragePath: parseStorageUrl(posterUrl)?.path || '',
            contentType,
            isSeries,
            episodeCount,
            episodeLinks,

            // Pipeline metadata
            status: 'submitted',
            source: 'filmmaker-portal',
            submittedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            submissionDate: FieldValue.serverTimestamp(), // For compatibility with existing code

            // Flags for review. viewedAt stays unset until an admin opens the
            // submission in the admin panel — that's what drives the "NEW" badge.
            isReviewed: false,
            isApproved: false,
            reviewNotes: '',

            // File safety. typeCheck: are they really an image/video (checked above).
            // scan: antivirus result, written later by the scanner — 'pending' until then
            // (or 'not_configured' if no scanner is deployed, which doesn't block anything).
            security: {
                typeCheck: filesVerified ? 'passed' : 'unverified',
                filmKind: filmCheck.status === 'ok' ? filmCheck.kind : '',
                posterKind: posterCheck.status === 'ok' ? posterCheck.kind : '',
                filmSize: filmCheck.status === 'ok' ? filmCheck.size : 0,
                posterSize: posterCheck.status === 'ok' ? posterCheck.size : 0,
                scan: VIRUS_SCAN_ENABLED ? 'pending' : 'not_configured',
                checkedAt: FieldValue.serverTimestamp(),
            },
        });

        // Log to audit stream
        await db.collection('audit_logs').add({
            action: 'FILM_SUBMITTED',
            type: 'MUTATION',
            role: 'filmmaker',
            details: `"${title}" submitted by ${director} (${email})`,
            timestamp: FieldValue.serverTimestamp(),
            ip: '',
            metadata: { submissionKey, title, director, email }
        });

        // Send notification email to admin
        const resendApiKey = process.env.RESEND_API_KEY;
        const adminEmails = ['studio@cratetv.net', 'cratetiv@gmail.com'];

        if (resendApiKey) {
            try {
                const resend = new Resend(resendApiKey);

                // Every submitted value is escaped before it touches the HTML below.
                const h = {
                    title: escapeHtml(title),
                    director: escapeHtml(director),
                    email: escapeHtml(email),
                    synopsis: escapeHtml(synopsis.substring(0, 200) + (synopsis.length > 200 ? '...' : '')),
                    runtime: escapeHtml(runtime),
                    year: escapeHtml(year),
                    genre: escapeHtml(genre),
                    instagram: escapeHtml(instagram),
                    website: escapeHtml(website),
                    posterUrl: escapeHtml(posterUrl),
                    submissionKey: escapeHtml(submissionKey),
                };

                const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #000000;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; border-collapse: collapse;">

                    <!-- Header -->
                    <tr>
                        <td style="text-align: center; padding-bottom: 30px;">
                            <img src="${LOGO_URL_ON_DARK}" alt="Crate TV" width="130" style="display: inline-block; border: 0;" />
                        </td>
                    </tr>

                    <!-- New Submission Alert -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; overflow: hidden; border: 1px solid #333;">

                            <!-- Poster Header (only shown once we've confirmed it really is an image) -->
                            ${posterCheck.status === 'ok' ? `
                            <div style="position: relative; text-align: center; padding: 20px; background: linear-gradient(180deg, rgba(229,9,20,0.3) 0%, transparent 100%);">
                                <img src="${h.posterUrl}" alt="${h.title}" style="max-width: 200px; height: auto; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
                            </div>
                            ` : ''}

                            <!-- Content -->
                            <div style="padding: 30px;">
                                <!-- Badge -->
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <span style="background: linear-gradient(135deg, #E50914 0%, #B20710 100%); color: white; font-size: 10px; font-weight: 800; letter-spacing: 3px; padding: 8px 16px; border-radius: 20px; text-transform: uppercase;">
                                        🎬 NEW SUBMISSION
                                    </span>
                                </div>

                                <!-- Title -->
                                <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 900; color: #ffffff; text-align: center; text-transform: uppercase; letter-spacing: -1px;">
                                    ${h.title}
                                </h2>

                                <!-- Director -->
                                <p style="margin: 0 0 24px 0; font-size: 14px; color: #E50914; text-align: center; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                                    Directed by ${h.director}
                                </p>

                                <!-- Synopsis -->
                                ${synopsis ? `
                                <p style="margin: 0 0 24px 0; font-size: 14px; color: #999; text-align: center; line-height: 1.6; font-style: italic;">
                                    "${h.synopsis}"
                                </p>
                                ` : ''}

                                <!-- Details Grid -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                                    <tr>
                                        ${runtime ? `<td style="padding: 8px; text-align: center; border-right: 1px solid #333;">
                                            <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Runtime</div>
                                            <div style="font-size: 16px; color: #fff; font-weight: 700; margin-top: 4px;">${h.runtime}</div>
                                        </td>` : ''}
                                        ${year ? `<td style="padding: 8px; text-align: center; border-right: 1px solid #333;">
                                            <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Year</div>
                                            <div style="font-size: 16px; color: #fff; font-weight: 700; margin-top: 4px;">${h.year}</div>
                                        </td>` : ''}
                                        ${genre ? `<td style="padding: 8px; text-align: center;">
                                            <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Genre</div>
                                            <div style="font-size: 16px; color: #fff; font-weight: 700; margin-top: 4px;">${h.genre}</div>
                                        </td>` : ''}
                                    </tr>
                                </table>

                                <!-- Contact Info -->
                                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                                    <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; text-align: center;">Filmmaker Contact</div>
                                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 4px 0;">
                                                <span style="color: #666; font-size: 12px;">📧 Email:</span>
                                                <a href="mailto:${h.email}" style="color: #E50914; font-size: 12px; text-decoration: none; margin-left: 8px;">${h.email}</a>
                                            </td>
                                        </tr>
                                        ${instagram ? `<tr>
                                            <td style="padding: 4px 0;">
                                                <span style="color: #666; font-size: 12px;">📷 Instagram:</span>
                                                <span style="color: #fff; font-size: 12px; margin-left: 8px;">${h.instagram}</span>
                                            </td>
                                        </tr>` : ''}
                                        ${website ? `<tr>
                                            <td style="padding: 4px 0;">
                                                <span style="color: #666; font-size: 12px;">🌐 Website:</span>
                                                <a href="${h.website}" style="color: #E50914; font-size: 12px; text-decoration: none; margin-left: 8px;">${h.website}</a>
                                            </td>
                                        </tr>` : ''}
                                    </table>
                                </div>

                                <!-- Action Buttons -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px; text-align: center;">
                                            <!-- No direct link to the uploaded film: it's opened from the admin panel,
                                                 where it stays locked until the file checks / virus scan clear. -->
                                            <a href="https://cratetv.net/admin" style="display: inline-block; background: #E50914; color: #fff; font-size: 12px; font-weight: 800; letter-spacing: 2px; padding: 14px 32px; border-radius: 8px; text-decoration: none; text-transform: uppercase;">
                                                Review in Admin
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 30px; text-align: center;">
                            <p style="margin: 0; font-size: 11px; color: #444;">
                                Submission ID: ${h.submissionKey}
                            </p>
                            <p style="margin: 8px 0 0 0; font-size: 11px; color: #444;">
                                © ${new Date().getFullYear()} CRATE TV. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
                `;

                await resend.emails.send({
                    from: 'CRATE <notifications@cratetv.net>',
                    to: adminEmails,
                    subject: `🎬 New Film Submission: "${title}" by ${director}`,
                    html: emailHtml,
                });

                console.log(`Notification email sent to ${adminEmails.join(', ')} for submission: ${submissionKey}`);

                // Confirmation to the filmmaker, so they know it actually arrived.
                try {
                    await resend.emails.send({
                        from: 'CRATE <studio@cratetv.net>',
                        to: [email],
                        reply_to: 'studio@cratetv.net',
                        subject: `We received "${title}" 🎬`,
                        html: renderBrandedEmail({
                            title: 'Submission received',
                            bodyHtml: `
                                <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">Submission Received</p>
                                <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;text-transform:uppercase;">${h.title}</h1>
                                <p style="margin:0 0 16px;">Thank you for sending your film to CRATE. It's in our review queue now.</p>
                                <p style="margin:0 0 16px;">Our team watches every submission. You'll hear from us by email within 2–3 weeks.</p>
                                <p style="margin:0;color:#888;font-size:12px;">Reference: ${h.submissionKey}</p>
                            `,
                        }),
                    });
                } catch (confirmError) {
                    console.warn('Filmmaker confirmation email failed:', confirmError);
                }
            } catch (emailError) {
                console.warn('Failed to send notification email:', emailError);
                // Don't fail the submission if email fails
            }
        } else {
            console.warn('RESEND_API_KEY not configured, skipping notification email');
        }

        return json({
            success: true,
            submissionKey,
            message: 'Film submitted successfully!'
        });

    } catch (error) {
        console.error('Film submission error:', error);
        // Generic message: don't leak internals (stack/Firestore errors) to the public.
        return json({ error: 'Failed to submit film. Please try again.' }, 500);
    }
}
