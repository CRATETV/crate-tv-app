// FIX: The Firebase V9 modular imports are failing, indicating an older SDK version (likely v8) is installed.
// The code has been refactored to use the v8 namespaced/compat syntax for all Firebase App, Auth, and Firestore interactions.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';


// FIX: Corrected type imports to use the new types.ts file
import { Movie, Category, FestivalConfig, FestivalDay, AboutData, ActorSubmission, MoviePipelineEntry, LiveData } from '../types';
import { moviesData as initialMovies, categoriesData as initialCategories, festivalData as initialFestivalData, festivalConfigData as initialFestivalConfig, aboutData as initialAboutData } from '../constants';

// --- Asynchronous Firebase Initialization ---

let db: firebase.firestore.Firestore | null = null;
let auth: firebase.auth.Auth | null = null;
let app: firebase.app.App | null = null;

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
            if (firebase.apps.length === 0) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.app();
            }
            db = app.firestore();
            auth = app.auth();
            await auth.signInAnonymously();
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
interface AdminDataResult {
    data: LiveData;
    source: 'firebase' | 'fallback';
    error?: string;
}

// --- Local In-Memory Store for Fallback Mode ---
const getFallbackData = (): LiveData => ({
    movies: JSON.parse(JSON.stringify(initialMovies)),
    categories: JSON.parse(JSON.stringify(initialCategories)),
    festivalConfig: JSON.parse(JSON.stringify(initialFestivalConfig)),
    festivalData: JSON.parse(JSON.stringify(initialFestivalData)),
    aboutData: JSON.parse(JSON.stringify(initialAboutData)),
    actorSubmissions: [],
    moviePipeline: [],
});

let localStore: LiveData = getFallbackData();
let localListeners: ((result: AdminDataResult) => void)[] = [];

const notifyLocalListeners = () => {
    console.log("Notifying local listeners with updated in-memory data.");
    localListeners.forEach(cb => cb({ data: { ...localStore }, source: 'fallback', error: firebaseInitializationError ?? undefined }));
};

