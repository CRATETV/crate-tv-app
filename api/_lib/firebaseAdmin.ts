import * as admin from 'firebase-admin';

// Fix for "Cannot find name 'Buffer'" error.
// This provides a minimal type definition for the Buffer class, which is a native
// Node.js API, for environments where Node.js types might not be globally available
// during TypeScript compilation. The Vercel environment will provide the full Buffer implementation at runtime.
declare const Buffer: {
    from(string: string, encoding: 'base64'): {
        toString(encoding: 'utf-8'): string;
    };
};

let adminAuth: admin.auth.Auth | null = null;
let adminDb: admin.firestore.Firestore | null = null;
let isInitialized = false;

// This function initializes the Firebase Admin SDK if it hasn't been already.
// It's designed to be called in serverless environments where instances are reused.
const initializeFirebaseAdmin = () => {
    if (isInitialized) {
        return;
    }

    try {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (!serviceAccountKey) {
            console.warn("Firebase Admin SDK not configured: FIREBASE_SERVICE_ACCOUNT_KEY is missing. Admin features like user listing will be disabled.");
            isInitialized = true; // Mark as initialized to prevent retries
            return;
        }

        // Check if the app is already initialized to prevent errors on hot reloads
        if (admin.apps.length === 0) {
            // The service account key is expected to be a base64 encoded JSON string.
            // This is a common way to store multi-line JSON in a single environment variable.
            const decodedKey = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
            const serviceAccount = JSON.parse(decodedKey);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase Admin SDK initialized successfully.");
        }

        adminAuth = admin.auth();
        adminDb = admin.firestore();
        isInitialized = true;
    } catch (error) {
        console.error("Firebase Admin SDK initialization failed:", error);
        isInitialized = true; // Mark as initialized even on failure to prevent retries
    }
};

// Public function to get the initialized Auth instance
export const getAdminAuth = (): admin.auth.Auth | null => {
    if (!isInitialized) {
        initializeFirebaseAdmin();
    }
    return adminAuth;
};

// Public function to get the initialized Firestore DB instance
export const getAdminDb = (): admin.firestore.Firestore | null => {
    if (!isInitialized) {
        initializeFirebaseAdmin();
    }
    return adminDb;
};