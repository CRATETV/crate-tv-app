import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
// FIX: Corrected type imports to use the new types.ts file
import { User } from '../types';

let authInstance: Auth | null = null;
let app: FirebaseApp | null = null;
let db: Firestore | null = null;

// This function ensures Firebase is initialized only once.
export const initializeFirebaseAuth = async (): Promise<Auth | null> => {
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

        if (getApps().length === 0) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }
        
        authInstance = getAuth(app);
        // Set persistence to 'local' to keep users signed in across sessions.
        await setPersistence(authInstance, browserLocalPersistence);
        
        db = getFirestore(app); // Initialize Firestore
        return authInstance;
    } catch (error) {
        console.error("Firebase Auth initialization failed:", error);
        return null;
    }
};

export const getAuthInstance = (): Auth | null => {
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
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        const data = userDoc.data();
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
    const userDocRef = doc(db, 'users', uid);
    const newUser: Omit<User, 'uid'> = { // Storing without the UID inside the document itself
        email,
        name: name || email.split('@')[0],
        isActor: false,
        isFilmmaker: false,
        avatar: 'fox', // A default avatar
        isPremiumSubscriber: false,
        watchlist: [], // Initialize watchlist for account-based storage
    };
    await setDoc(userDocRef, newUser);

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
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, data, { merge: true });
};
