// FIX: Switched to named imports for the AWS SDK to correctly resolve the S3Client type and its methods, fixing an error where `.send()` was not found.
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { moviesData as fallbackMovies, categoriesData as fallbackCategories, festivalData as fallbackFestival, festivalConfigData as fallbackConfig, aboutData as fallbackAbout } from '../../constants.js'; // relative path

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
    aboutData: fallbackAbout,
});

const fetchFromS3 = async (client: S3Client, bucketName: string, key: string) => {
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
    });
    const response = await client.send(command);

    if (!response.Body) {
        throw new Error(`S3 object has no body for key: ${key}`);
    }
    const bodyString = await response.Body.transformToString("utf8");
    return JSON.parse(bodyString);
}


export const getApiData = async () => {
    const now = Date.now();
    if (cachedData && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedData;
    }

    const client = getS3Client();
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    
    if (!client || !bucketName) {
        console.warn("AWS S3 client or bucket name not configured. Using built-in fallback data.");
        return getFallbackData();
    }
    
    // --- MULTI-LAYERED FALLBACK SYSTEM ---
    try {
        // 1. Try to fetch the primary live data
        console.log("[Data API] Attempting to fetch primary 'live-data.json'");
        const data = await fetchFromS3(client, bucketName, 'live-data.json');
        cachedData = data;
        lastFetchTime = now;
        console.log("[Data API] Successfully fetched primary live data.");
        return data;
    } catch (primaryError) {
        console.warn("[Data API] Failed to fetch primary 'live-data.json'.", (primaryError as Error).message);
        
        try {
            // 2. If primary fails, try the secondary fallback file from S3
            console.log("[Data API] Attempting to fetch secondary 'fallback-data.json'");
            const data = await fetchFromS3(client, bucketName, 'fallback-data.json');
            cachedData = data;
            lastFetchTime = now;
            console.log("[Data API] Successfully fetched secondary fallback data from S3.");
            return data;
        } catch (secondaryError) {
            // 3. If both S3 files fail, use the built-in tertiary fallback
            console.error("[Data API] All S3 fetch attempts failed. Using built-in fallback.", (secondaryError as Error).message);
            return getFallbackData();
        }
    }
    // --- END OF MULTI-LAYERED FALLBACK ---
};