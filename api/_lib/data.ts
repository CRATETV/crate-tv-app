
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { moviesData as fallbackMovies, categoriesData as fallbackCategories, festivalData as fallbackFestival, festivalConfigData as fallbackConfig, aboutData as fallbackAbout, promoCodesData as fallbackPromos } from '../../constants.js';

let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000; 

let s3Client: S3Client | null = null;
const getS3Client = () => {
    if (s3Client) return s3Client;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    let region = process.env.AWS_S3_REGION || 'us-east-1';
    if (region === 'global') region = 'us-east-1';
    if (!accessKeyId || !secretAccessKey) return null;

    s3Client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
    });
    return s3Client;
}

const getFallbackData = () => ({
    movies: fallbackMovies,
    categories: fallbackCategories,
    festivalData: fallbackFestival,
    festivalConfig: fallbackConfig,
    aboutData: fallbackAbout,
    promoCodes: fallbackPromos,
    settings: { isHolidayModeActive: false }
});

export const getApiData = async (options: { noCache?: boolean } = {}) => {
    const now = Date.now();
    
    // STRICT BYPASS: If noCache is requested, always fetch fresh from S3.
    if (!options.noCache && cachedData && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedData;
    }

    const client = getS3Client();
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    
    if (!client || !bucketName) return getFallbackData();
    
    try {
        const command = new GetObjectCommand({ 
            Bucket: bucketName, 
            Key: 'live-data.json',
            // Bust intermediate S3/CloudFront caches if noCache is true
            ResponseCacheControl: options.noCache ? 'no-store, no-cache, must-revalidate, max-age=0' : undefined
        });
        
        const response = await client.send(command);
        if (!response.Body) throw new Error("S3 Body Empty");
        const bodyString = await response.Body.transformToString("utf8");
        const data = JSON.parse(bodyString);
        
        // Update local cache if not bypassing
        if (!options.noCache) {
            cachedData = data;
            lastFetchTime = now;
        }
        
        return data;
    } catch (err) {
        console.error("[Data API] S3 Fetch Failure, reverting to fallback.", err);
        return getFallbackData();
    }
};
