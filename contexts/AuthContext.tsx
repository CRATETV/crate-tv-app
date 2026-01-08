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
    hasCrateFestPass: boolean;
    hasJuryPass: boolean;
    unlockedFestivalBlockIds: Set<string>;
    purchasedMovieKeys: Set<string>; 
    rentals: Record<string, string>; 
    unlockedWatchPartyKeys: Set<string>;
    unlockFestivalBlock: (blockId: string) => Promise<void>;
    grantFestivalAllAccess: () => Promise<void>;
    grantCrateFestPass: () => Promise<void>;
    grantJuryPass: () => Promise<void>;
    purchaseMovie: (movieKey: string) => Promise<void>;
    unlockWatchParty: (movieKey: string) => Promise<void>;
    subscribe: () => Promise<void>; 
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

    useEffect(() => {
        let unsubscribe: firebase.Unsubscribe = () => {};

        const initAuth = async () => {
            const auth = await initializeFirebaseAuth();
            if (auth) {
                unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
                    if (firebaseUser) {
                        let userProfile = await getUserProfile(firebaseUser.uid);
                        if (!userProfile) {
                            userProfile = await createUserProfile(firebaseUser.uid, firebaseUser.email!);
                        }
                        setUser(userProfile);
                        
                        const idTokenResult = await firebaseUser.getIdTokenResult(true); 
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
                        setUser(null);
                        setClaimsLoaded(false);
                    }
                    setAuthInitialized(true);
                });
            } else {
                setAuthInitialized(true);
            }
        };

        initAuth();
        return () => unsubscribe();
    }, []);
    
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
                return await auth.currentUser.getIdToken(true);
            } catch (error) {
                console.error("Error getting user ID token:", error);
                return null;
            }
        }
        return null;
    }, []);

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
        if (!user || watchedMovies.includes(movieKey)) return; 
        const newWatchedMovies = [...watchedMovies, movieKey];

        await updateUserProfile(user.uid, { watchedMovies: newWatchedMovies });
        setUser(currentUser => currentUser ? ({ ...currentUser, watchedMovies: newWatchedMovies }) : null);
    }, [user, watchedMovies]);

    const toggleLikeMovie = useCallback(async (movieKey: string) => {
        if (!user) return;

        const newLikedMovies = likedMovies.includes(movieKey)
            ? likedMovies.filter(key => key !== movieKey)
            : [...likedMovies, movieKey];
        
        const action = likedMovies.includes(movieKey) ? 'unlike' : 'like';

        setUser(currentUser => currentUser ? ({ ...currentUser, likedMovies: newLikedMovies }) : null);

        await Promise.all([
            updateUserProfile(user.uid, { likedMovies: newLikedMovies }),
            fetch('/api/toggle-like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey, action }),
            }).catch(err => console.error("Sync failed:", err))
        ]);
    }, [user, likedMovies]);

    const hasFestivalAllAccess = user?.hasFestivalAllAccess || false;
    const hasCrateFestPass = user?.hasCrateFestPass || false;
    const hasJuryPass = user?.hasJuryPass || false;
    const unlockedFestivalBlockIds = useMemo(() => new Set(user?.unlockedBlockIds || []), [user]);
    const purchasedMovieKeys = useMemo(() => new Set(user?.purchasedMovieKeys || []), [user]);
    const rentals = user?.rentals || {};
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

    const grantCrateFestPass = async () => {
        if (!user || user.hasCrateFestPass) return;
        await updateUserProfile(user.uid, { hasCrateFestPass: true });
        setUser(currentUser => currentUser ? ({ ...currentUser, hasCrateFestPass: true }) : null);
    };

    const grantJuryPass = async () => {
        if (!user || user.hasJuryPass) return;
        await updateUserProfile(user.uid, { hasJuryPass: true });
        setUser(currentUser => currentUser ? ({ ...currentUser, hasJuryPass: true }) : null);
    };

    const purchaseMovie = async (movieKey: string) => {
        if (!user) return;
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 24);
        const newRentals = { ...(user.rentals || {}), [movieKey]: expirationDate.toISOString() };
        await updateUserProfile(user.uid, { rentals: newRentals });
        setUser(currentUser => currentUser ? ({ ...currentUser, rentals: newRentals }) : null);
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
        fetch('/api/track-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
        }).catch(err => console.warn('Subscription tracking failed', err));
    };

    const value = {
        user, authInitialized, claimsLoaded, signIn, signUp, logout, sendPasswordReset, getUserIdToken, setAvatar, updateName,
        watchlist, toggleWatchlist, watchedMovies, markAsWatched, likedMovies, toggleLikeMovie,
        hasFestivalAllAccess, hasCrateFestPass, hasJuryPass, unlockedFestivalBlockIds, purchasedMovieKeys, rentals, unlockedWatchPartyKeys,
        unlockFestivalBlock, grantFestivalAllAccess, grantCrateFestPass, grantJuryPass, purchaseMovie, unlockWatchParty, subscribe
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};