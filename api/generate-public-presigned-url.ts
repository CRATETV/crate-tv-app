// This is a Vercel Serverless Function
// It will be accessible at the path /api/generate-public-presigned-url
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { rateLimit, getIP } from "./_lib/rateLimit.js";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: Request) {
    try {
        // This endpoint is intentionally public (no sign-in — used from the
        // actor signup flow before an account exists), so without a limit
        // anyone could script it to mint unlimited presigned S3 upload URLs.
        if (!rateLimit(`public-presign:${getIP(request)}`, 15, 10 * 60_000)) {
            return new Response(JSON.stringify({ error: 'Too many upload requests. Please wait a few minutes and try again.' }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { fileName, fileType, fileSize } = await request.json();

        // 1. AWS Configuration Check
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        let region = process.env.AWS_S3_REGION;

        if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
            throw new Error("AWS S3 environment variables are not fully configured on the server.");
        }
        
        if (region === 'global') {
            region = 'us-east-1';
        }

        // 2. Validation
        if (!fileName || !fileType) {
            return new Response(JSON.stringify({ error: 'fileName and fileType are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // This is a public, unauthenticated endpoint that hands out a write
        // URL straight into the bucket — without a type check it would sign
        // an upload for literally any content type (HTML, executables, an
        // arbitrarily large file masquerading as anything), turning it into
        // free, attacker-controlled file hosting on our S3 bucket. Every
        // real caller only ever uploads an actor photo or video.
        // SECURITY (Oct 2026 audit): anyone can call this (actor sign-up has no
        // account), so uploads are limited to ordinary photos of a capped size.
        // It used to accept any image OR video of any size (storage bills) and
        // SVG files (which can carry script).
        const size = Number(fileSize);
        if (!Number.isFinite(size) || size <= 0 || size > MAX_PHOTO_BYTES) {
            return new Response(JSON.stringify({ error: 'Photos must be under 15 MB.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        if (!ALLOWED_PHOTO_TYPES.includes(String(fileType).toLowerCase())) {
            return new Response(JSON.stringify({ error: 'Please upload a JPG, PNG, WebP or GIF photo.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const s3Client = new S3Client({
            region,
            credentials: { accessKeyId, secretAccessKey },
        });

        // 3. Create Presigned URL for a specific "submissions" folder
        const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.').slice(-80);
        const key = `uploads/actor-submissions/${Date.now()}-${safeName}`;
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: String(fileType).toLowerCase(),
            // Signed into the link: the upload must be exactly this size.
            ContentLength: Math.round(size),
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // URL expires in 5 minutes

        // 4. Construct the final public URL
        const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
        
        // 5. Return both URLs to the client
        return new Response(JSON.stringify({ signedUrl, publicUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error generating public presigned URL:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ error: `Failed to generate upload URL: ${errorMessage}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}