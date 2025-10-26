import * as admin from 'firebase-admin';

let adminAuth: admin.auth.Auth | null = null;
let adminDb: admin.firestore.Firestore | null = null;
let isInitialized = false;
let initializationError: string | null = null; // To store any error during init

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

        // Check if the app is already initialized to prevent errors on hot reloads
        if (admin.apps.length === 0) {
            let decodedKey: string;
            try {
                // Use the web-standard atob function for universal compatibility
                decodedKey = atob(serviceAccountKey);
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