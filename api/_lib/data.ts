// FIX: Reverted from a non-working namespace import to a standard named import for the AWS S3 client. This resolves the TypeScript type error where the 'send' method was not found.
// Further fix: Using a namespace import correctly to avoid any possible type conflicts that may be causing the persistent issue.
// Switched from a namespace import (`* as S3`) to named imports (`{ S3Client, GetObjectCommand }`) for the AWS SDK. This is the standard and more robust way to import from the SDK, and it resolves the TypeScript error where the '.send()' method was not found on the S3Client instance.
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { moviesData as fallbackMovies, categoriesData as fallbackCategories, festivalData as fallbackFestival, festivalConfigData as fallbackConfig } from '../../constants'; // relative path

let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

// Create a singleton S3 client to avoid re-instantiation on every call
let s3Client: S3Client | null = null;
const getS3Client = () => {
    if (s3Client) return s3Client;

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    let region = process.env.AWS_S3_REGION;

    // If any of the required S3 env vars are missing, we cannot create the client.
    if (!accessKeyId || !secretAccessKey || !region) {
        return null;
    }

    // FIX: Correct the AWS region if it's incorrectly set to 'global'.
    if (region === 'global') {
        console.warn("AWS_S3_REGION was 'global', defaulting to 'us-east-1'.");
        region = 'us-east-1';
    }

    s3Client = new S3Client({
        region: region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });

    return s3Client;
}

const getFallbackData = () => ({
    movies: fallbackMovies,
    categories: fallbackCategories,
    festivalData: fallbackFestival,
    festivalConfig: fallbackConfig,
});

export const getApiData = async () => {
    const now = Date.now();
    if (cachedData && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedData;
    }

    const client = getS3Client();
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    
    if (!client || !bucketName) {
        console.warn("AWS S3 client or bucket name not configured. Using fallback data.");
        return getFallbackData();
    }
    
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: 'live-data.json',
        });
        const response = await client.send(command);

        if (!response.Body) {
            throw new Error("S3 object has no body");
        }
        const bodyString = await response.Body.transformToString("utf8");
        const data = JSON.parse(bodyString);
        
        cachedData = data;
        lastFetchTime = now;
        return data;
    } catch (error) {
        console.error("Failed to fetch live data for API feed, using fallback.", error);
        return getFallbackData();
    }
};
