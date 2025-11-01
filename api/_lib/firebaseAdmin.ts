import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { Buffer } from 'buffer';

let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;
let isInitialized = false;
let initializationError: string | null = null;

// This function initializes the Firebase Admin SDK if it hasn't been already.
// It's designed to be called in serverless environments where instances are reused.
const initializeFirebaseAdmin = () => {
    if (isInitialized) {
        return;
    }

    try {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (!serviceAccountKey) {
            const warning = "Firebase Admin SDK not configured: FIREBASE_SERVICE_ACCOUNT_KEY is missing. Admin features like user listing will be disabled.";
            console.warn(warning);
            initializationError = warning;
            isInitialized = true; // Mark as initialized to prevent retries
            return;
        }

        // Use getApps() to check for initialization, which is the recommended practice.
        if (getApps().length === 0) {
            let decodedKey: string;
            try {
                // Use Node.js Buffer to decode the Base64 string.
                decodedKey = Buffer.from(serviceAccountKey, 'base64').toString('utf8');
            } catch (bufferError) {
                throw new Error("Failed to decode FIREBASE_SERVICE_ACCOUNT_KEY from Base64. Ensure the key is a valid, single-line Base64 string.");
            }

            let serviceAccount;
            try {
                serviceAccount = JSON.parse(decodedKey);
            } catch (jsonError) {
                throw new Error("Failed to parse the decoded service account key as JSON. The key might be corrupted or incorrectly encoded.");
            }
            
            // Check for essential properties in the parsed service account
            if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
                throw new Error("The parsed service account key is missing essential properties like 'project_id', 'private_key', or 'client_email'. Please generate a new key from Firebase.");
            }

            initializeApp({
                credential: cert(serviceAccount),
            });
            console.log("Firebase Admin SDK initialized successfully.");
        }

        const app = getApps()[0];
        adminAuth = getAuth(app);
        adminDb = getFirestore(app);
        isInitialized = true;
    } catch (error) {
        console.error("Firebase Admin SDK initialization failed:", error);
        initializationError = error instanceof Error ? error.message : "An unknown error occurred during Firebase Admin initialization.";
        isInitialized = true; // Mark as initialized even on failure to prevent retries
    }
};

// Public function to get the initialization error
export const getInitializationError = (): string | null => {
    if (!isInitialized) {
        initializeFirebaseAdmin();
    }
    return initializationError;
};

// Public function to get the initialized Auth instance
export const getAdminAuth = (): Auth | null => {
    if (!isInitialized) {
        initializeFirebaseAdmin();
    }
    return adminAuth;
};

// Public function to get the initialized Firestore DB instance
export const getAdminDb = (): Firestore | null => {
    if (!isInitialized) {
        initializeFirebaseAdmin();
    }
    return adminDb;
};
