// This is a Vercel Serverless Function
// It will be accessible at the path /api/publish-data
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { Movie } from '../types.js';

const checkAuth = (password: string | null) => {
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    let isAuthenticated = false;

    if (!password) return false;
    
    // Check against built-in roles
    if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
        isAuthenticated = true;
    } else {
        // Check against dynamic roles from environment variables
        for (const key in process.env) {
            if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                isAuthenticated = true;
                break;
            }
        }
    }
    return isAuthenticated;
};

// More robust title normalization and typo correction
const normalizeTitle = (title: string): string => {
    if (!title) return '';
    let normalized = title
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
        .replace(/\s+/g, ' ') // collapse whitespace
        .trim()
        .toLowerCase();
    
    // Specific fix for the user's reported issue
    if (normalized.startsWith('gemeni time service')) {
        normalized = normalized.replace('gemeni', 'gemini');
    }
    return normalized;
};


// Function to fetch all data from Firestore and assemble it for publishing
const assembleLiveData = async (db: Firestore) => {
    const [moviesSnap, categoriesSnap, aboutSnap, festivalConfigSnap, festivalDaysSnap] = await Promise.all([
        db.collection('movies').get(),
        db.collection('categories').get(),
        db.collection('content').doc('about').get(),
        db.collection('festival').doc('config').get(),
        db.collection('festival').doc('schedule').collection('days').get()
    ]);

    // Deduplication logic for movies
    const uniqueMoviesByTitle: Map<string, Movie> = new Map();
    moviesSnap.forEach(doc => {
        const movie = { key: doc.id, ...doc.data() } as Movie;
        if (!movie.title) return; // Skip movies without a title

        const normalizedTitle = normalizeTitle(movie.title);
        const existingMovie = uniqueMoviesByTitle.get(normalizedTitle);

        // If a movie with this title doesn't exist, add it.
        if (!existingMovie) {
            uniqueMoviesByTitle.set(normalizedTitle, movie);
        } else {
            // If the new movie has a fullMovie URL and the existing one doesn't, replace it.
            // This prioritizes the more complete entry.
            if (movie.fullMovie && !existingMovie.fullMovie) {
                uniqueMoviesByTitle.set(normalizedTitle, movie);
            }
        }
    });

    const moviesData: Record<string, Movie> = {};
    for (const movie of uniqueMoviesByTitle.values()) {
        moviesData[movie.key] = movie;
    }

    const categoriesData: Record<string, any> = {};
    categoriesSnap.forEach(doc => categoriesData[doc.id] = doc.data());

    const aboutData = aboutSnap.exists ? aboutSnap.data() : null;
    const festivalConfig = festivalConfigSnap.exists ? festivalConfigSnap.data() : null;

    const festivalData: any[] = [];
    festivalDaysSnap.forEach(doc => festivalData.push(doc.data()));
    festivalData.sort((a, b) => a.day - b.day);

    return {
        movies: moviesData,
        categories: categoriesData,
        aboutData,
        festivalConfig,
        festivalData
    };
};

const publishToS3 = async (liveData: any) => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    let region = process.env.AWS_S3_REGION;

    if (!bucketName || !region || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        throw new Error("AWS S3 environment variables are not fully configured for publishing.");
    }

    if (region === 'global') {
        region = 'us-east-1';
    }

    const s3Client = new S3Client({
        region,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: 'live-data.json',
        Body: JSON.stringify(liveData, null, 2),
        ContentType: 'application/json',
        CacheControl: 'public, s-maxage=60, stale-while-revalidate=300' // Set cache headers
    });

    await s3Client.send(command);
};


