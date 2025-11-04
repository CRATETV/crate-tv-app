import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { initializeFirebaseAuth, getAuthInstance, getUserProfile, createUserProfile, updateUserProfile } from '../services/firebaseClient';
import { User } from '../types';

interface AuthContextType {
    user: User | null;
    authInitialized: boolean;
    claimsLoaded: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    setAvatar: (avatarId: string) => Promise<void>;
    toggleWatchlist: (movieKey: string) => Promise<void>;
    watchlist: string[];
    subscribe: () => void;
    unlockedFestivalBlockIds: Set<string>;
    hasFestivalAllAccess: boolean;
    unlockFestivalBlock: (blockId: string) => Promise<void>;
    grantFestivalAllAccess: () => Promise<void>;
    purchaseMovie: (movieKey: string) => Promise<void>;
    purchasedMovieKeys: Set<string>;
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
    const [watchlist, setWatchlist] = useState<string[]>([]);
    
    // Festival related state
    const [unlockedFestivalBlockIds, setUnlockedFestivalBlockIds] = useState<Set<string>>(new Set());
    const [hasFestivalAllAccess, setHasFestivalAllAccess] = useState(false);
    const [purchasedMovieKeys, setPurchasedMovieKeys] = useState<Set<string>>(new Set());

    useEffect(() => {
        const initializeAuth = async () => {
            const auth = await initializeFirebaseAuth();
            if (!auth) {
                setAuthInitialized(true);
                return;
            }

            const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
                if (firebaseUser) {
                    const profile = await getUserProfile(firebaseUser.uid);
                    if (profile) {
                        setUser(profile);
                        // FIX: Type 'unknown[]' is not assignable to type 'string[]'.
                        // Data from firestore is not guaranteed to be clean, so we sanitize all array fields here as a safeguard.
                        // FIX: Use an explicit type guard `(item): item is string` to ensure TypeScript correctly infers the result of the filter as `string[]`, resolving downstream type errors.
                        setWatchlist(Array.isArray(profile.watchlist) ? profile.watchlist.filter((item: any): item is string => typeof item === 'string') : []);
                        setHasFestivalAllAccess(profile.hasFestivalAllAccess || false);
                        // FIX: Use an explicit type guard `(item): item is string` to ensure TypeScript correctly infers the result of the filter as `string[]`, resolving downstream type errors.
                        setUnlockedFestivalBlockIds(new Set(Array.isArray(profile.unlockedBlockIds) ? profile.unlockedBlockIds.filter((item: any): item is string => typeof item === 'string') : []));
                        // FIX: Use an explicit type guard `(item): item is string` to ensure TypeScript correctly infers the result of the filter as `string[]`, resolving downstream type errors.
                        setPurchasedMovieKeys(new Set(Array.isArray(profile.purchasedMovieKeys) ? profile.purchasedMovieKeys.filter((item: any): item is string => typeof item === 'string') : []));
                    } else {
                        const newProfile = await createUserProfile(firebaseUser.uid, firebaseUser.email!);
                        setUser(newProfile);
                        setWatchlist([]);
                        setHasFestivalAllAccess(false);
                        setUnlockedFestivalBlockIds(new Set());
                        setPurchasedMovieKeys(new Set());
                    }

                    const idTokenResult = await firebaseUser.getIdTokenResult(true);
                    const claims = idTokenResult.claims;
                    setUser(prevUser => {
                        if (!prevUser) return null;
                        const updatedUser = {
                            ...prevUser,
                            isActor: !!claims.isActor,
                            isFilmmaker: !!claims.isFilmmaker,
                            isPremiumSubscriber: !!claims.isPremiumSubscriber,
                        };
                        if (prevUser.isActor !== updatedUser.isActor || prevUser.isFilmmaker !== updatedUser.isFilmmaker || prevUser.isPremiumSubscriber !== updatedUser.isPremiumSubscriber) {
                            updateUserProfile(prevUser.uid, { isActor: updatedUser.isActor, isFilmmaker: updatedUser.isFilmmaker, isPremiumSubscriber: updatedUser.isPremiumSubscriber });
                        }
                        return updatedUser;
                    });
                    setClaimsLoaded(true);

                } else {
                    setUser(null);
                    setClaimsLoaded(false);
                    setWatchlist([]);
                    setHasFestivalAllAccess(false);
                    setUnlockedFestivalBlockIds(new Set());
                    setPurchasedMovieKeys(new Set());
                }
                setAuthInitialized(true);
            });

            return () => unsubscribe();
        };

