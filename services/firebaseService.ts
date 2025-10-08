// FIX: Add a triple-slash directive to include Vite's client types.
// This provides TypeScript with the necessary definitions for `import.meta.env`,
// resolving errors about the 'env' property not existing on type 'ImportMeta'.
/// <reference types="vite/client" />

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

import { Movie, Category, FestivalConfig, FestivalDay } from '../types.ts';
import { moviesData as initialMovies, categoriesData as initialCategories, festivalData as initialFestivalData, festivalConfigData as initialFestivalConfig } from '../constants.ts';

let db: firebase.firestore.Firestore;

let initializationPromise: Promise<void> | null = null;

const initialize = async () => {
    if (firebase.apps.length) {
        db = firebase.firestore();
        return;
    }

    try {
        const response = await fetch('/api/firebase-config', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to fetch Firebase config from API.');
        const config = await response.json();
        if (!config.apiKey) throw new Error('Incomplete Firebase config received from API.');

        firebase.initializeApp(config);
        db = firebase.firestore();
        
        const auth = firebase.auth();
        if (!auth.currentUser) {
            await auth.signInAnonymously();
        }

    } catch (error) {
        console.warn("Firebase initialization via API failed:", error);
        
        // Fallback for Local Vite Development (`npm run dev`)
        // 'import.meta.env.DEV' is a Vite-specific variable that is true during development.
        if (import.meta.env.DEV) {
            console.log("Attempting to initialize Firebase using local .env.local variables...");
            const config = {
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                appId: import.meta.env.VITE_FIREBASE_APP_ID,
            };

            if (config.apiKey && config.projectId) {
                console.log("Found local Firebase config. Initializing...");
                firebase.initializeApp(config);
                db = firebase.firestore();
                
                const auth = firebase.auth();
                if (!auth.currentUser) {
                    await auth.signInAnonymously();
                }
                // Initialization successful, we can exit the function
                return; 
            } else {
                console.error(
                    "Local Firebase config is incomplete. " +
                    "Please ensure all VITE_FIREBASE_* variables are set in your .env.local file. " +
                    "Alternatively, run 'vercel dev' to use the API-based configuration."
                );
            }
        }
    }
};

const ensureInitialized = (): Promise<void> => {
    if (!initializationPromise) {
        initializationPromise = initialize();
    }
    return initializationPromise;
};


// One-time data migration if Firestore is empty
const migrateInitialData = async () => {
    if (!db) return;
    
    // Check movies
    const moviesSnapshot = await db.collection('movies').limit(1).get();
    if (moviesSnapshot.empty) {
        console.log("Migrating initial movies to Firestore...");
        const batch = db.batch();
        Object.entries(initialMovies).forEach(([key, movie]) => {
            const docRef = db.collection('movies').doc(key);
            batch.set(docRef, movie);
        });
        await batch.commit();
    }
    
    // Check categories
    const categoriesSnapshot = await db.collection('categories').limit(1).get();
    if (categoriesSnapshot.empty) {
        console.log("Migrating initial categories to Firestore...");
        const batch = db.batch();
        Object.entries(initialCategories).forEach(([key, category]) => {
            const docRef = db.collection('categories').doc(key);
            batch.set(docRef, category);
        });
        await batch.commit();
    }
    
    // Check festival config
    const festivalConfigDoc = await db.doc('festival/config').get();
    if (!festivalConfigDoc.exists) {
        console.log("Migrating initial festival config to Firestore...");
        await db.doc('festival/config').set(initialFestivalConfig);
    }
    
    // Check festival days
    const festivalDaysSnapshot = await db.collection('festival/schedule/days').limit(1).get();
    if (festivalDaysSnapshot.empty) {
        console.log("Migrating initial festival days to Firestore...");
        const batch = db.batch();
        initialFestivalData.forEach(day => {
            const docRef = db.collection('festival/schedule/days').doc(`day-${day.day}`);
            batch.set(docRef, day);
        });
        await batch.commit();
    }
};

export const listenToAllAdminData = async (
    callback: (data: {
        movies: Record<string, Movie>;
        categories: Record<string, Category>;
        festivalConfig: FestivalConfig;
        festivalData: FestivalDay[];
    }) => void
): Promise<() => void> => {
    
    await ensureInitialized();
    if (!db) {
        console.error("Firestore not initialized. Cannot listen to data.");
        // Return fallback data and a no-op unsubscriber
        callback({
            movies: initialMovies,
            categories: initialCategories,
            festivalConfig: initialFestivalConfig,
            festivalData: initialFestivalData,
        });
        return () => {};
    }

    // Perform one-time migration check
    await migrateInitialData();

    let allData = {
        movies: {} as Record<string, Movie>,
        categories: {} as Record<string, Category>,
        festivalConfig: initialFestivalConfig,
        festivalData: [] as FestivalDay[],
    };

    const unsubscribers: (() => void)[] = [];

    const update = () => callback(allData);

    unsubscribers.push(db.collection('movies').onSnapshot(snapshot => {
        const movies: Record<string, Movie> = {};
        snapshot.forEach(doc => {
            movies[doc.id] = doc.data() as Movie;
        });
        allData.movies = movies;
        update();
    }));

    unsubscribers.push(db.collection('categories').onSnapshot(snapshot => {
        const categories: Record<string, Category> = {};
        snapshot.forEach(doc => {
            categories[doc.id] = doc.data() as Category;
        });
        allData.categories = categories;
        update();
    }));
    
    unsubscribers.push(db.doc('festival/config').onSnapshot(doc => {
        allData.festivalConfig = (doc.data() as FestivalConfig) || initialFestivalConfig;
        update();
    }));

    unsubscribers.push(db.collection('festival/schedule/days').onSnapshot(snapshot => {
        const festivalData: FestivalDay[] = [];
        snapshot.forEach(doc => {
            festivalData.push(doc.data() as FestivalDay);
        });
        allData.festivalData = festivalData.sort((a, b) => a.day - b.day);
        update();
    }));

    return () => unsubscribers.forEach(unsub => unsub());
};

// --- Save Functions ---

export const saveMovie = async (movie: Movie): Promise<void> => {
    await ensureInitialized();
    if (!db) throw new Error("Firestore not initialized.");
    await db.collection('movies').doc(movie.key).set(movie, { merge: true });
};

export const deleteMovie = async (movieKey: string): Promise<void> => {
    await ensureInitialized();
    if (!db) throw new Error("Firestore not initialized.");
    
    // Also remove the movie key from all categories it might be in
    const categoriesRef = db.collection('categories');
    const snapshot = await categoriesRef.get();
    const batch = db.batch();
    snapshot.forEach(doc => {
        const category = doc.data() as Category;
        if (category.movieKeys.includes(movieKey)) {
            const updatedKeys = category.movieKeys.filter(key => key !== movieKey);
            batch.update(doc.ref, { movieKeys: updatedKeys });
        }
    });

    // Delete the movie document itself
    batch.delete(db.collection('movies').doc(movieKey));
    
    await batch.commit();
};

export const saveFestivalConfig = async (config: FestivalConfig): Promise<void> => {
    await ensureInitialized();
    if (!db) throw new Error("Firestore not initialized.");
    await db.doc("festival/config").set(config, { merge: true });
};

export const saveFestivalDays = async (days: FestivalDay[]): Promise<void> => {
    await ensureInitialized();
    if (!db) throw new Error("Firestore not initialized.");
    
    const batch = db.batch();
    const daysCollectionRef = db.collection("festival/schedule/days");

    const existingDocsSnapshot = await daysCollectionRef.get();
    existingDocsSnapshot.forEach(doc => batch.delete(doc.ref));

    days.forEach(day => {
        const dayDocRef = daysCollectionRef.doc(`day-${day.day}`);
        batch.set(dayDocRef, day);
    });
    
    await batch.commit();
};