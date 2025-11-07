// FIX: The Firebase V9 modular imports are failing, indicating an older SDK version (likely v8) is installed.
// The code has been refactored to use the v8 namespaced/compat syntax for all Firebase App, Auth, and Firestore interactions.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// FIX: Corrected type imports to use the new types.ts file
import { User } from '../types';

let authInstance: firebase.auth.Auth | null = null;
let app: firebase.app.App | null = null;
let db: firebase.firestore.Firestore | null = null;

let firebaseInitializationPromise: Promise<firebase.auth.Auth | null> | null = null;
let firebaseInitializationError: string | null = null;

const initializeFirebase = () => {
    if (firebaseInitializationPromise) {
        return firebaseInitializationPromise;
    }

    firebaseInitializationPromise = (async () => {
        try {
            console.log("Attempting to fetch Firebase config from API...");
            const response = await fetch('/api/firebase-config', { method: 'POST' });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch Firebase config: ${response.status} ${errorText}`);
            }

            const firebaseConfig = await response.json();
            if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
                throw new Error("Fetched Firebase config is missing required keys.");
            }
            
            console.log("Firebase config fetched successfully. Initializing Firebase...");
            if (firebase.apps.length === 0) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.app();
            }
            db = app.firestore();
            authInstance = app.auth();
            await authInstance.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            console.log("Firebase initialized successfully.");
            return authInstance;

        } catch (error) {
            console.error("Firebase initialization failed:", error);
            firebaseInitializationError = error instanceof Error ? error.message : String(error);
            db = null;
            authInstance = null;
            return null;
        }
    })();
    
    return firebaseInitializationPromise;
};

export const initializeFirebaseAuth = async (): Promise<firebase.auth.Auth | null> => {
    return await initializeFirebase();
}


export const getAuthInstance = (): firebase.auth.Auth | null => {
    if (!authInstance) {
        console.warn("getAuthInstance called before initializeFirebaseAuth has completed. This might lead to errors.");
    }
    return authInstance;
};

// Export a function to get the DB instance
export const getDbInstance = (): firebase.firestore.Firestore | null => {
    if (!db) {
         console.warn("getDbInstance called before Firebase has been initialized.");
    }
    return db;
};

// --- User Profile Functions ---

export const getUserProfile = async (uid: string): Promise<User | null> => {
    if (!db) {
        console.error("Firestore is not initialized. Cannot get user profile.");
        return null;
    }
    const userDocRef = db.collection('users').doc(uid);
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
        const data = userDoc.data()!;
        // Create a user object that strictly conforms to the User type,
        // ensuring 'isActor' and other fields are always present with a default.
        // FIX: Sanitize array fields from Firestore to ensure they are string arrays, preventing downstream type errors.
        // FIX: Use an explicit type guard `(item): item is string` to ensure TypeScript correctly infers the result of the filter as `string[]`, resolving downstream type errors.
        const userProfile: User = {
            uid,
            email: data.email || '',
            name: data.name || data.email?.split('@')[0] || 'Creator',
            isActor: data.isActor === true, // Coerce to boolean, defaulting to false
            isFilmmaker: data.isFilmmaker === true, // Coerce to boolean, defaulting to false
            avatar: data.avatar || 'fox',
            isPremiumSubscriber: data.isPremiumSubscriber === true, // Default to false
// FIX: Explicitly type the 'item' in the array filter as 'any' to help TypeScript's type inference. This resolves the 'unknown[]' is not assignable to 'string[]' error by ensuring the type guard correctly narrows the array type.
            watchlist: Array.isArray(data.watchlist) ? data.watchlist.filter((item: any): item is string => typeof item === 'string') : [],
// FIX: Explicitly type the 'item' in the array filter as 'any' to help TypeScript's type inference. This resolves the 'unknown[]' is not assignable to 'string[]' error by ensuring the type guard correctly narrows the array type.
            watchedMovies: Array.isArray(data.watchedMovies) ? data.watchedMovies.filter((item: any): item is string => typeof item === 'string') : [],
// FIX: Explicitly type the 'item' in the array filter as 'any' to help TypeScript's type inference. This resolves the 'unknown[]' is not assignable to 'string[]' error by ensuring the type guard correctly narrows the array type.
            likedMovies: Array.isArray(data.likedMovies) ? data.likedMovies.filter((item: any): item is string => typeof item === 'string') : [],
            hasFestivalAllAccess: data.hasFestivalAllAccess === true,
// FIX: Explicitly type the 'item' in the array filter as 'any' to help TypeScript's type inference. This resolves the 'unknown[]' is not assignable to 'string[]' error by ensuring the type guard correctly narrows the array type.
            unlockedBlockIds: Array.isArray(data.unlockedBlockIds) ? data.unlockedBlockIds.filter((item: any): item is string => typeof item === 'string') : [],
// FIX: Explicitly type the 'item' in the array filter as 'any' to help TypeScript's type inference. This resolves the 'unknown[]' is not assignable to 'string[]' error by ensuring the type guard correctly narrows the array type.
            purchasedMovieKeys: Array.isArray(data.purchasedMovieKeys) ? data.purchasedMovieKeys.filter((item: any): item is string => typeof item === 'string') : [],
            rokuDeviceId: data.rokuDeviceId || undefined,
        };
        return userProfile;
    }
    return null;
};

export const createUserProfile = async (uid: string, email: string, name?: string): Promise<User> => {
    if (!db) {
        throw new Error("Firestore is not initialized. Cannot create user profile.");
    }
    const userDocRef = db.collection('users').doc(uid);
    const newUser: Omit<User, 'uid'> = { // Storing without the UID inside the document itself
        email,
        name: name || email.split('@')[0],
        isActor: false,
        isFilmmaker: false,
        avatar: 'fox', // A default avatar
        isPremiumSubscriber: false,
        watchlist: [], // Initialize watchlist for account-based storage
        watchedMovies: [], // Initialize watched history
        likedMovies: [],
        hasFestivalAllAccess: false,
        unlockedBlockIds: [],
        purchasedMovieKeys: [],
    };
    await userDocRef.set(newUser);

    // Send signup notification email. This is a non-blocking "fire and forget" call.
    fetch('/api/send-signup-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    }).catch(error => {
        // We log the error but don't block the user's signup flow if the notification fails.
        console.warn('Failed to send signup notification email:', error);
    });
    
    return { uid, ...newUser };
};

export const updateUserProfile = async (uid: string, data: Partial<Omit<User, 'uid'>>): Promise<void> => {
    if (!db) {
        throw new Error("Firestore is not initialized. Cannot update user profile.");
    }
    const userDocRef = db.collection('users').doc(uid);
    await userDocRef.set(data, { merge: true });
};
