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

        // Use optional chaining (`?.`) for a more robust check. This prevents the "Cannot read property 'length' of undefined"
        // error if `getApps()` returns undefined in a weird serverless state, while still correctly handling an empty array.
        if (!getApps()?.length) {
            let serviceAccount;
            try {
                // First, try to parse the key directly, in case it's raw JSON.
                serviceAccount = JSON.parse(serviceAccountKey);
            } catch (jsonError) {
                // If direct parsing fails, assume it's Base64 encoded.
                try {
                    const decodedKey = Buffer.from(serviceAccountKey, 'base64').toString('utf8');
                    serviceAccount = JSON.parse(decodedKey);
                } catch (base64Error) {
                    // If both fail, the key is truly malformed. Provide a detailed error.
                    const detailedError = "The FIREBASE_SERVICE_ACCOUNT_KEY is malformed. It's not valid JSON, nor is it a valid Base64-encoded JSON string. Please generate a new key from your Firebase project settings.";
                    console.error("Firebase Admin Key parsing failed.", { 
                        jsonError: (jsonError as Error).message, 
                        base64Error: (base64Error as Error).message 
                    });
                    throw new Error(detailedError);
                }
            }
            
            // Check for essential properties in the parsed service account
            if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
                throw new Error("The parsed service account key is missing essential properties like 'project_id', 'private_key', or 'client_email'. Please generate a new key from Firebase and check the environment variable.");
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
