import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
// FIX: The Firebase V9 modular imports are failing, indicating an older SDK version (likely v8) is installed.
// The code has been refactored to use the v8 namespaced syntax (e.g., auth.onAuthStateChanged) for compatibility.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
// FIX: Corrected type imports to use the new types.ts file
import { User } from '../types';
import { 
    initializeFirebaseAuth, 
    getAuthInstance,
    getUserProfile,
    createUserProfile,
    updateUserProfile
} from '../services/firebaseClient';

// --- LOCAL STORAGE KEYS ---
const WATCHLIST_KEY = 'cratetv-watchlist';
const PURCHASED_MOVIES_KEY = 'cratetv-purchasedMovies';
const UNLOCKED_BLOCKS_KEY = 'cratetv-unlockedBlocks';
const ALL_ACCESS_PASS_KEY = 'cratetv-allAccessPass';

interface AuthContextType {
    user: User | null;
    authInitialized: boolean;
    claimsLoaded: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    logout: () => void;
    setAvatar: (avatarId: string) => void;
    sendPasswordReset: (email: string) => Promise<void>;
    subscribe: () => Promise<void>;
    // Combined watchlist and device-local state
    watchlist: string[];
    purchasedMovies: string[];
    unlockedFestivalBlockIds: Set<string>;
    hasFestivalAllAccess: boolean;
    toggleWatchlist: (movieKey: string) => Promise<void>;
    purchaseMovie: (movieKey: string) => void;
    unlockFestivalBlock: (blockId: string) => void;
    grantFestivalAllAccess: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- User Authentication State ---
    const [user, setUser] = useState<User | null>(null);
    const [authInitialized, setAuthInitialized] = useState(false);
    const [claimsLoaded, setClaimsLoaded] = useState(false);

    // --- State for GUEST users (device-local) ---
    const [anonymousWatchlist, setAnonymousWatchlist] = useState<string[]>([]);
    const [purchasedMovies, setPurchasedMovies] = useState<string[]>([]);
    const [unlockedFestivalBlockIds, setUnlockedFestivalBlockIds] = useState<Set<string>>(new Set());
    const [hasFestivalAllAccess, setHasFestivalAllAccess] = useState(false);

