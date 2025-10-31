import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

let db: Firestore | null = null;
let firebaseInitializationPromise: Promise<Firestore | null> | null = null;

const initializeFirebase = () => {
    if (firebaseInitializationPromise) {
        return firebaseInitializationPromise;
    }

    firebaseInitializationPromise = (async () => {
        try {
            const firebaseConfig = {
                apiKey: process.env.FIREBASE_API_KEY,
                authDomain: process.env.FIREBASE_AUTH_DOMAIN,
                projectId: process.env.FIREBASE_PROJECT_ID,
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.FIREBASE_APP_ID,
            };
            
            if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
                throw new Error("Firebase server environment variables are not set.");
            }
            
            let app: FirebaseApp;
            if (getApps().length === 0) {
                app = initializeApp(firebaseConfig);
            } else {
                app = getApp();
            }
            db = getFirestore(app);
            console.log("Firebase initialized for API route.");
            return db;
        } catch (error) {
            console.error("Firebase initialization failed for API route:", error);
            db = null;
            return null;
        }
    })();
    
    return firebaseInitializationPromise;
};

export const getDb = async () => {
    if (db) return db;
    return await initializeFirebase();
};