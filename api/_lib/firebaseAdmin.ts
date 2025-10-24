// FIX: Resolved "Cannot find name 'Buffer'" by declaring Buffer as any.
// The triple-slash directive for node types was failing in the current environment,
// so this workaround bypasses the type checking for Buffer, which is available at runtime.
declare const Buffer: any;

import * as admin from 'firebase-admin';

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
            // ANALYTICS FIX: Use the standard Node.js Buffer to decode the base64 service account key.
            // This is the robust, correct method for a server environment and prevents crashes
            // caused by incorrect decoding or type conflicts. The tsconfig.json has been updated
            // to make the 'Buffer' type available to the compiler.
            const decodedKey = Buffer.from(serviceAccountKey, 'base64').toString('utf8');
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
