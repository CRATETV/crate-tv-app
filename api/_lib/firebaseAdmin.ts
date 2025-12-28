import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { Buffer } from 'buffer';

let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;
let isInitialized = false;
let initializationError: string | null = null;

const initializeFirebaseAdmin = () => {
    if (isInitialized) return;

    try {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (!serviceAccountKey) {
            initializationError = "Firebase Admin SDK not configured: FIREBASE_SERVICE_ACCOUNT_KEY is missing.";
            isInitialized = true;
            return;
        }

        if (!getApps()?.length) {
            let serviceAccount;
            try {
                // Try parsing directly as JSON
                serviceAccount = JSON.parse(serviceAccountKey);
            } catch (jsonError) {
                // Try decoding from Base64 if JSON parsing fails
                try {
                    const decodedKey = Buffer.from(serviceAccountKey, 'base64').toString('utf8');
                    serviceAccount = JSON.parse(decodedKey);
                } catch (base64Error) {
                    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is malformed (not valid JSON or Base64).");
                }
            }
            
            if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
                throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is missing essential fields (project_id, private_key, or client_email).");
            }

            // Fix for private key newlines which are often mangled when stored in environment variables
            if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }

            initializeApp({
                credential: cert(serviceAccount),
            });
        }

        const app = getApps()[0];
        adminAuth = getAuth(app);
        adminDb = getFirestore(app);
        isInitialized = true;
    } catch (error) {
        console.error("Firebase Admin SDK init failed:", error);
        initializationError = error instanceof Error ? error.message : "Unknown Firebase Admin init error.";
        isInitialized = true;
    }
};

export const getInitializationError = (): string | null => {
    if (!isInitialized) initializeFirebaseAdmin();
    return initializationError;
};

export const getAdminAuth = (): Auth | null => {
    if (!isInitialized) initializeFirebaseAdmin();
    return adminAuth;
};

export const getAdminDb = (): Firestore | null => {
    if (!isInitialized) initializeFirebaseAdmin();
    return adminDb;
};