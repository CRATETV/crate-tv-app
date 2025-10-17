import { FirebaseApp, initializeApp, getApps, getApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    Auth 
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    doc, 
    onSnapshot, 
    getDocs, 
    setDoc, 
    deleteDoc, 
    writeBatch, 
    arrayRemove, 
    limit, 
    query, 
    orderBy,
    Firestore
} from 'firebase/firestore';

import { Movie, Category, FestivalConfig, FestivalDay, AboutData } from '../types';
import { moviesData as initialMovies, categoriesData as initialCategories, festivalData as initialFestivalData, festivalConfigData as initialFestivalConfig, aboutData as initialAboutData } from '../constants';

// --- Asynchronous Firebase Initialization ---

let db: Firestore | null = null;
let auth: Auth | null = null;
let app: FirebaseApp | null = null;

let firebaseInitializationPromise: Promise<void> | null = null;
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
            if (getApps().length === 0) {
                app = initializeApp(firebaseConfig);
            } else {
                app = getApp();
            }
            db = getFirestore(app);
            auth = getAuth(app);
            await signInAnonymously(auth);
            console.log("Firebase initialized successfully.");

        } catch (error) {
            console.error("Firebase initialization failed:", error);
            firebaseInitializationError = error instanceof Error ? error.message : String(error);
            db = null;
            auth = null;
        }
    })();
    
    return firebaseInitializationPromise;
};

initializeFirebase();

// --- Data Structures ---
interface AdminData {
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    festivalConfig: FestivalConfig;
    festivalData: FestivalDay[];
    aboutData: AboutData;
}

interface AdminDataResult {
    data: AdminData;
    source: 'firebase' | 'fallback';
    error?: string;
}

// --- Local In-Memory Store for Fallback Mode ---
const getFallbackData = (): AdminData => ({
    movies: JSON.parse(JSON.stringify(initialMovies)),
    categories: JSON.parse(JSON.stringify(initialCategories)),
    festivalConfig: JSON.parse(JSON.stringify(initialFestivalConfig)),
    festivalData: JSON.parse(JSON.stringify(initialFestivalData)),
    aboutData: JSON.parse(JSON.stringify(initialAboutData)),
});

let localStore: AdminData = getFallbackData();
let localListeners: ((result: AdminDataResult) => void)[] = [];

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
            batch.set(doc(firestoreDb, 'festival/schedule/days', `day-${day.day}`), day);
        });
        batch.set(doc(firestoreDb, 'content', 'about'), initialAboutData);
        
        await batch.commit();
        console.log("Initial data migration complete.");
    }
};

// --- Main Data Service ---
export const listenToAllAdminData = (
    callback: (result: AdminDataResult) => void
): Promise<() => void> => {
    return new Promise(async (resolve) => {
        await initializeFirebase();
        const firestoreDb = db;

        if (!firestoreDb) {
            console.warn("Firebase not connected. Admin panel is running in local-only mode. Changes will not be saved permanently.");
            localListeners.push(callback);
            callback({ data: { ...localStore }, source: 'fallback', error: firebaseInitializationError ?? undefined });
            resolve(() => {
                localListeners = localListeners.filter(l => l !== callback);
                console.log("Unsubscribed from local data listener.");
            });
            return;
        }

        try {
            await migrateInitialData(firestoreDb);

            const adminData: AdminData = getFallbackData();
            let initialLoadComplete = false;
            const expectedLoads = 5;
            let receivedLoads = 0;
            const unsubs: (() => void)[] = [];

            const checkInitialLoadAndCallback = () => {
                if (!initialLoadComplete) {
                    receivedLoads++;
                    if (receivedLoads >= expectedLoads) {
                        initialLoadComplete = true;
                        console.log("Initial data load from Firebase complete.");
                        callback({ data: { ...adminData }, source: 'firebase' });
                    }
                } else {
                    callback({ data: { ...adminData }, source: 'firebase' });
                }
            };

            unsubs.push(onSnapshot(collection(firestoreDb, 'movies'), (snapshot) => {
                const movies: Record<string, Movie> = {};
                snapshot.forEach(doc => { movies[doc.id] = doc.data() as Movie; });
                adminData.movies = movies;
                checkInitialLoadAndCallback();
            }));

            unsubs.push(onSnapshot(collection(firestoreDb, 'categories'), (snapshot) => {
                const categories: Record<string, Category> = {};
                snapshot.forEach(doc => { categories[doc.id] = doc.data() as Category; });
                adminData.categories = categories;
                checkInitialLoadAndCallback();
            }));

            unsubs.push(onSnapshot(doc(firestoreDb, 'festival', 'config'), (doc) => {
                adminData.festivalConfig = doc.exists() ? (doc.data() as FestivalConfig) : initialFestivalConfig;
                checkInitialLoadAndCallback();
            }));
            
            const daysQuery = query(collection(firestoreDb, 'festival/schedule/days'), orderBy('day'));
            unsubs.push(onSnapshot(daysQuery, (snapshot) => {
                const days: FestivalDay[] = [];
                snapshot.forEach(doc => days.push(doc.data() as FestivalDay));
                adminData.festivalData = days;
                checkInitialLoadAndCallback();
            }));

            unsubs.push(onSnapshot(doc(firestoreDb, 'content', 'about'), (doc) => {
                adminData.aboutData = doc.exists() ? (doc.data() as AboutData) : initialAboutData;
                checkInitialLoadAndCallback();
            }));

            resolve(() => {
                console.log("Unsubscribing from all Firebase listeners.");
                unsubs.forEach(unsub => unsub());
            });

        } catch (error) {
            console.error("Failed to set up Firebase listeners:", error);
            callback({ data: { ...localStore }, source: 'fallback', error: error instanceof Error ? error.message : String(error) });
            resolve(() => {});
        }
    });
};

