import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { moviesData as fallbackMovies, categoriesData as fallbackCategories, festivalData as fallbackFestival, festivalConfigData as fallbackConfig } from '../../constants.ts'; // relative path

let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

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

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
        console.error("AWS_S3_BUCKET_NAME is not set for API feed. Using fallback data.");
        return getFallbackData();
    }

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: 'live-data.json',
        });
        const response = await s3Client.send(command);

        // FIX: The custom `streamToString` helper which caused a `Buffer` not defined error has been replaced.
        // Using the AWS SDK v3's built-in `transformToString` method is the modern and correct way to handle the body stream.
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