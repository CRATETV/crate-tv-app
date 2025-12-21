
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
    signUp: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    setAvatar: (avatarId: string) => Promise<void>;
    updateName: (name: string) => Promise<void>;
    getUserIdToken: () => Promise<string | null>;
    watchlist: string[];
    toggleWatchlist: (movieKey: string) => Promise<void>;
    watchedMovies: string[];
    markAsWatched: (movieKey: string) => Promise<void>;
    likedMovies: string[];
    toggleLikeMovie: (movieKey: string) => Promise<void>;
    // Festival & Purchase related
    hasFestivalAllAccess: boolean;
    unlockedFestivalBlockIds: Set<string>;
    purchasedMovieKeys: Set<string>;
    unlockedWatchPartyKeys: Set<string>;
    unlockFestivalBlock: (blockId: string) => Promise<void>;
    grantFestivalAllAccess: () => Promise<void>;
    purchaseMovie: (movieKey: string) => Promise<void>;
    unlockWatchParty: (movieKey: string) => Promise<void>;
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

    const signUp = async (email: string, password: string, name: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Authentication service is not available.");
        const result = await auth.createUserWithEmailAndPassword(email, password);
        if (result.user) {
            // Immediately create the profile with the provided name
            await createUserProfile(result.user.uid, email, name);
        }
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

    const getUserIdToken = useCallback(async (): Promise<string | null> => {
        const auth = getAuthInstance();
        if (auth?.currentUser) {
            try {
                // Force refresh to get a fresh token. Important for security.
                return await auth.currentUser.getIdToken(true);
            } catch (error) {
                console.error("Error getting user ID token:", error);
                return null;
            }
        }
        return null;
    }, []);

    // --- Profile Actions ---
    const setAvatar = async (avatarId: string) => {
        if (!user) return;
        await updateUserProfile(user.uid, { avatar: avatarId });
        setUser(currentUser => currentUser ? ({ ...currentUser, avatar: avatarId }) : null);
    };
    
    const updateName = useCallback(async (name: string) => {
        if (!user) return;
        await updateUserProfile(user.uid, { name });
        setUser(currentUser => currentUser ? ({ ...currentUser, name }) : null);
    }, [user]);

    // --- Watchlist, Watched History, and Liked Movies ---
    const watchlist = user?.watchlist || [];
    const watchedMovies = user?.watchedMovies || [];
    const likedMovies = user?.likedMovies || [];

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

    const toggleLikeMovie = useCallback(async (movieKey: string) => {
        if (!user) {
            console.log("User must be logged in to like movies.");
            return;
        }

        const newLikedMovies = likedMovies.includes(movieKey)
            ? likedMovies.filter(key => key !== movieKey)
            : [...likedMovies, movieKey];
        
        const action = likedMovies.includes(movieKey) ? 'unlike' : 'like';

        // Optimistically update the local user state for immediate UI feedback
        setUser(currentUser => currentUser ? ({ ...currentUser, likedMovies: newLikedMovies }) : null);

        // Update Firestore for persistence and the public counter API in parallel
        await Promise.all([
            updateUserProfile(user.uid, { likedMovies: newLikedMovies }),
            fetch('/api/toggle-like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey, action }),
            }).catch(err => {
                console.error("Failed to sync public like count:", err);
            })
        ]);
    }, [user, likedMovies]);


    // --- Purchases & Subscriptions ---
    const hasFestivalAllAccess = user?.hasFestivalAllAccess || false;
    const unlockedFestivalBlockIds = useMemo(() => new Set(user?.unlockedBlockIds || []), [user]);
    const purchasedMovieKeys = useMemo(() => new Set(user?.purchasedMovieKeys || []), [user]);
    const unlockedWatchPartyKeys = useMemo(() => new Set(user?.unlockedWatchPartyKeys || []), [user]);

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

    const unlockWatchParty = async (movieKey: string) => {
        if (!user || unlockedWatchPartyKeys.has(movieKey)) return;
        const newUnlocked = [...(user.unlockedWatchPartyKeys || []), movieKey];
        await updateUserProfile(user.uid, { unlockedWatchPartyKeys: newUnlocked });
        setUser(currentUser => currentUser ? ({ ...currentUser, unlockedWatchPartyKeys: newUnlocked }) : null);
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
        getUserIdToken,
        setAvatar,
        updateName,
        watchlist,
        toggleWatchlist,
        watchedMovies,
        markAsWatched,
        likedMovies,
        toggleLikeMovie,
        hasFestivalAllAccess,
        unlockedFestivalBlockIds,
        purchasedMovieKeys,
        unlockedWatchPartyKeys,
        unlockFestivalBlock,
        grantFestivalAllAccess,
        purchaseMovie,
        unlockWatchParty,
        subscribe
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
