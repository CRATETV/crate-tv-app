import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { resolveAdminCredential } from './_lib/adminSession.js';
import { isMasterAdmin } from './_lib/adminAuth.js';
import { MAIL_COLLECTION, SIGNATURES_DOC, prepareAttachments, stripHtml, normalizeSignatures } from './_lib/mailLog.js';
import { deliverEmail } from './_lib/mailSend.js';
import { checkSendTime, buildScheduledRecord } from './_lib/mailSchedule.js';

export async function POST(request: Request) {
    try {
        const { password: __raw_password, email, subject, htmlBody, scheduledAt, posterUrl, movieTitle, synopsis, movieKey, attachments, signatureId } = await request.json();
        const password = await resolveAdminCredential(__raw_password);

        // 1. Initialize DB first to check dynamic permissions
        const initError = getInitializationError();
        if (initError) throw new Error(`Database Initialization Failure: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Database terminal offline.");

        // 2. Comprehensive Authentication Check
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        
        let isAuthenticated = (primaryAdminPassword && password === primaryAdminPassword) || 
                              (masterPassword && password === masterPassword);

        // If not a primary admin, check if it's a valid collaborator key
        if (!isAuthenticated) {
            const collabSnap = await db.collection('collaborator_access')
                .where('accessKey', '==', password)
                .limit(1)
                .get();
            
            if (!collabSnap.empty) {
                isAuthenticated = true;
            }
        }

        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Admin or Collaborator key required.' }), { status: 401 });
        }

        if (!email || !subject || !htmlBody) {
            return new Response(JSON.stringify({ error: 'Recipient, subject, and body are required.' }), { status: 400 });
        }

        // A signature picked in Studio Mail must still exist, and owner-only ones are the owner's.
        if (typeof signatureId === 'string' && signatureId && signatureId !== 'none') {
            const sigDoc = await db.doc(SIGNATURES_DOC).get();
            const chosen = normalizeSignatures(sigDoc.data()?.list).find(sg => sg.id === signatureId);
            if (!chosen) return new Response(JSON.stringify({ error: 'That signature no longer exists. Pick another one.' }), { status: 400 });
            if (chosen.ownerOnly && !(await isMasterAdmin(__raw_password))) {
                return new Response(JSON.stringify({ error: 'That signature is for the owner only.' }), { status: 403 });
            }
        }

        // Files (receipts and so on) are checked before anything is sent.
        const prepared = prepareAttachments(attachments);
        if (!prepared.ok) {
            return new Response(JSON.stringify({ error: prepared.error }), { status: 400 });
        }
        const files = prepared.files;

        // 4. Timed send: keep it in the Sent folder as "Scheduled"; api/send-scheduled-mail.ts sends it.
        if (scheduledAt) {
            if (files.length) {
                return new Response(JSON.stringify({ error: 'A timed email cannot carry attachments yet. Send it now, or remove the file.' }), { status: 400 });
            }
            const when = checkSendTime(scheduledAt, Date.now());
            if (!when.ok) return new Response(JSON.stringify({ error: when.error }), { status: 400 });
            const settingsDoc = await db.collection('content').doc('settings').get();
            const fromEmail = settingsDoc.data()?.businessEmail || 'studio@cratetv.net';
            await db.collection(MAIL_COLLECTION).add(buildScheduledRecord({
                fromEmail, to: email, subject, htmlBody, text: stripHtml(String(htmlBody).replace(/<br\s*\/?>/gi, '\n')),
                signatureId: typeof signatureId === 'string' ? signatureId : '', movieTitle, posterUrl, synopsis, movieKey,
                sendAtMs: when.ms, nowIso: new Date().toISOString(),
            }));
            return new Response(JSON.stringify({ success: true, scheduledFor: new Date(when.ms).toISOString() }), { status: 200 });
        }

        await deliverEmail(db, { email, subject, htmlBody, signatureId, movieTitle, posterUrl, synopsis, movieKey, files });

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error("[Crate API] Transmission failure:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}