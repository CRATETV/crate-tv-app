import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { 
    initializeFirebaseAuth, 
    getAuthInstance,
    getDbInstance,
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
    signInWithMagicLink: (email: string) => Promise<void>;
    completeMagicLinkSignIn: (email: string) => Promise<void>;
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
    updatePlaybackProgress: (movieKey: string, seconds: number) => Promise<void>;
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
    
    const generateSessionToken = () => {
        const token = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
        return token;
    };

    const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

    const writeSessionToken = async (uid: string) => {
        const db = getDbInstance();
        if (!db) return;
        const token = generateSessionToken();
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
        localStorage.setItem('crate_session_token', token);
        localStorage.setItem('crate_session_expires', expiresAt);
        await db.collection('users').doc(uid).update({
            activeSessionToken: token,
            sessionExpiresAt: expiresAt,
            lastLoginAt: new Date().toISOString()
        });
    };

    // Auto-grants festival access if this user's email is on the PWFF invite
    // list — used right after sign-in/sign-up. This used to write
    // `unlockedBlocks` / `hasFestivalAllAccess` directly to Firestore from
    // the browser on every login, which firestore.rules blocks (that's the
    // "Missing or insufficient permissions" error showing up in the
    // console) — moved server-side into api/grant-invite-access.ts, same
    // pattern as every other access grant. Best-effort: if it fails, login
    // itself still succeeds, it just doesn't unlock the invite that time.
    const grantInviteAccessIfEligible = async (firebaseUser: { getIdToken: (forceRefresh?: boolean) => Promise<string> }) => {
        try {
            const idToken = await firebaseUser.getIdToken();
            await fetch('/api/grant-invite-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });
        } catch (e) {
            console.error('Failed to check/grant invite access:', e);
        }
    };

    const signIn = async (email: string, password: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Authentication service is not available.");
        const result = await auth.signInWithEmailAndPassword(email, password);
        if (result.user) {
            await writeSessionToken(result.user.uid);
            await grantInviteAccessIfEligible(result.user);
        }
    };

    const signInWithMagicLink = async (email: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Authentication service is not available.");
        
        const actionCodeSettings = {
            url: window.location.href, // Redirect back to the current page
            handleCodeInApp: true,
        };
        
        await auth.sendSignInLinkToEmail(email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
    };

    const completeMagicLinkSignIn = async (email: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Authentication service is not available.");
        
        if (auth.isSignInWithEmailLink(window.location.href)) {
            await auth.signInWithEmailLink(email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
        }
    };

    const signUp = async (email: string, password: string, name: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Authentication service is not available.");
        const result = await auth.createUserWithEmailAndPassword(email, password);
        if (result.user) {
            await createUserProfile(result.user.uid, email, name);
            await writeSessionToken(result.user.uid);
            await grantInviteAccessIfEligible(result.user);
        }
    };
    
    const logout = async () => {
        const auth = getAuthInstance();
        if (auth) {
            // Clear session token from Firestore on intentional logout
            if (user) {
                const db = getDbInstance();
                if (db) {
                    await db.collection('users').doc(user.uid).update({ activeSessionToken: null }).catch(() => {});
                }
            }
            localStorage.removeItem('crate_session_token');
            await auth.signOut();
        }
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
    const playbackProgress = user?.playbackProgress || {};

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

    const updatePlaybackProgress = useCallback(async (movieKey: string, seconds: number) => {
        if (!user) return;
        
        // Optimistic update
        setUser(currentUser => {
            if (!currentUser) return null;
            return {
                ...currentUser,
                playbackProgress: {
                    ...(currentUser.playbackProgress || {}),
                    [movieKey]: seconds
                }
            };
        });

        // Background sync
        fetch('/api/update-playback-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movieKey, seconds, userId: user.uid }),
        }).catch(err => console.error("Progress sync failed:", err));
    }, [user]);

    const hasFestivalAllAccess = useMemo(() => {
        if (user?.hasFestivalAllAccess) return true; // Legacy support
        if (user?.festivalPassExpiry && new Date(user.festivalPassExpiry) > new Date()) return true;
        return false;
    }, [user]);

    const hasCrateFestPass = useMemo(() => {
        if (user?.hasCrateFestPass) return true; // Legacy support
        if (user?.crateFestPassExpiry && new Date(user.crateFestPassExpiry) > new Date()) return true;
        return false;
    }, [user]);
    const hasJuryPass = user?.hasJuryPass || false;
    const unlockedFestivalBlockIds = useMemo(() => {
        const blocks = user?.unlockedBlocks || {};
        const validBlocks = new Set<string>();
        Object.entries(blocks).forEach(([id, exp]) => {
            if (new Date(exp) > new Date()) validBlocks.add(id);
        });
        // Backwards compatibility for old string[] format
        if (Array.isArray(user?.unlockedBlockIds)) {
            user.unlockedBlockIds.forEach(id => validBlocks.add(id));
        }
        return validBlocks;
    }, [user]);
    const purchasedMovieKeys = useMemo(() => new Set(user?.purchasedMovieKeys || []), [user]);
    const rentals = user?.rentals || {};
    const unlockedWatchPartyKeys = useMemo(() => new Set(user?.unlockedWatchPartyKeys || []), [user]);

    // unlockFestivalBlock / purchaseMovie / unlockWatchParty used to write
    // directly to Firestore from the browser — which meant anyone with
    // devtools open could grant themselves any paid movie or festival block
    // for free by just calling these functions (or replicating the write)
    // without ever paying. firestore.rules now blocks client writes to these
    // fields entirely (rentals / unlockedWatchPartyKeys / unlockedBlocks);
    // the real grant happens server-side, with the Admin SDK, only after a
    // verified Square payment (api/process-square-payment.ts) or a verified
    // ticket-code redemption (api/redeem-ticket-code.ts). These functions now
    // only update local state so the UI reflects the unlock immediately
    // instead of waiting on the next profile fetch — they're called right
    // after those server calls already succeeded, not instead of them.
    const unlockFestivalBlock = async (blockId: string) => {
        if (!user || unlockedFestivalBlockIds.has(blockId)) return;
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 14); // 2 weeks — mirrors the server-side grant's window
        const newUnlockedBlocks = { ...(user.unlockedBlocks || {}), [blockId]: expirationDate.toISOString() };
        setUser(currentUser => currentUser ? ({ ...currentUser, unlockedBlocks: newUnlockedBlocks }) : null);
    };
    
    // These three still wrote hasFestivalAllAccess / hasCrateFestPass /
    // hasJuryPass directly to Firestore from the browser — exactly the
    // fields firestore.rules' isWritingProtectedFields() now blocks clients
    // from writing (the same fix already applied to unlockFestivalBlock /
    // purchaseMovie / unlockWatchParty above, just missed on these three).
    // With the rules actually deployed, that write now fails outright —
    // meaning anyone who bought the $50 all-access pass, the CrateFest pass,
    // or a Jury Pass would get charged and then hit a permission-denied
    // error trying to grant themselves the very thing they just paid for.
    // The real grant already happens server-side (Admin SDK) in
    // process-square-payment.ts / the jury invite flow — these just need to
    // update local state so the UI reflects it immediately, same pattern as
    // the others.
    const grantFestivalAllAccess = async () => {
        if (!user) return;
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 14); // 2 weeks — mirrors the server-side grant's window
        const update = {
            hasFestivalAllAccess: true,
            festivalPassExpiry: expirationDate.toISOString()
        };
        setUser(currentUser => currentUser ? ({ ...currentUser, ...update }) : null);
    };

    const grantCrateFestPass = async () => {
        if (!user) return;
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 14); // 2 weeks
        const update = {
            hasCrateFestPass: true,
            crateFestPassExpiry: expirationDate.toISOString()
        };
        setUser(currentUser => currentUser ? ({ ...currentUser, ...update }) : null);
    };

    const grantJuryPass = async () => {
        if (!user || user.hasJuryPass) return;
        setUser(currentUser => currentUser ? ({ ...currentUser, hasJuryPass: true }) : null);
    };

    const purchaseMovie = async (movieKey: string) => {
        if (!user) return;
        // Local-only optimistic update — see note above unlockFestivalBlock.
        const expirationDate = new Date();
        // Updated to 48 hours as requested
        expirationDate.setHours(expirationDate.getHours() + 48);
        const newRentals = { ...(user.rentals || {}), [movieKey]: expirationDate.toISOString() };
        setUser(currentUser => currentUser ? ({ ...currentUser, rentals: newRentals }) : null);
    };

    const unlockWatchParty = async (movieKey: string) => {
        if (!user || unlockedWatchPartyKeys.has(movieKey)) return;
        // Local-only optimistic update — see note above unlockFestivalBlock.
        const newUnlocked = [...(user.unlockedWatchPartyKeys || []), movieKey];
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

    const value = useMemo(() => ({
        user, authInitialized, claimsLoaded, signIn, signInWithMagicLink, completeMagicLinkSignIn, signUp, logout, sendPasswordReset, getUserIdToken, setAvatar, updateName,
        watchlist, toggleWatchlist, watchedMovies, markAsWatched, likedMovies, toggleLikeMovie, updatePlaybackProgress,
        hasFestivalAllAccess, hasCrateFestPass, hasJuryPass, unlockedFestivalBlockIds, purchasedMovieKeys, rentals, unlockedWatchPartyKeys,
        unlockFestivalBlock, grantFestivalAllAccess, grantCrateFestPass, grantJuryPass, purchaseMovie, unlockWatchParty, subscribe
    }), [
        user, authInitialized, claimsLoaded, signIn, signInWithMagicLink, completeMagicLinkSignIn, signUp, logout, sendPasswordReset, getUserIdToken, setAvatar, updateName,
        watchlist, toggleWatchlist, watchedMovies, markAsWatched, likedMovies, toggleLikeMovie, updatePlaybackProgress,
        hasFestivalAllAccess, hasCrateFestPass, hasJuryPass, unlockedFestivalBlockIds, purchasedMovieKeys, rentals, unlockedWatchPartyKeys,
        unlockFestivalBlock, grantFestivalAllAccess, grantCrateFestPass, grantJuryPass, purchaseMovie, unlockWatchParty, subscribe
    ]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};