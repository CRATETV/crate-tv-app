import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { isMasterAdmin } from './_lib/adminAuth.js';
import { cleanLine } from './_lib/validation.js';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * CONTRACTS VAULT
 *
 * Legal documents (contracts, deal memos). Restricted to the two top-level admin
 * passwords, and stored PRIVATELY: files go under contracts/ in the bucket and are
 * only ever opened through a link that's signed on demand and expires in 5 minutes.
 * They deliberately do not go through the general media uploader, which produces
 * permanent public URLs.
 *
 * GET                       list contracts (metadata only)
 * GET  ?id=<id>             a fresh 5-minute link to view one document
 * POST { action: 'get-upload-url', fileName, fileType }   -> one-time upload link + key
 * POST { action: 'save', key, fileName, label }           -> record an uploaded document
 * DELETE ?id=<id>           remove the record and the stored file
 */

const ALLOWED_TYPES: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};
const MAX_BYTES = 25 * 1024 * 1024;
const LINK_SECONDS = 300;

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const bearer = (request: Request) => request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';

const getS3 = () => {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    let region = process.env.AWS_S3_REGION;
    if (!bucket || !region || !accessKeyId || !secretAccessKey) throw new Error('File storage is not configured on the server.');
    if (region === 'global') region = 'us-east-1';
    return { bucket, region, client: new S3Client({ region, credentials: { accessKeyId, secretAccessKey } }) };
};

const getDb = () => {
    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error('Database connection failed.');
    return db;
};

const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/\.{2,}/g, '.').replace(/^\.+/, '').slice(0, 100) || 'document';

export async function GET(request: Request) {
    try {
        if (!isMasterAdmin(bearer(request))) return json({ error: 'Unauthorized' }, 401);
        const db = getDb();
        const id = new URL(request.url).searchParams.get('id');

        if (id) {
            const snap = await db.collection('contracts').doc(id).get();
            if (!snap.exists) return json({ error: 'Not found' }, 404);
            const data = snap.data()!;
            if (!data.s3Key) {
                // Older record from before private storage: only has its original link.
                return json({ viewUrl: data.fileUrl || null, legacy: true });
            }
            const { bucket, client } = getS3();
            const viewUrl = await getSignedUrl(client, new GetObjectCommand({
                Bucket: bucket,
                Key: data.s3Key,
                ResponseContentDisposition: `attachment; filename="${safeName(data.fileName || 'contract')}"`,
            }), { expiresIn: LINK_SECONDS });
            return json({ viewUrl, expiresInSeconds: LINK_SECONDS });
        }

        const snapshot = await db.collection('contracts').orderBy('uploadedAt', 'desc').get();
        const contracts = snapshot.docs.map(doc => {
            const { fileUrl, s3Key, ...rest } = doc.data(); // never send storage paths / public links to the list
            return { id: doc.id, ...rest, isLegacy: !s3Key };
        });
        return json({ contracts });
    } catch (error) {
        console.error('manage-contracts GET error:', error);
        return json({ error: (error as Error).message }, 500);
    }
}

export async function POST(request: Request) {
    try {
        if (!isMasterAdmin(bearer(request))) return json({ error: 'Unauthorized' }, 401);
        const body = await request.json().catch(() => ({}));

        if (body.action === 'get-upload-url') {
            const fileType = String(body.fileType || '');
            if (!ALLOWED_TYPES[fileType]) return json({ error: 'Only PDF and Word documents (.pdf, .doc, .docx) can be uploaded.' }, 400);
            const { bucket, client } = getS3();
            const key = `contracts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(String(body.fileName || 'document'))}`;
            const uploadUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: fileType }), { expiresIn: 300 });
            return json({ uploadUrl, key });
        }

        if (body.action === 'save') {
            const key = String(body.key || '');
            if (!/^contracts\/[A-Za-z0-9._-]+$/.test(key)) return json({ error: 'Invalid file key.' }, 400);
            const db = getDb();
            const { bucket, region, client } = getS3();

            // Confirm the upload really happened, and that it's a permitted type and size.
            let head;
            try {
                head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
            } catch {
                return json({ error: 'That upload was not found. Please try again.' }, 400);
            }
            if (!ALLOWED_TYPES[head.ContentType || ''] || (head.ContentLength || 0) > MAX_BYTES || !head.ContentLength) {
                await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
                return json({ error: 'The file must be a PDF or Word document under 25 MB.' }, 400);
            }

            // Self-check: can the open internet read this object without a signed link?
            // If so the bucket policy is exposing contracts/ and the admin needs to know.
            let publicReadable = false;
            try {
                const probe = await fetch(`https://${bucket}.s3.${region}.amazonaws.com/${key}`, { method: 'HEAD' });
                publicReadable = probe.ok;
            } catch { /* can't tell — leave false */ }

            const ref = await db.collection('contracts').add({
                fileName: cleanLine(body.fileName, 200) || 'Document',
                label: cleanLine(body.label, 150),
                s3Key: key,
                contentType: head.ContentType,
                size: head.ContentLength,
                publicReadable,
                uploadedAt: FieldValue.serverTimestamp(),
            });
            return json({ success: true, id: ref.id, publicReadable }, 201);
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (error) {
        console.error('manage-contracts POST error:', error);
        return json({ error: (error as Error).message }, 500);
    }
}

export async function DELETE(request: Request) {
    try {
        if (!isMasterAdmin(bearer(request))) return json({ error: 'Unauthorized' }, 401);
        const id = new URL(request.url).searchParams.get('id');
        if (!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) return json({ error: 'Invalid id' }, 400);
        const db = getDb();
        const ref = db.collection('contracts').doc(id);
        const snap = await ref.get();
        if (!snap.exists) return json({ success: true });
        const s3Key = snap.data()?.s3Key;
        if (s3Key && /^contracts\//.test(s3Key)) {
            const { bucket, client } = getS3();
            await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Key }));
        }
        await ref.delete();
        return json({ success: true });
    } catch (error) {
        console.error('manage-contracts DELETE error:', error);
        return json({ error: (error as Error).message }, 500);
    }
}