    // Effect for initializing Firebase Auth and handling user state changes
    useEffect(() => {
        initializeFirebaseAuth().then(auth => {
            if (auth) {
                const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: firebase.User | null) => {
                    if (firebaseUser) {
                        setClaimsLoaded(false); // Reset on user change
                        
                        const idTokenResult = await firebaseUser.getIdTokenResult(true);
                        const isActorFromClaim = !!idTokenResult.claims.isActor;
                        const isFilmmakerFromClaim = !!idTokenResult.claims.isFilmmaker;

                        let userProfile = await getUserProfile(firebaseUser.uid);
                        if (!userProfile && firebaseUser.email) {
                            userProfile = await createUserProfile(firebaseUser.uid, firebaseUser.email);
                        }
                        
                        if(userProfile) {
                             const finalIsActor = isActorFromClaim || (userProfile.isActor ?? false);
                             const finalIsFilmmaker = isFilmmakerFromClaim || (userProfile.isFilmmaker ?? false);
                             setUser({ ...userProfile, isActor: finalIsActor, isFilmmaker: finalIsFilmmaker });
                        }

                        setClaimsLoaded(true); // Mark claims as loaded after all async ops
                        
                        // When user logs in, clear any guest data from memory and storage
                        setAnonymousWatchlist([]);
                        localStorage.removeItem(WATCHLIST_KEY);
                    } else {
                        setUser(null);
                        setClaimsLoaded(true); // No user, so claims are "loaded"
                        // When user logs out or is a guest, load device-local data
                        try {
                            const storedWatchlist = localStorage.getItem(WATCHLIST_KEY);
                            setAnonymousWatchlist(storedWatchlist ? JSON.parse(storedWatchlist) : []);
                            const storedMovies = localStorage.getItem(PURCHASED_MOVIES_KEY);
                            if (storedMovies) setPurchasedMovies(JSON.parse(storedMovies));
                            const storedBlocks = localStorage.getItem(UNLOCKED_BLOCKS_KEY);
                            if (storedBlocks) setUnlockedFestivalBlockIds(new Set(JSON.parse(storedBlocks)));
                            const storedPass = localStorage.getItem(ALL_ACCESS_PASS_KEY);
                            if (storedPass === 'true') setHasFestivalAllAccess(true);
                        } catch (error) {
                            console.error("Failed to load guest data from localStorage", error);
                        }
                    }
                    setAuthInitialized(true);
                });
                return () => unsubscribe();
            } else {
                // Auth service is not available, run in guest mode
                 try {
                    const storedWatchlist = localStorage.getItem(WATCHLIST_KEY);
                    setAnonymousWatchlist(storedWatchlist ? JSON.parse(storedWatchlist) : []);
                    const storedMovies = localStorage.getItem(PURCHASED_MOVIES_KEY);
                    if (storedMovies) setPurchasedMovies(JSON.parse(storedMovies));
                    const storedBlocks = localStorage.getItem(UNLOCKED_BLOCKS_KEY);
                    if (storedBlocks) setUnlockedFestivalBlockIds(new Set(JSON.parse(storedBlocks)));
                    const storedPass = localStorage.getItem(ALL_ACCESS_PASS_KEY);
                    if (storedPass === 'true') setHasFestivalAllAccess(true);
                } catch (error) {
                    console.error("Failed to load guest data from localStorage", error);
                }
                setClaimsLoaded(true); // No auth service, claims are "loaded"
                setAuthInitialized(true);
            }
        });
    }, []);


    const handleAuthError = (error: any): string => {
        switch (error.code) {
            case 'auth/wrong-password': case 'auth/invalid-credential': return 'Incorrect email or password.';
            case 'auth/user-not-found': return 'No account found with this email. Please sign up.';
            case 'auth/email-already-in-use': return 'An account with this email already exists. Please sign in.';
            case 'auth/weak-password': return 'Password should be at least 6 characters.';
            case 'auth/invalid-email': return 'Please enter a valid email address.';
            default: return error.message || 'An unknown error occurred.';
        }
    };

    const signIn = async (email: string, password: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Authentication service is not available.");
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            throw new Error(handleAuthError(error));
        }
    };

    const signUp = async (email: string, password: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Authentication service is not available.");
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await createUserProfile(userCredential.user!.uid, email);
        } catch (error) {
            throw new Error(handleAuthError(error));
        }
    };

    const sendPasswordReset = async (email: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Authentication service is not available.");
        try {
            await auth.sendPasswordResetEmail(email);
        } catch (error) {
            throw new Error(handleAuthError(error));
        }
    };

    const logout = () => {
        const auth = getAuthInstance();
        if (auth) auth.signOut();
        window.history.pushState({}, '', '/login');
        window.dispatchEvent(new Event('pushstate'));
    };

    const setAvatar = async (avatarId: string) => {
        if (user) {
            const updatedUser = { ...user, avatar: avatarId };
            setUser(updatedUser);
            try {
                await updateUserProfile(user.uid, { avatar: avatarId });
            } catch (error) {
                console.error("Failed to save avatar:", error);
                setUser(user); 
            }
        }
    };
    
    // --- Watchlist and Entitlement Functions ---

    const toggleWatchlist = async (movieKey: string) => {
        if (user) {
            // User is logged in: sync with Firestore
            const currentWatchlist = user.watchlist || [];
            const isOnList = currentWatchlist.includes(movieKey);
            const newList = isOnList
                ? currentWatchlist.filter(key => key !== movieKey)
                : [...currentWatchlist, movieKey];

            // Optimistically update local state for instant UI feedback
            setUser(prevUser => prevUser ? { ...prevUser, watchlist: newList } : null);
            
            try {
                await updateUserProfile(user.uid, { watchlist: newList });
            } catch (error) {
                console.error("Failed to update watchlist in Firestore:", error);
                // Revert UI on failure
                setUser(prevUser => prevUser ? { ...prevUser, watchlist: currentWatchlist } : null);
            }
        } else {
            // User is a guest: use device local storage
            setAnonymousWatchlist(prev => {
                const isOnList = prev.includes(movieKey);
                const newList = isOnList ? prev.filter(key => key !== movieKey) : [...prev, movieKey];
                localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newList));
                return newList;
            });
        }
    };

    const purchaseMovie = (movieKey: string) => {
        setPurchasedMovies(prev => {
            if (prev.includes(movieKey)) return prev;
            const newList = [...prev, movieKey];
            localStorage.setItem(PURCHASED_MOVIES_KEY, JSON.stringify(newList));
            return newList;
        });
    };
    
    const unlockFestivalBlock = (blockId: string) => {
        setUnlockedFestivalBlockIds(prev => {
            const newIds = new Set(prev);
            newIds.add(blockId);
            localStorage.setItem(UNLOCKED_BLOCKS_KEY, JSON.stringify(Array.from(newIds)));
            return newIds;
        });
    };

    const grantFestivalAllAccess = () => {
        setHasFestivalAllAccess(true);
        localStorage.setItem(ALL_ACCESS_PASS_KEY, 'true');
    };
    
    // This function is for premium subscriptions, which are tied to the account.
    const subscribe = async () => {
        if (user) {
            const updatedUser = { ...user, isPremiumSubscriber: true };
            setUser(updatedUser);
            try {
                await updateUserProfile(user.uid, { isPremiumSubscriber: true });
            } catch (error) {
                console.error("Failed to save premium status:", error);
                setUser(user);
                throw error;
            }
        }
    };
    
    // The unified watchlist value: uses the account's list if logged in, otherwise the device's list.
    const unifiedWatchlist = user?.watchlist ?? anonymousWatchlist;

    const value = { 
        user, authInitialized, claimsLoaded, signIn, signUp, logout, setAvatar, sendPasswordReset, subscribe,
        watchlist: unifiedWatchlist,
        purchasedMovies, unlockedFestivalBlockIds, hasFestivalAllAccess,
        toggleWatchlist, purchaseMovie, unlockFestivalBlock, grantFestivalAllAccess
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};