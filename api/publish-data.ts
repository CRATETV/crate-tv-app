// This is a Vercel Serverless Function
// It will be accessible at the path /api/publish-data
// FIX: Switched to named imports for the AWS SDK to correctly resolve the S3Client type and its methods, fixing an error where `.send()` was not found.
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { validateMovieData } from './_lib/validation.js';
import { Movie } from '../types.js';

export async function POST(request: Request) {
    try {
        const { password, data } = await request.json();

        // Authentication
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

        // AWS Configuration Check
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        let region = process.env.AWS_S3_REGION;

        if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
            throw new Error("AWS S3 environment variables are not fully configured on the server. Cannot publish data.");
        }
        
        // FIX: Correct the AWS region if it's incorrectly set to 'global'.
        if (region === 'global') {
            region = 'us-east-1';
        }

        // Validation
        if (!data || !data.movies || !data.categories || !data.festivalData || !data.festivalConfig) {
            return new Response(JSON.stringify({ error: 'Invalid data structure provided.' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // --- DATA VALIDATION GATEKEEPER ---
        for (const [key, movie] of Object.entries(data.movies)) {
            try {
                validateMovieData(movie as Movie, key);
            } catch (validationError) {
                // If validation fails, stop the entire publish process and return a clear error.
                return new Response(JSON.stringify({ error: (validationError as Error).message }), { 
                    status: 400, // Bad Request
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }
        // --- END OF VALIDATION ---
        
        const s3Client = new S3Client({
            region,
            credentials: { accessKeyId, secretAccessKey },
        });

        const dataString = JSON.stringify(data, null, 2);

        // --- MULTI-LAYERED FALLBACK WRITE ---
        // Create commands to write to both the primary live file and the new fallback file.
        const liveCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: 'live-data.json',
            Body: dataString,
            ContentType: 'application/json',
            CacheControl: 'no-cache, no-store, must-revalidate',
        });
        
        const fallbackCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: 'fallback-data.json', // The new safety net file
            Body: dataString,
            ContentType: 'application/json',
            CacheControl: 'no-cache, no-store, must-revalidate',
        });
        
        // Execute both uploads in parallel for efficiency.
        await Promise.all([
            s3Client.send(liveCommand),
            s3Client.send(fallbackCommand)
        ]);
        // --- END OF MULTI-LAYERED WRITE ---

        return new Response(JSON.stringify({ message: 'Data published successfully to live and fallback locations.' }), { 
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