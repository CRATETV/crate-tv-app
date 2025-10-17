import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    doc, 
    setDoc, 
    deleteDoc, 
    writeBatch, 
    getDocs, 
    limit, 
    query, 
    arrayRemove, 
    orderBy,
    type Firestore
} from 'firebase/firestore';

import { Movie, Category, FestivalConfig, FestivalDay } from '../types';
import { moviesData as initialMovies, categoriesData as initialCategories, festivalData as initialFestivalData, festivalConfigData as initialFestivalConfig } from '../constants';

// --- Asynchronous Firebase Initialization ---

let db: Firestore | null = null;
let auth: Auth | null = null;

// A promise that resolves when initialization is complete.
let firebaseInitializationPromise: Promise<void> | null = null;
// Store the specific error message if initialization fails.
let firebaseInitializationError: string | null = null;

const initializeFirebase = () => {
    // If initialization has already been attempted, don't try again.
    if (firebaseInitializationPromise) {
        return firebaseInitializationPromise;
    }

    // Start the initialization process
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
            const app: FirebaseApp = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            await signInAnonymously(auth);
            console.log("Firebase initialized successfully.");

        } catch (error) {
            console.error("Firebase initialization failed:", error);
            // Capture the error message
            firebaseInitializationError = error instanceof Error ? error.message : String(error);
            // Ensure db and auth are null so the app knows to use fallback data.
            db = null;
            auth = null;
            // We don't re-throw the error, allowing the app to proceed in fallback mode.
        }
    })();
    
    return firebaseInitializationPromise;
};

// Immediately start the initialization process when the module is loaded.
initializeFirebase();

// --- Data Structures ---

interface AdminData {
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    festivalConfig: FestivalConfig;
    festivalData: FestivalDay[];
}

interface AdminDataResult {
    data: AdminData;
    source: 'firebase' | 'fallback';
    error?: string; // Add an optional error field
}

// --- Local In-Memory Store for Fallback Mode ---
const getFallbackData = (): AdminData => ({
    movies: JSON.parse(JSON.stringify(initialMovies)),
    categories: JSON.parse(JSON.stringify(initialCategories)),
    festivalConfig: JSON.parse(JSON.stringify(initialFestivalConfig)),
    festivalData: JSON.parse(JSON.stringify(initialFestivalData)),
});

let localStore: AdminData = getFallbackData();
let localListeners: ((result: AdminDataResult) => void)[] = [];

// Helper to notify all local listeners of a change
const notifyLocalListeners = () => {
    console.log("Notifying local listeners with updated in-memory data.");
    localListeners.forEach(cb => cb({ data: { ...localStore }, source: 'fallback', error: firebaseInitializationError ?? undefined }));
};

// --- Fallback and Migration ---

const migrateInitialData = async (firestoreDb: Firestore) => {
    const moviesQuery = query(collection(firestoreDb, 'movies'), limit(1));
    const moviesSnapshot = await getDocs(moviesQuery);

    if (moviesSnapshot.empty) {
        console.log("Database is empty. Migrating initial data to Firestore...");
        const batch = writeBatch(firestoreDb);
        
        Object.entries(initialMovies).forEach(([key, movie]) => {
            batch.set(doc(firestoreDb, 'movies', key), movie);
        });
        Object.entries(initialCategories).forEach(([key, category]) => {
            batch.set(doc(firestoreDb, 'categories', key), category);
        });
        batch.set(doc(firestoreDb, 'festival', 'config'), initialFestivalConfig);
        initialFestivalData.forEach(day => {
            batch.set(doc(firestoreDb, 'festival', 'schedule', 'days', `day-${day.day}`), day);
        });
        
        await batch.commit();
        console.log("Initial data migration complete.");
    }
};

// --- Main Data Service ---

