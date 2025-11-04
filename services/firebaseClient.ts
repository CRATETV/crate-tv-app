// services/firebaseClient.ts

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, Firestore, updateDoc } from 'firebase/firestore';
import { User } from '../types';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

let firebaseInitializationPromise: Promise<Auth | null> | null = null;

export const initializeFirebaseAuth = (): Promise<Auth | null> => {
    if (firebaseInitializationPromise) {
        return firebaseInitializationPromise;
    }

    firebaseInitializationPromise = (async () => {
        try {
            const response = await fetch('/api/firebase-config', { method: 'POST' });
            if (!response.ok) {
                console.error("Failed to fetch Firebase config, auth will not be available.");
                return null;
            }
            const firebaseConfig = await response.json();
            if (!firebaseConfig.apiKey) {
                 console.error("Firebase config is incomplete, auth will not be available.");
                 return null;
            }

            if (getApps().length === 0) {
                app = initializeApp(firebaseConfig);
            } else {
                app = getApp();
            }
            auth = getAuth(app);
            db = getFirestore(app);
            return auth;
        } catch (error) {
            console.error("Firebase initialization error:", error);
            return null;
        }
    })();

    return firebaseInitializationPromise;
};

export const getAuthInstance = (): Auth | null => auth;
export const getDbInstance = (): Firestore | null => db;

export const getUserProfile = async (uid: string): Promise<User | null> => {
    if (!db) return null;
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as User;
    }
    return null;
};

export const createUserProfile = async (uid: string, email: string): Promise<User | null> => {
    if (!db) return null;
    const userProfile: User = {
        uid,
        email,
        name: email.split('@')[0], // Default name
        avatar: 'fox', // Default avatar
        watchlist: [],
        isPremiumSubscriber: false,
    };
    try {
        await setDoc(doc(db, 'users', uid), userProfile);

        // Send notification to admin about new signup
        fetch('/api/send-signup-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        }).catch(err => console.error("Failed to send signup notification:", err));

        return userProfile;
    } catch (error) {
        console.error("Error creating user profile:", error);
        return null;
    }
};

export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<void> => {
    if (!db) return;
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, data);
};
