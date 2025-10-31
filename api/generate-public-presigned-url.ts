// This is a Vercel Serverless Function
// It will be accessible at the path /api/generate-public-presigned-url
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(request: Request) {
    try {
        const { fileName, fileType } = await request.json();

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
        
        const s3Client = new S3Client({
            region,
            credentials: { accessKeyId, secretAccessKey },
        });

        // 3. Create Presigned URL for a specific "submissions" folder
        const key = `uploads/actor-submissions/${Date.now()}-${fileName.replace(/\s/g, '_')}`;
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: fileType,
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