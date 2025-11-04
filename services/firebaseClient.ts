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

// This function ensures Firebase is initialized only once.
export const initializeFirebaseAuth = async (): Promise<firebase.auth.Auth | null> => {
    if (authInstance) return authInstance;

    try {
        const response = await fetch('/api/firebase-config', { method: 'POST' });
        if (!response.ok) {
            throw new Error('Failed to fetch Firebase config');
        }
        const firebaseConfig = await response.json();
        if (!firebaseConfig.apiKey) {
            throw new Error('Invalid Firebase config from server');
        }

        if (firebase.apps.length === 0) {
            app = firebase.initializeApp(firebaseConfig);
        } else {
            app = firebase.app();
        }
        
        authInstance = app.auth();
        // Set persistence to 'local' to keep users signed in across sessions.
        await authInstance.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        db = app.firestore(); // Initialize Firestore
        return authInstance;
    } catch (error) {
        console.error("Firebase Auth initialization failed:", error);
        return null;
    }
};

export const getAuthInstance = (): firebase.auth.Auth | null => {
    if (!authInstance) {
        console.warn("getAuthInstance called before initializeFirebaseAuth has completed. This might lead to errors.");
    }
    return authInstance;
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
        const userProfile: User = {
            uid,
            email: data.email || '',
            name: data.name,
            isActor: data.isActor === true, // Coerce to boolean, defaulting to false
            isFilmmaker: data.isFilmmaker === true, // Coerce to boolean, defaulting to false
            avatar: data.avatar || 'fox',
            isPremiumSubscriber: data.isPremiumSubscriber === true, // Default to false
            watchlist: data.watchlist || [],
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