// --- Save/Delete Functions ---
export const saveMovie = async (movie: Movie) => {
    await initializeFirebase();
    const firestoreDb = db;
    if (!firestoreDb) {
        localStore.movies[movie.key] = movie;
        notifyLocalListeners();
        return;
    }
    await setDoc(doc(firestoreDb, 'movies', movie.key), movie);
};

export const deleteMovie = async (movieKey: string) => {
    await initializeFirebase();
    const firestoreDb = db;
    if (!firestoreDb) {
        delete localStore.movies[movieKey];
        Object.keys(localStore.categories).forEach(catKey => {
            localStore.categories[catKey].movieKeys = localStore.categories[catKey].movieKeys.filter(key => key !== movieKey);
        });
        notifyLocalListeners();
        return;
    }
    await deleteDoc(doc(firestoreDb, 'movies', movieKey));
    
    const categoriesSnapshot = await getDocs(collection(firestoreDb, 'categories'));
    const batch = writeBatch(firestoreDb);
    categoriesSnapshot.forEach(categoryDoc => {
        const categoryData = categoryDoc.data() as Category;
        if (categoryData.movieKeys.includes(movieKey)) {
            batch.update(categoryDoc.ref, {
                movieKeys: arrayRemove(movieKey)
            });
        }
    });
    await batch.commit();
};

export const saveCategories = async (categories: Record<string, Category>) => {
    await initializeFirebase();
    const firestoreDb = db;
    if (!firestoreDb) {
        localStore.categories = categories;
        notifyLocalListeners();
        return;
    }
    const batch = writeBatch(firestoreDb);
    Object.entries(categories).forEach(([key, category]) => {
        batch.set(doc(firestoreDb, 'categories', key), category);
    });
    
    const existingCategoriesSnapshot = await getDocs(collection(firestoreDb, 'categories'));
    existingCategoriesSnapshot.forEach(doc => {
        if (!categories[doc.id]) {
            batch.delete(doc.ref);
        }
    });
    await batch.commit();
};

export const saveFestivalConfig = async (config: FestivalConfig) => {
    await initializeFirebase();
    const firestoreDb = db;
    if (!firestoreDb) {
        localStore.festivalConfig = config;
        notifyLocalListeners();
        return;
    }
    await setDoc(doc(firestoreDb, 'festival', 'config'), config);
};

export const saveFestivalDays = async (days: FestivalDay[]) => {
    await initializeFirebase();
    const firestoreDb = db;
    if (!firestoreDb) {
        localStore.festivalData = days;
        notifyLocalListeners();
        return;
    }
    const batch = writeBatch(firestoreDb);
    const collectionRef = collection(firestoreDb, 'festival/schedule/days');
    
    const existingDaysSnapshot = await getDocs(collectionRef);
    existingDaysSnapshot.forEach(doc => batch.delete(doc.ref));

    days.forEach(day => {
        batch.set(doc(collectionRef, `day-${day.day}`), day);
    });
    await batch.commit();
};

export const saveAboutData = async (aboutData: AboutData) => {
    await initializeFirebase();
    const firestoreDb = db;
    if (!firestoreDb) {
        localStore.aboutData = aboutData;
        notifyLocalListeners();
        return;
    }
    await setDoc(doc(firestoreDb, 'content', 'about'), aboutData);
};