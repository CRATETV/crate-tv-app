// This is a Vercel Serverless Function
// It will be accessible at the path /api/generate-presigned-url
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
});

export async function POST(request: Request) {
    try {
        const { fileName, fileType, password } = await request.json();

        // 1. Authentication
        if (password !== process.env.ADMIN_PASSWORD) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // 2. Validation
        if (!fileName || !fileType) {
            return new Response(JSON.stringify({ error: 'fileName and fileType are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        if (!bucketName) {
            throw new Error("AWS_S3_BUCKET_NAME is not set.");
        }

        // Create a unique key for the S3 object
        const key = `uploads/${Date.now()}-${fileName.replace(/\s/g, '_')}`;

        // 3. Create Presigned URL
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: fileType,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // URL expires in 5 minutes

        // 4. Construct the final public URL
        const publicUrl = `https://${bucketName}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`;
        
        // 5. Return both URLs to the client
        return new Response(JSON.stringify({ signedUrl, publicUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error generating presigned URL:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ error: `Failed to generate upload URL: ${errorMessage}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}