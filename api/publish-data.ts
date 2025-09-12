// This is a Vercel Serverless Function
// It will be accessible at the path /api/publish-data
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// FIX: Correct the AWS region if it's incorrectly set to 'global'.
// The S3 SDK requires a specific region (e.g., 'us-east-1') to build the correct endpoint.
let region = process.env.AWS_S3_REGION;
if (region === 'global') {
    console.warn("AWS_S3_REGION was 'global', defaulting to 'us-east-1'.");
    region = 'us-east-1';
}

const s3Client = new S3Client({
    region: region,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
});

export async function POST(request: Request) {
    try {
        const { password, data } = await request.json();

        // Authentication
        if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Validation
        if (!data || !data.movies || !data.categories || !data.festivalData || !data.festivalConfig) {
            return new Response(JSON.stringify({ error: 'Invalid data structure provided.' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        if (!bucketName) {
            throw new Error("AWS_S3_BUCKET_NAME is not set.");
        }

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: 'live-data.json',
            Body: JSON.stringify(data, null, 2), // Pretty-print for readability
            ContentType: 'application/json',
            CacheControl: 'public, max-age=60', // Instruct browsers/CDNs to cache for 60 seconds
        });
        
        await s3Client.send(command);

        return new Response(JSON.stringify({ message: 'Data published successfully.' }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error publishing data:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ error: `Failed to publish data: ${errorMessage}` }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}