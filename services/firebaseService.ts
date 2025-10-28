
// FIX: Refactor to use Firebase v9 compat libraries to fix module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

import { Movie, Category, FestivalConfig, FestivalDay, AboutData, ActorSubmission, PayoutRequest } from '../types';
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
            db = firebase.firestore(app);
            auth = firebase.auth(app);
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
interface AdminData {
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    festivalConfig: FestivalConfig;
    festivalData: FestivalDay[];
    aboutData: AboutData;
    actorSubmissions: ActorSubmission[];
    payoutRequests: PayoutRequest[];
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
    actorSubmissions: [],
    payoutRequests: [],
});

let localStore: AdminData = getFallbackData();
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
    const existingMovieKeys = new Set(moviesSnapshot.docs.map(doc => doc.id));
    for (const [key, movie] of Object.entries(initialMovies)) {
        if (!existingMovieKeys.has(key)) {
            console.log(`- Adding missing movie: ${key}`);
            batch.set(firestoreDb.collection('movies').doc(key), movie);
            operationsCount++;
        }
    }

    // 2. Check for missing CATEGORIES
    const categoriesSnapshot = await firestoreDb.collection('categories').get();
    const existingCategoryKeys = new Set(categoriesSnapshot.docs.map(doc => doc.id));
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

            const adminData: AdminData = getFallbackData();
            let initialLoadComplete = false;
            const expectedLoads = 7; // movies, categories, festivalConfig, festivalData, aboutData, actorSubmissions, payoutRequests
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
            
            const handleError = (error: Error, collectionName: string) => {
                console.error(`Firebase listener error on collection '${collectionName}':`, error);
                // If a listener fails, we can no longer trust the data sync.
                // We'll switch to fallback mode to un-stick the UI and show an error.
                // Stop all other listeners to prevent inconsistent state.
                unsubs.forEach(unsub => unsub());
                callback({ data: getFallbackData(), source: 'fallback', error: `Real-time listener failed on ${collectionName}. The app is now in read-only fallback mode. Please check Firestore permissions and refresh. Error: ${error.message}` });
            };

            unsubs.push(firestoreDb.collection('movies').onSnapshot((snapshot) => {
                const movies: Record<string, Movie> = {};
                snapshot.forEach(doc => { movies[doc.id] = doc.data() as Movie; });
                adminData.movies = movies;
                checkInitialLoadAndCallback();
            }, (error) => handleError(error, 'movies')));

            unsubs.push(firestoreDb.collection('categories').onSnapshot((snapshot) => {
                const categories: Record<string, Category> = {};
                snapshot.forEach(doc => { categories[doc.id] = doc.data() as Category; });
                adminData.categories = categories;
                checkInitialLoadAndCallback();
            }, (error) => handleError(error, 'categories')));

            unsubs.push(firestoreDb.collection('festival').doc('config').onSnapshot((doc) => {
                adminData.festivalConfig = doc.exists ? (doc.data() as FestivalConfig) : initialFestivalConfig;
                checkInitialLoadAndCallback();
            }, (error) => handleError(error, 'festival/config')));
            
            unsubs.push(firestoreDb.collection('festival/schedule/days').orderBy('day').onSnapshot((snapshot) => {
                const days: FestivalDay[] = [];
                snapshot.forEach(doc => days.push(doc.data() as FestivalDay));
                adminData.festivalData = days;
                checkInitialLoadAndCallback();
            }, (error) => handleError(error, 'festival/schedule/days')));

            unsubs.push(firestoreDb.collection('content').doc('about').onSnapshot((doc) => {
                adminData.aboutData = doc.exists ? (doc.data() as AboutData) : initialAboutData;
                checkInitialLoadAndCallback();
            }, (error) => handleError(error, 'content/about')));

            unsubs.push(firestoreDb.collection('actorSubmissions').where('status', '==', 'pending').onSnapshot((snapshot) => {
                const submissions: ActorSubmission[] = [];
                snapshot.forEach(doc => { submissions.push({ id: doc.id, ...doc.data() } as ActorSubmission); });
                // Sort submissions on the client-side to avoid needing a composite index
                submissions.sort((a, b) => {
                    const dateA = a.submissionDate?.seconds || 0;
                    const dateB = b.submissionDate?.seconds || 0;
                    return dateB - dateA;
                });
                adminData.actorSubmissions = submissions;
                checkInitialLoadAndCallback();
            }, (error) => handleError(error, 'actorSubmissions')));
            
            unsubs.push(firestoreDb.collection('payout_requests').orderBy('requestDate', 'desc').onSnapshot((snapshot) => {
                const requests: PayoutRequest[] = [];
                snapshot.forEach(doc => { requests.push({ id: doc.id, ...doc.data() } as PayoutRequest); });
                adminData.payoutRequests = requests;
                checkInitialLoadAndCallback();
            }, (error) => handleError(error, 'payout_requests')));

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
    categoriesSnapshot.forEach(categoryDoc => {
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
    existingDaysSnapshot.forEach(doc => batch.delete(doc.ref));

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
const callSubmissionApi = async (endpoint: string, submissionId: string) => {
    const password = sessionStorage.getItem('adminPassword');
    if (!password) throw new Error("Admin password not found in session.");
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, password }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API call failed.');
    }
    return await response.json();
}

export const approveActorSubmission = async (submissionId: string) => {
    return callSubmissionApi('/api/approve-actor-submission', submissionId);
}

export const rejectActorSubmission = async (submissionId: string) => {
    return callSubmissionApi('/api/reject-actor-submission', submissionId);
}

// --- Payout Functions ---
export const completePayoutRequest = async (requestId: string) => {
    const password = sessionStorage.getItem('adminPassword');
    if (!password) throw new Error("Admin password not found in session.");

    const response = await fetch('/api/complete-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, password }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete payout.');
    }
    return await response.json();
};
