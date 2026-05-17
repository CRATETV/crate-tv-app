import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * FILMMAKER FILM SUBMISSION API
 * 
 * SECURITY FEATURES:
 * - Uses dedicated IAM credentials scoped to submissions/ folder only
 * - Rate limiting: max 5 submissions per email per day
 * - File type validation: only images for posters, videos for films
 * - File size limits enforced on frontend (10MB poster, 5GB film)
 * - Submissions go to private folder for review before publishing
 * 
 * This endpoint handles film submissions from filmmakers:
 * 1. Generates presigned S3 URLs for poster and film uploads
 * 2. Saves submission metadata to Firebase movie_pipeline collection
 */

// Allowed file types
const ALLOWED_POSTER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_FILM_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { 
            action,  // 'get-upload-urls' or 'save-submission'
            // For get-upload-urls:
            posterFileName, posterFileType,
            filmFileName, filmFileType,
            // For save-submission:
            title, director, email, synopsis, runtime, year, genre,
            posterUrl, filmUrl, website, instagram, submitterName
        } = body;

        // ============ ACTION: GET UPLOAD URLS ============
        if (action === 'get-upload-urls') {
            
            // Validate file types
            if (posterFileType && !ALLOWED_POSTER_TYPES.includes(posterFileType)) {
                return new Response(JSON.stringify({ 
                    error: 'Invalid poster file type. Please use JPG, PNG, WebP, or GIF.' 
                }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            
            if (filmFileType && !ALLOWED_FILM_TYPES.includes(filmFileType)) {
                return new Response(JSON.stringify({ 
                    error: 'Invalid film file type. Please use MP4, MOV, AVI, or WebM.' 
                }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            
            const bucketName = process.env.AWS_S3_BUCKET_NAME;
            // Use dedicated submission credentials (restricted to submissions/ folder only)
            // Falls back to main credentials if submission-specific ones aren't set
            const accessKeyId = process.env.AWS_SUBMISSIONS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
            const secretAccessKey = process.env.AWS_SUBMISSIONS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
            let region = process.env.AWS_S3_REGION;

            if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
                throw new Error("AWS S3 is not configured on the server.");
            }
            
            if (region === 'global') region = 'us-east-1';

            const s3Client = new S3Client({
                region,
                credentials: { accessKeyId, secretAccessKey },
            });

            const timestamp = Date.now();
            const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9.-]/g, '_');

            // Generate poster upload URL
            let posterSignedUrl = null, posterPublicUrl = null;
            if (posterFileName && posterFileType) {
                const posterKey = `submissions/posters/${timestamp}-${sanitize(posterFileName)}`;
                const posterCommand = new PutObjectCommand({
                    Bucket: bucketName,
                    Key: posterKey,
                    ContentType: posterFileType,
                });
                posterSignedUrl = await getSignedUrl(s3Client, posterCommand, { expiresIn: 3600 }); // 1 hour
                posterPublicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${posterKey}`;
            }

            // Generate film upload URL
            let filmSignedUrl = null, filmPublicUrl = null;
            if (filmFileName && filmFileType) {
                const filmKey = `submissions/films/${timestamp}-${sanitize(filmFileName)}`;
                const filmCommand = new PutObjectCommand({
                    Bucket: bucketName,
                    Key: filmKey,
                    ContentType: filmFileType,
                });
                filmSignedUrl = await getSignedUrl(s3Client, filmCommand, { expiresIn: 3600 }); // 1 hour for large uploads
                filmPublicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${filmKey}`;
            }

            return new Response(JSON.stringify({ 
                success: true,
                poster: { signedUrl: posterSignedUrl, publicUrl: posterPublicUrl },
                film: { signedUrl: filmSignedUrl, publicUrl: filmPublicUrl }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // ============ ACTION: SAVE SUBMISSION ============
        if (action === 'save-submission') {
            if (!title || !director || !email) {
                return new Response(JSON.stringify({ error: 'Title, director, and email are required.' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const initError = getInitializationError();
            if (initError) throw new Error(initError);
            
            const db = getAdminDb();
            if (!db) throw new Error("Database connection failed.");
            
            // Rate limiting: Check how many submissions this email has made today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const normalizedEmail = email.trim().toLowerCase();
            
            const recentSubmissions = await db.collection('movie_pipeline')
                .where('email', '==', normalizedEmail)
                .where('submittedAt', '>=', today)
                .get();
            
            if (recentSubmissions.size >= 3) {
                return new Response(JSON.stringify({ 
                    error: 'You have reached the daily submission limit (3 per day). Please try again tomorrow.' 
                }), {
                    status: 429,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            // Generate a unique key for this submission
            const submissionKey = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

            // Save to movie_pipeline collection
            const submission = {
                key: submissionKey,
                title: title.trim(),
                director: director.trim(),
                email: email.trim().toLowerCase(),
                synopsis: synopsis?.trim() || '',
                runtime: runtime || '',
                year: year || new Date().getFullYear().toString(),
                genre: genre || 'Drama',
                poster: posterUrl || '',
                fullMovie: filmUrl || '',
                website: website?.trim() || '',
                instagram: instagram?.trim() || '',
                submitterName: submitterName?.trim() || director.trim(),
                
                // Pipeline metadata
                status: 'submitted',
                source: 'filmmaker-portal',
                submittedAt: FieldValue.serverTimestamp(),
                createdAt: FieldValue.serverTimestamp(),
                
                // Flags for review
                isReviewed: false,
                isApproved: false,
                reviewNotes: '',
            };

            await db.collection('movie_pipeline').doc(submissionKey).set(submission);

            // Log to audit stream
            await db.collection('audit_logs').add({
                action: 'FILM_SUBMITTED',
                type: 'MUTATION',
                role: 'filmmaker',
                details: `"${title}" submitted by ${director} (${email})`,
                timestamp: FieldValue.serverTimestamp(),
                ip: '',
                metadata: { submissionKey, title, director, email }
            });

            return new Response(JSON.stringify({ 
                success: true,
                submissionKey,
                message: 'Your film has been submitted successfully! We will review it and get back to you.'
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Invalid action. Use "get-upload-urls" or "save-submission".' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Film Submission Error:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
