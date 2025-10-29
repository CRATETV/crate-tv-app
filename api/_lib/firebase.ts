// FIX: Refactor to use Firebase v9 compat libraries to fix module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth'; // Added for anonymous sign-in
import 'firebase/compat/firestore';

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
            
            let app: firebase.app.App;
            if (firebase.apps.length === 0) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.app();
            }
            db = firebase.firestore(app);
            
            // Sign in anonymously to ensure read access if rules require it
            const auth = firebase.auth(app);
            await auth.signInAnonymously();

            console.log("Firebase initialized for API route with anonymous auth.");
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