        const unsubscribePromise = initializeAuth();

        return () => {
            unsubscribePromise.then(unsub => {
                if (unsub) unsub();
            });
        };
    }, []);
    
    const subscribe = useCallback(() => {
        if(user) {
            const updatedUser = { ...user, isPremiumSubscriber: true };
            setUser(updatedUser);
            updateUserProfile(user.uid, { isPremiumSubscriber: true });
             // Also track subscription event
            fetch('/api/track-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email }),
            }).catch(err => console.warn("Failed to track subscription event:", err));
        }
    }, [user]);

    const unlockFestivalBlock = useCallback(async (blockId: string) => {
        if (!user) return;
        const newUnlockedIds = new Set(unlockedFestivalBlockIds).add(blockId);
        setUnlockedFestivalBlockIds(newUnlockedIds); // Optimistic update
        try {
            // FIX: Type 'unknown[]' is not assignable to type 'string[]'. Replaced Array.from with spread syntax to ensure correct type inference.
            await updateUserProfile(user.uid, { unlockedBlockIds: [...newUnlockedIds] });
        } catch (error) {
            console.error("Failed to save unlocked block:", error);
            setUnlockedFestivalBlockIds(unlockedFestivalBlockIds); // Revert on error
            throw error;
        }
    }, [user, unlockedFestivalBlockIds]);

    const grantFestivalAllAccess = useCallback(async () => {
        if (!user) return;
        setHasFestivalAllAccess(true); // Optimistic update
        try {
            await updateUserProfile(user.uid, { hasFestivalAllAccess: true });
        } catch (error) {
            console.error("Failed to save all-access pass:", error);
            setHasFestivalAllAccess(false); // Revert on error
            throw error;
        }
    }, [user]);
    
    const purchaseMovie = useCallback(async (movieKey: string) => {
        if (!user) return;
        const newPurchases = new Set(purchasedMovieKeys).add(movieKey);
        setPurchasedMovieKeys(newPurchases); // Optimistic update
        try {
            // FIX: Type 'unknown[]' is not assignable to type 'string[]'. Replaced Array.from with spread syntax to ensure correct type inference.
            await updateUserProfile(user.uid, { purchasedMovieKeys: [...newPurchases] });
        } catch (error) {
            console.error("Failed to save movie purchase:", error);
            setPurchasedMovieKeys(purchasedMovieKeys); // Revert on error
            throw error;
        }
    }, [user, purchasedMovieKeys]);

    const signIn = (email: string, password: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Auth service is not available.");
        return auth.signInWithEmailAndPassword(email, password).then(() => {});
    };

    const signUp = async (email: string, password: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Auth service is not available.");
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        if (userCredential.user) {
            const newProfile = await createUserProfile(userCredential.user.uid, email);
            setUser(newProfile);
            setWatchlist([]);
        }
    };
    
    const logout = () => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Auth service is not available.");
        return auth.signOut();
    };

    const sendPasswordReset = (email: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Auth service is not available.");
        return auth.sendPasswordResetEmail(email);
    };

    const setAvatar = async (avatarId: string) => {
        if (!user) return;
        setUser({ ...user, avatar: avatarId });
        await updateUserProfile(user.uid, { avatar: avatarId });
    };

    const toggleWatchlist = useCallback(async (movieKey: string) => {
        if (!user) return;

        const newWatchlist = watchlist.includes(movieKey)
            ? watchlist.filter(key => key !== movieKey)
            : [...watchlist, movieKey];

        setWatchlist(newWatchlist); // Optimistic update
        try {
            await updateUserProfile(user.uid, { watchlist: newWatchlist });
        } catch (error) {
            console.error("Failed to update watchlist:", error);
            setWatchlist(watchlist); // Revert on error
            throw error;
        }
    }, [user, watchlist]);

    const value: AuthContextType = {
        user,
        authInitialized,
        claimsLoaded,
        signIn,
        signUp,
        logout,
        sendPasswordReset,
        setAvatar,
        toggleWatchlist,
        watchlist,
        subscribe,
        unlockedFestivalBlockIds,
        hasFestivalAllAccess,
        unlockFestivalBlock,
        grantFestivalAllAccess,
        purchaseMovie,
        purchasedMovieKeys,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