export async function POST(request: Request) {
    try {
        const { password, type, data, pipelineItemIdToDelete } = await request.json();

        if (!checkAuth(password)) {
            return new Response(JSON.stringify({ error: 'Unauthorized. Invalid or missing password.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        if (!type || !data || typeof data !== 'object') {
            return new Response(JSON.stringify({ error: 'Invalid request body. "type" and "data" are required.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const validTypes = ['movies', 'categories', 'festival', 'about', 'delete_movie', 'set_now_streaming'];
        if (!validTypes.includes(type)) {
            return new Response(JSON.stringify({ error: `Invalid data type provided: ${type}` }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed. Could not save data.");

        const batch = db.batch();

        if (pipelineItemIdToDelete) {
            const pipelineRef = db.collection('movie_pipeline').doc(pipelineItemIdToDelete);
            batch.delete(pipelineRef);
        }

        switch (type) {
            case 'delete_movie': {
                const { key } = data;
                if (!key) throw new Error('Movie key is required for deletion.');
        
                const movieRef = db.collection('movies').doc(key);
                batch.delete(movieRef);
        
                // Also remove from all categories
                const categoriesSnap = await db.collection('categories').get();
                categoriesSnap.forEach(doc => {
                    const categoryData = doc.data();
                    if (categoryData.movieKeys && Array.isArray(categoryData.movieKeys) && categoryData.movieKeys.includes(key)) {
                        batch.update(doc.ref, {
                            movieKeys: FieldValue.arrayRemove(key)
                        });
                    }
                });
                break;
            }
            case 'set_now_streaming': {
                const { key } = data;
                if (!key) throw new Error('Movie key is required to set as Now Streaming.');
                const nowStreamingRef = db.collection('categories').doc('nowStreaming');
                batch.set(nowStreamingRef, {
                    title: 'Now Streaming',
                    movieKeys: [key]
                }, { merge: true });
                break;
            }
            case 'movies':
                const newKeys = Object.keys(data).filter(key => key.startsWith('newmovie'));
                if (newKeys.length > 0) {
                    const newReleasesRef = db.collection('categories').doc('newReleases');
                    try {
                        const newReleasesDoc = await newReleasesRef.get();
                        if (newReleasesDoc.exists) {
                            const existingKeys = newReleasesDoc.data()?.movieKeys || [];
                            // Prepend new keys and ensure no duplicates
                            const allKeys = [...newKeys, ...existingKeys];
                            const uniqueKeys = [...new Set(allKeys)];
                            batch.update(newReleasesRef, { movieKeys: uniqueKeys });
                        } else {
                            batch.set(newReleasesRef, {
                                title: 'New Releases',
                                movieKeys: newKeys
                            });
                        }
                    } catch (e) {
                        console.error("Could not update 'newReleases' category:", e);
                    }
                }

                for (const [id, docData] of Object.entries(data)) {
                    const docRef = db.collection('movies').doc(id);
                    batch.set(docRef, docData as object, { merge: true });
                }
                break;
            case 'categories':
                for (const [id, docData] of Object.entries(data)) {
                    const docRef = db.collection(type).doc(id);
                    batch.set(docRef, docData as object, { merge: true });
                }
                break;
            case 'about':
                const aboutRef = db.collection('content').doc('about');
                batch.set(aboutRef, data, { merge: true });
                break;
            case 'festival':
                const festivalPayload = data as { config?: any, schedule?: any[] };
                if (festivalPayload.config) {
                    const configRef = db.collection('festival').doc('config');
                    batch.set(configRef, festivalPayload.config, { merge: true });
                }
                if (festivalPayload.schedule) {
                    for (const day of festivalPayload.schedule) {
                        const dayRef = db.collection('festival').doc('schedule').collection('days').doc(`day${day.day}`);
                        batch.set(dayRef, day);
                    }
                }
                break;
        }

        await batch.commit();

        // After successfully saving to Firestore, regenerate and publish the live-data.json to S3
        const liveData = await assembleLiveData(db);
        await publishToS3(liveData);

        return new Response(JSON.stringify({ success: true, message: `Data of type '${type}' saved and published successfully.` }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("[API /publish-data] Error:", error);
        const errorMessage = error instanceof Error ? error.message : 'A server error occurred while publishing data.';
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}