// This is a Vercel Serverless Function
// It will be accessible at the path /api/publish-constants
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Helper to extract a JS object or array literal from the constants.ts file content.
// This uses the Function constructor which is safer than eval().
function extractVariableFromString(content: string, varName: string): any {
    // Regex to find 'export const varName ... = { ... };' or '[ ... ];' and capture the literal
    const regex = new RegExp(`export const ${varName}[\\s\\S]*?=\\s*(\\{[\\s\\S]*?\\}|\\[[\\s\\S]*?\\]);`);
    const match = content.match(regex);
    if (match && match[1]) {
        try {
            // Use the Function constructor to safely parse the object/array literal string
            const obj = new Function(`return ${match[1]}`)();
            return obj;
        } catch (e) {
            console.error(`Failed to parse object for ${varName}:`, e);
            throw new Error(`Syntax error found in the '${varName}' variable in your file.`);
        }
    }
    return null;
}

export async function POST(request: Request) {
    try {
        const { password, fileContent } = await request.json();

        // 1. Authentication (Only the special developer password works here)
        if (password !== "Reb@1984") {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // 2. AWS S3 Configuration Check
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        let region = process.env.AWS_S3_REGION;

        if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
            throw new Error("AWS S3 environment variables are not fully configured on the server. Cannot publish data.");
        }

        if (region === 'global') {
            region = 'us-east-1';
        }
        
        // 3. Parse the file content
        if (!fileContent || typeof fileContent !== 'string') {
             return new Response(JSON.stringify({ error: 'File content is missing or invalid.' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const movies = extractVariableFromString(fileContent, 'moviesData');
        const categories = extractVariableFromString(fileContent, 'categoriesData');
        const festivalData = extractVariableFromString(fileContent, 'festivalData');
        const festivalConfig = extractVariableFromString(fileContent, 'festivalConfigData');

        if (!movies || !categories || !festivalData || !festivalConfig) {
            throw new Error("Could not extract all required data objects (moviesData, categoriesData, festivalData, festivalConfigData) from the file. Check the file format.");
        }
        
        const liveData = {
            movies: movies,
            categories: categories,
            festivalData: festivalData,
            festivalConfig: festivalConfig,
        };

        // 4. Upload to S3
        const s3Client = new S3Client({
            region,
            credentials: { accessKeyId, secretAccessKey },
        });

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: 'live-data.json',
            Body: JSON.stringify(liveData, null, 2),
            ContentType: 'application/json',
            CacheControl: 'public, max-age=60',
        });
        
        await s3Client.send(command);

        return new Response(JSON.stringify({ message: 'Constants file published successfully.' }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error publishing constants file:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ error: `Failed to publish constants file: ${errorMessage}` }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}