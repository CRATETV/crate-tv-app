import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

import { FestivalConfig, FestivalDay } from '../types.ts';

let app: firebase.app.App;
let auth: firebase.auth.Auth;
let db: firebase.firestore.Firestore;

// A promise that resolves when initialization is complete, ensuring it only runs once.
let initializationPromise: Promise<void> | null = null;

const initialize = async () => {
    // Prevent re-initialization if already successful
    if (firebase.apps.length) {
        return;
    }

    try {
        const response = await fetch('/api/firebase-config', { method: 'POST' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch Firebase config from server.');
        }

        const config = await response.json();
        if (!config.apiKey || !config.projectId) {
            throw new Error('Incomplete Firebase config received from server.');
        }

        app = firebase.initializeApp(config);
        auth = firebase.auth();
        db = firebase.firestore();
    } catch (error) {
        console.warn("Firebase initialization failed:", error);
        // Subsequent checks for 'db' or 'auth' will fail gracefully.
    }
};

const ensureInitialized = (): Promise<void> => {
    if (!initializationPromise) {
        initializationPromise = initialize();
    }
    return initializationPromise;
};

export const initializeFirebaseAndAuth = async (): Promise<void> => {
    await ensureInitialized();
    if (!auth || auth.currentUser) return;

    try {
        const token = sessionStorage.getItem('__initial_auth_token');
        if (token) {
            await auth.signInWithCustomToken(token);
            console.log("Authenticated with custom token.");
        } else {
            await auth.signInAnonymously();
            console.log("Authenticated anonymously.");
        }
    } catch (error) {
        console.error("Firebase authentication failed:", error);
        if (auth && !auth.currentUser) {
            try {
                await auth.signInAnonymously();
                console.log("Fallback: Authenticated anonymously.");
            } catch (anonError) {
                console.error("Anonymous sign-in also failed:", anonError);
            }
        }
    }
};

export const listenToFestivalData = async (
    callback: (data: { config: FestivalConfig; days: FestivalDay[] }) => void
): Promise<() => void> => {
    
    await ensureInitialized();
    
    if (!db) {
        console.error("Firestore is not initialized. Cannot listen to festival data.");
        callback({ config: { title: 'Festival Unavailable', description: 'Please check connection.', isFestivalLive: false }, days: [] });
        return () => {}; // Return a no-op unsubscribe function
    }

    let configData: FestivalConfig | null = null;
    let daysData: FestivalDay[] | null = null;
    
    const tryCallback = () => {
        if (configData && daysData) {
            callback({ config: configData, days: daysData });
        }
    }

    const configRef = db.doc("festival/config");
    const configUnsubscribe = configRef.onSnapshot((docSnap) => {
        if (docSnap.exists) {
            configData = docSnap.data() as FestivalConfig;
        } else {
            console.warn("Festival config document does not exist in Firestore.");
            configData = { title: 'Crate TV Film Festival', description: '', isFestivalLive: false };
        }
        tryCallback();
    }, (error) => {
        console.error("Error listening to festival config:", error);
    });

    const daysRef = db.collection("festival/schedule/days");
    const daysUnsubscribe = daysRef.onSnapshot((querySnapshot) => {
        const days: FestivalDay[] = [];
        querySnapshot.forEach((doc) => {
            days.push(doc.data() as FestivalDay);
        });
        days.sort((a, b) => a.day - b.day);
        daysData = days;
        tryCallback();
    }, (error) => {
        console.error("Error listening to festival schedule:", error);
    });
    
    return () => {
        configUnsubscribe();
        daysUnsubscribe();
    };
};

export const saveFestivalConfig = async (config: FestivalConfig): Promise<void> => {
    await ensureInitialized();
    if (!db) throw new Error("Firestore is not initialized. Cannot save config.");
    const configRef = db.doc("festival/config");
    await configRef.set(config, { merge: true });
};

export const saveFestivalDays = async (days: FestivalDay[]): Promise<void> => {
    await ensureInitialized();
    if (!db) throw new Error("Firestore is not initialized. Cannot save festival days.");
    
    const batch = db.batch();
    const daysCollectionRef = db.collection("festival/schedule/days");

    const existingDocsSnapshot = await daysCollectionRef.get();
    existingDocsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    days.forEach(day => {
        const dayDocRef = daysCollectionRef.doc(`day-${day.day}`);
        batch.set(dayDocRef, day);
    });
    
    await batch.commit();
};