export const listenToAllAdminData = (
    callback: (result: AdminDataResult) => void
): Promise<() => void> => {
    return new Promise(async (resolve) => {
        // Wait for initialization to complete
        await initializeFirebase();

        if (!db) { // Fallback mode
            console.warn("Firebase not connected. Admin panel is running in local-only mode. Changes will not be saved permanently.");
            localListeners.push(callback);
            // Immediately send the current state, including the specific error
            callback({ data: { ...localStore }, source: 'fallback', error: firebaseInitializationError ?? undefined });
            
            const unsubscribe = () => {
                localListeners = localListeners.filter(l => l !== callback);
            };
            resolve(unsubscribe);
            return;
        }

        try {
            await migrateInitialData(db);

            const allData: AdminData = {
                movies: {},
                categories: {},
                festivalConfig: initialFestivalConfig,
                festivalData: [],
            };

            const update = () => callback({ data: { ...allData }, source: 'firebase' });

            const unsubscribers = [
                onSnapshot(collection(db, 'movies'), (snapshot) => {
                    allData.movies = {};
                    snapshot.forEach(d => { allData.movies[d.id] = d.data() as Movie; });
                    update();
                }),
                onSnapshot(collection(db, 'categories'), (snapshot) => {
                    allData.categories = {};
                    snapshot.forEach(d => { allData.categories[d.id] = d.data() as Category; });
                    update();
                }),
                onSnapshot(doc(db, 'festival', 'config'), (docSnapshot) => {
                    allData.festivalConfig = (docSnapshot.data() as FestivalConfig) || initialFestivalConfig;
                    update();
                }),
                onSnapshot(query(collection(db, 'festival', 'schedule', 'days'), orderBy('day')), (snapshot) => {
                    allData.festivalData = [];
                    snapshot.forEach(d => { allData.festivalData.push(d.data() as FestivalDay); });
                    update();
                }),
            ];
            
            resolve(() => unsubscribers.forEach(unsub => unsub()));

        } catch (error) {
            console.error("Error fetching admin data from Firestore:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            callback({ data: getFallbackData(), source: 'fallback', error: errorMessage });
            resolve(() => {});
        }
    });
};

// --- Save & Delete Functions ---

export const saveMovie = async (movie: Movie): Promise<void> => {
    await initializeFirebase();
    if (!db) { // Fallback mode
        localStore.movies[movie.key] = movie;
        notifyLocalListeners();
        return;
    }
    await setDoc(doc(db, 'movies', movie.key), movie, { merge: true });
};

export const deleteMovie = async (movieKey: string): Promise<void> => {
    await initializeFirebase();
    if (!db) { // Fallback mode
        delete localStore.movies[movieKey];
        // Also remove from categories
        Object.keys(localStore.categories).forEach(catKey => {
            localStore.categories[catKey].movieKeys = localStore.categories[catKey].movieKeys.filter(key => key !== movieKey);
        });
        notifyLocalListeners();
        return;
    }

    const firestoreDb = db;
    const batch = writeBatch(firestoreDb);
    const categoriesSnapshot = await getDocs(collection(firestoreDb, 'categories'));

    categoriesSnapshot.forEach(categoryDoc => {
        const category = categoryDoc.data() as Category;
        if (category.movieKeys.includes(movieKey)) {
            batch.update(categoryDoc.ref, { movieKeys: arrayRemove(movieKey) });
        }
    });

    batch.delete(doc(firestoreDb, 'movies', movieKey));
    await batch.commit();
};

export const saveCategories = async (categories: Record<string, Category>): Promise<void> => {
    await initializeFirebase();
    if (!db) { // Fallback mode
        localStore.categories = categories;
        notifyLocalListeners();
        return;
    }

    const firestoreDb = db;
    const batch = writeBatch(firestoreDb);
    const categoriesRef = collection(firestoreDb, 'categories');
    const existingDocsSnapshot = await getDocs(categoriesRef);
    const newKeys = new Set(Object.keys(categories));

    Object.entries(categories).forEach(([key, categoryData]) => {
        batch.set(doc(categoriesRef, key), categoryData);
    });

    existingDocsSnapshot.forEach(d => {
        if (!newKeys.has(d.id)) {
            batch.delete(d.ref);
        }
    });
    
    await batch.commit();
};

export const saveFestivalConfig = async (config: FestivalConfig): Promise<void> => {
    await initializeFirebase();
    if (!db) { // Fallback mode
        localStore.festivalConfig = config;
        notifyLocalListeners();
        return;
    }
    await setDoc(doc(db, "festival", "config"), config, { merge: true });
};

export const saveFestivalDays = async (days: FestivalDay[]): Promise<void> => {
    await initializeFirebase();
    if (!db) { // Fallback mode
        localStore.festivalData = days;
        notifyLocalListeners();
        return;
    }

    const firestoreDb = db;
    const batch = writeBatch(firestoreDb);
    const daysCollectionRef = collection(firestoreDb, "festival", "schedule", "days");
    const existingDocsSnapshot = await getDocs(daysCollectionRef);
    
    existingDocsSnapshot.forEach(d => batch.delete(d.ref));

    days.forEach(day => {
        batch.set(doc(daysCollectionRef, `day-${day.day}`), day);
    });
    
    await batch.commit();
};