// --- Fallback and Migration ---
const migrateInitialData = async (firestoreDb: firebase.firestore.Firestore) => {
    console.log("Checking for missing initial data in Firestore...");
    const batch = firestoreDb.batch();
    let operationsCount = 0;

    // 1. Check for missing MOVIES
    const moviesSnapshot = await firestoreDb.collection('movies').get();
    const existingMovieKeys = new Set(moviesSnapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => doc.id));
    for (const [key, movie] of Object.entries(initialMovies)) {
        if (!existingMovieKeys.has(key)) {
            console.log(`- Adding missing movie: ${key}`);
            batch.set(firestoreDb.collection('movies').doc(key), movie);
            operationsCount++;
        }
    }

    // 2. Check for missing CATEGORIES
    const categoriesSnapshot = await firestoreDb.collection('categories').get();
    const existingCategoryKeys = new Set(categoriesSnapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => doc.id));
    for (const [key, category] of Object.entries(initialCategories)) {
        if (!existingCategoryKeys.has(key)) {
            console.log(`- Adding missing category: ${key}`);
            batch.set(firestoreDb.collection('categories').doc(key), category);
            operationsCount++;
        }
    }

    // 3. Check for FESTIVAL CONFIG
    const festivalConfigDoc = await firestoreDb.collection('festival').doc('config').get();
    if (!festivalConfigDoc.exists) {
        console.log("- Adding missing festival config.");
        batch.set(firestoreDb.collection('festival').doc('config'), initialFestivalConfig);
        operationsCount++;
    }

    // 4. Check for FESTIVAL DAYS
    const festivalDaysSnapshot = await firestoreDb.collection('festival/schedule/days').get();
    if (festivalDaysSnapshot.empty) {
        console.log("- Adding missing festival schedule days.");
        initialFestivalData.forEach(day => {
            batch.set(firestoreDb.collection('festival/schedule/days').doc(`day-${day.day}`), day);
            operationsCount++;
        });
    }
    
    // 5. Check for ABOUT CONTENT
    const aboutContentDoc = await firestoreDb.collection('content').doc('about').get();
    if (!aboutContentDoc.exists) {
        console.log("- Adding missing 'About Us' content.");
        batch.set(firestoreDb.collection('content').doc('about'), initialAboutData);
        operationsCount++;
    }

    // Commit the batch only if there are new operations to perform
    if (operationsCount > 0) {
        await batch.commit();
        console.log(`Initial data sync complete. Added ${operationsCount} missing item(s).`);
    } else {
        console.log("Firestore data is already in sync with initial constants.");
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

            const adminData: LiveData = getFallbackData();
            
            // This closure-based counter is more robust for handling the initial load.
            const checkInitialLoadAndCallback = (() => {
                let loads = 0;
                const expected = 7; // Increased for the new moviePipeline listener
                let initialLoadDone = false;
                
                return (error?: { collection: string, message: string }) => {
                    if (error) {
                        console.error(`Listener error on ${error.collection}: ${error.message}. This might be a missing Firestore index.`);
                    }

                    if (initialLoadDone) {
                        callback({ data: { ...adminData }, source: 'firebase' });
                        return;
                    }
                    
                    loads++;
                    if (loads >= expected) {
                        initialLoadDone = true;
                        console.log("Initial data load from Firebase complete (with or without errors).");
                        callback({ data: { ...adminData }, source: 'firebase' });
                    }
                };
            })();
            
            const onError = (error: Error, collectionName: string) => {
                checkInitialLoadAndCallback({ collection: collectionName, message: error.message });
            };
            
            const unsubs: (() => void)[] = [];

            unsubs.push(firestoreDb.collection('movies').onSnapshot((snapshot: firebase.firestore.QuerySnapshot) => {
                const movies: Record<string, Movie> = {};
                snapshot.forEach((doc: firebase.firestore.QueryDocumentSnapshot) => { movies[doc.id] = doc.data() as Movie; });
                adminData.movies = movies;
                checkInitialLoadAndCallback();
            }, (err: Error) => onError(err, 'movies')));

            unsubs.push(firestoreDb.collection('categories').onSnapshot((snapshot: firebase.firestore.QuerySnapshot) => {
                const categories: Record<string, Category> = {};
                snapshot.forEach((doc: firebase.firestore.QueryDocumentSnapshot) => { categories[doc.id] = doc.data() as Category; });
                adminData.categories = categories;
                checkInitialLoadAndCallback();
            }, (err: Error) => onError(err, 'categories')));

            unsubs.push(firestoreDb.collection('festival').doc('config').onSnapshot((doc: firebase.firestore.DocumentSnapshot) => {
                adminData.festivalConfig = doc.exists ? (doc.data() as FestivalConfig) : initialFestivalConfig;
                checkInitialLoadAndCallback();
            }, (err: Error) => onError(err, 'festival/config')));
            
            const daysQuery = firestoreDb.collection('festival/schedule/days').orderBy('day');
            unsubs.push(daysQuery.onSnapshot((snapshot: firebase.firestore.QuerySnapshot) => {
                const days: FestivalDay[] = [];
                snapshot.forEach((doc: firebase.firestore.QueryDocumentSnapshot) => days.push(doc.data() as FestivalDay));
                adminData.festivalData = days;
                checkInitialLoadAndCallback();
            }, (err: Error) => onError(err, 'festival/schedule/days')));

            unsubs.push(firestoreDb.collection('content').doc('about').onSnapshot((doc: firebase.firestore.DocumentSnapshot) => {
                adminData.aboutData = doc.exists ? (doc.data() as AboutData) : initialAboutData;
                checkInitialLoadAndCallback();
            }, (err: Error) => onError(err, 'content/about')));

            const submissionsQuery = firestoreDb.collection('actorSubmissions').where('status', '==', 'pending').orderBy('submissionDate', 'desc');
            unsubs.push(submissionsQuery.onSnapshot((snapshot: firebase.firestore.QuerySnapshot) => {
                const submissions: ActorSubmission[] = [];
                snapshot.forEach((doc: firebase.firestore.QueryDocumentSnapshot) => { submissions.push({ id: doc.id, ...doc.data() } as ActorSubmission); });
                adminData.actorSubmissions = submissions;
                checkInitialLoadAndCallback();
            }, (err: Error) => onError(err, 'actorSubmissions')));

            const pipelineQuery = firestoreDb.collection('movie_pipeline').where('status', '==', 'pending').orderBy('submittedAt', 'desc');
            unsubs.push(pipelineQuery.onSnapshot((snapshot: firebase.firestore.QuerySnapshot) => {
                const pipeline: MoviePipelineEntry[] = [];
                snapshot.forEach((doc: firebase.firestore.QueryDocumentSnapshot) => { pipeline.push({ id: doc.id, ...doc.data() } as MoviePipelineEntry); });
                adminData.moviePipeline = pipeline;
                checkInitialLoadAndCallback();
            }, (err: Error) => onError(err, 'movie_pipeline')));

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
    await firestoreDb.collection('movies').doc(movie.key).set(movie);
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
    await firestoreDb.collection('movies').doc(movieKey).delete();
    
    const categoriesSnapshot = await firestoreDb.collection('categories').get();
    const batch = firestoreDb.batch();
    categoriesSnapshot.forEach((categoryDoc: firebase.firestore.QueryDocumentSnapshot) => {
        const categoryData = categoryDoc.data() as Category;
        if (categoryData.movieKeys.includes(movieKey)) {
            batch.update(categoryDoc.ref, {
                movieKeys: firebase.firestore.FieldValue.arrayRemove(movieKey)
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
    const batch = firestoreDb.batch();
    Object.entries(categories).forEach(([key, category]) => {
        batch.set(firestoreDb.collection('categories').doc(key), category);
    });
    
    const existingCategoriesSnapshot = await firestoreDb.collection('categories').get();
    existingCategoriesSnapshot.forEach((doc: firebase.firestore.QueryDocumentSnapshot) => {
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
    await firestoreDb.collection('festival').doc('config').set(config);
};

export const saveFestivalDays = async (days: FestivalDay[]) => {
    await initializeFirebase();
    const firestoreDb = db;
    if (!firestoreDb) {
        localStore.festivalData = days;
        notifyLocalListeners();
        return;
    }
    const batch = firestoreDb.batch();
    const collectionRef = firestoreDb.collection('festival/schedule/days');
    
    const existingDaysSnapshot = await collectionRef.get();
    existingDaysSnapshot.forEach((doc: firebase.firestore.QueryDocumentSnapshot) => batch.delete(doc.ref));

    days.forEach(day => {
        batch.set(collectionRef.doc(`day-${day.day}`), day);
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
    await firestoreDb.collection('content').doc('about').set(aboutData);
};

// --- Actor Submission Functions ---
const callSubmissionApi = async (endpoint: string, payload: object) => {
    const password = sessionStorage.getItem('adminPassword');
    if (!password) throw new Error("Admin password not found in session.");
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, password }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API call failed.');
    }
    return await response.json();
}

export const approveActorSubmission = async (submissionId: string) => {
    return callSubmissionApi('/api/approve-actor-submission', { submissionId });
}

export const rejectActorSubmission = async (submissionId: string, reason?: string) => {
    return callSubmissionApi('/api/reject-actor-submission', { submissionId, reason });
}

// --- Movie Pipeline Functions ---
export const addMoviePipelineEntry = async (entry: Omit<MoviePipelineEntry, 'id' | 'submittedAt' | 'status'>) => {
    await initializeFirebase();
    const firestoreDb = db;
    if (!firestoreDb) {
        console.warn("Local mode: Cannot add pipeline entry.");
        return;
    }
    const collectionRef = firestoreDb.collection('movie_pipeline');
    await collectionRef.add({
        ...entry,
        status: 'pending',
        submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
};

export const deleteMoviePipelineEntry = async (id: string) => {
     await initializeFirebase();
    const firestoreDb = db;
    if (!firestoreDb) {
        console.warn("Local mode: Cannot delete pipeline entry.");
        return;
    }
    const docRef = firestoreDb.collection('movie_pipeline').doc(id);
    await docRef.delete();
};