import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { 
    initializeFirebaseAuth, 
    getAuthInstance,
    getUserProfile,
    createUserProfile,
    updateUserProfile,
} from '../services/firebaseClient';
import { User } from '../types';
import firebase from 'firebase/compat/app';

interface AuthContextType {
    user: User | null;
    authInitialized: boolean;
    claimsLoaded: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    setAvatar: (avatarId: string) => Promise<void>;
    watchlist: string[];
    toggleWatchlist: (movieKey: string) => Promise<void>;
    watchedMovies: string[];
    markAsWatched: (movieKey: string) => Promise<void>;
    // Festival & Purchase related
    hasFestivalAllAccess: boolean;
    unlockedFestivalBlockIds: Set<string>;
    purchasedMovieKeys: Set<string>;
    unlockFestivalBlock: (blockId: string) => Promise<void>;
    grantFestivalAllAccess: () => Promise<void>;
    purchaseMovie: (movieKey: string) => Promise<void>;
    subscribe: () => Promise<void>; // For premium
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [authInitialized, setAuthInitialized] = useState(false);
    const [claimsLoaded, setClaimsLoaded] = useState(false);

    // This effect runs once on mount to initialize Firebase and set up the auth state listener.
    useEffect(() => {
        let unsubscribe: firebase.Unsubscribe = () => {};

        const initAuth = async () => {
            const auth = await initializeFirebaseAuth();
            if (auth) {
                unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
                    if (firebaseUser) {
                        // User is signed in.
                        let userProfile = await getUserProfile(firebaseUser.uid);
                        if (!userProfile) {
                            // If user exists in Auth but not in Firestore, create a profile.
                            userProfile = await createUserProfile(firebaseUser.uid, firebaseUser.email!);
                        }
                        setUser(userProfile);
                        
                        // Check for custom claims
                        const idTokenResult = await firebaseUser.getIdTokenResult(true); // Force refresh
                        const claims = idTokenResult.claims;
                        setUser(currentProfile => {
                            if (!currentProfile) return null;
                            const updatedProfile = { ...currentProfile };
                            let needsUpdate = false;
                            
                            if (claims.isActor && !currentProfile.isActor) {
                                updatedProfile.isActor = true;
                                needsUpdate = true;
                            }
                             if (claims.isFilmmaker && !currentProfile.isFilmmaker) {
                                updatedProfile.isFilmmaker = true;
                                needsUpdate = true;
                            }
                            
                            if (needsUpdate) {
                                updateUserProfile(currentProfile.uid, { isActor: updatedProfile.isActor, isFilmmaker: updatedProfile.isFilmmaker });
                            }
                            return updatedProfile;
                        });
                        setClaimsLoaded(true);

                    } else {
                        // User is signed out.
                        setUser(null);
                        setClaimsLoaded(false);
                    }
                    setAuthInitialized(true);
                });
            } else {
                // Firebase initialization failed.
                setAuthInitialized(true);
            }
        };

        initAuth();

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);
    
    // --- Auth Actions ---
    const signIn = async (email: string, password: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Authentication service is not available.");
        await auth.signInWithEmailAndPassword(email, password);
    };

    const signUp = async (email: string, password: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Authentication service is not available.");
        await auth.createUserWithEmailAndPassword(email, password);
        // onAuthStateChanged will handle profile creation.
    };
    
    const logout = async () => {
        const auth = getAuthInstance();
        if (auth) await auth.signOut();
    };
    
    const sendPasswordReset = async (email: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Authentication service is not available.");
        await auth.sendPasswordResetEmail(email);
    };

    // --- Profile Actions ---
    const setAvatar = async (avatarId: string) => {
        if (!user) return;
        await updateUserProfile(user.uid, { avatar: avatarId });
        setUser(currentUser => currentUser ? ({ ...currentUser, avatar: avatarId }) : null);
    };

    // --- Watchlist & Watched History ---
    const watchlist = user?.watchlist || [];
    const watchedMovies = user?.watchedMovies || [];

    const toggleWatchlist = useCallback(async (movieKey: string) => {
        if (!user) return;
        const newWatchlist = watchlist.includes(movieKey)
            ? watchlist.filter(key => key !== movieKey)
            : [...watchlist, movieKey];
        
        await updateUserProfile(user.uid, { watchlist: newWatchlist });
        setUser(currentUser => currentUser ? ({ ...currentUser, watchlist: newWatchlist }) : null);
    }, [user, watchlist]);

    const markAsWatched = useCallback(async (movieKey: string) => {
        if (!user || watchedMovies.includes(movieKey)) return; // Don't do anything if not logged in or already watched
        const newWatchedMovies = [...watchedMovies, movieKey];

        await updateUserProfile(user.uid, { watchedMovies: newWatchedMovies });
        setUser(currentUser => currentUser ? ({ ...currentUser, watchedMovies: newWatchedMovies }) : null);
    }, [user, watchedMovies]);


    // --- Purchases & Subscriptions ---
    const hasFestivalAllAccess = user?.hasFestivalAllAccess || false;
    const unlockedFestivalBlockIds = useMemo(() => new Set(user?.unlockedBlockIds || []), [user]);
    const purchasedMovieKeys = useMemo(() => new Set(user?.purchasedMovieKeys || []), [user]);

    const unlockFestivalBlock = async (blockId: string) => {
        if (!user || unlockedFestivalBlockIds.has(blockId)) return;
        const newUnlocked = [...(user.unlockedBlockIds || []), blockId];
        await updateUserProfile(user.uid, { unlockedBlockIds: newUnlocked });
        setUser(currentUser => currentUser ? ({ ...currentUser, unlockedBlockIds: newUnlocked }) : null);
    };
    
    const grantFestivalAllAccess = async () => {
        if (!user || user.hasFestivalAllAccess) return;
        await updateUserProfile(user.uid, { hasFestivalAllAccess: true });
        setUser(currentUser => currentUser ? ({ ...currentUser, hasFestivalAllAccess: true }) : null);
    };

    const purchaseMovie = async (movieKey: string) => {
        if (!user || purchasedMovieKeys.has(movieKey)) return;
        const newPurchased = [...(user.purchasedMovieKeys || []), movieKey];
        await updateUserProfile(user.uid, { purchasedMovieKeys: newPurchased });
        setUser(currentUser => currentUser ? ({ ...currentUser, purchasedMovieKeys: newPurchased }) : null);
    };

    const subscribe = async () => {
        if (!user || user.isPremiumSubscriber) return;
        await updateUserProfile(user.uid, { isPremiumSubscriber: true });
        setUser(currentUser => currentUser ? ({ ...currentUser, isPremiumSubscriber: true }) : null);

        // Fire-and-forget tracking
        fetch('/api/track-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
        }).catch(err => console.warn('Subscription tracking failed', err));
    };


    const value = {
        user,
        authInitialized,
        claimsLoaded,
        signIn,
        signUp,
        logout,
        sendPasswordReset,
        setAvatar,
        watchlist,
        toggleWatchlist,
        watchedMovies,
        markAsWatched,
        hasFestivalAllAccess,
        unlockedFestivalBlockIds,
        purchasedMovieKeys,
        unlockFestivalBlock,
        grantFestivalAllAccess,
        purchaseMovie,
        subscribe
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};