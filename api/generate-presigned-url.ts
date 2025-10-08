// This is a Vercel Serverless Function
// It will be accessible at the path /api/generate-presigned-url
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(request: Request) {
    try {
        const { fileName, fileType, password } = await request.json();

        // 1. Authentication
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        
        let isAuthenticated = false;
        
        if (primaryAdminPassword && password === primaryAdminPassword) {
            isAuthenticated = true;
        } else if (masterPassword && password === masterPassword) {
            isAuthenticated = true;
        } else {
            for (const key in process.env) {
                if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                    isAuthenticated = true;
                    break;
                }
            }
        }
        
        // Also allow for first-time setup mode if no passwords are set at all
        const anyPasswordSet = primaryAdminPassword || masterPassword || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
        if (!anyPasswordSet) {
            isAuthenticated = true; 
        }

        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // 2. AWS Configuration Check
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        let region = process.env.AWS_S3_REGION;

        if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
            throw new Error("AWS S3 environment variables are not fully configured on the server. Cannot generate upload URL.");
        }
        
        // FIX: Correct the AWS region if it's incorrectly set to 'global'.
        if (region === 'global') {
            region = 'us-east-1';
        }

        // 3. Validation
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

        // 4. Create Presigned URL
        const key = `uploads/${Date.now()}-${fileName.replace(/\s/g, '_')}`;
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: fileType,
            ACL: 'public-read',
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // URL expires in 5 minutes

        // 5. Construct the final public URL
        const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
        
        // 6. Return both URLs to the client
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