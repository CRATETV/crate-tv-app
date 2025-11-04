// FIX: The Firebase V9 modular imports are failing, indicating an older SDK version (likely v8) is installed.
// The code has been refactored to use the v8 namespaced/compat syntax for Firebase App and Firestore initialization.
import firebase from 'firebase/app';
import 'firebase/firestore';

let db: firebase.firestore.Firestore | null = null;
let firebaseInitializationPromise: Promise<firebase.firestore.Firestore | null> | null = null;

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
            
            if (firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
            }
            
            db = firebase.firestore();
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
