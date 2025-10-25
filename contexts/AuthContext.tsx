import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, AuthError } from 'firebase/auth';
import { User } from '../types';
import { 
    initializeFirebaseAuth, 
    getAuthInstance,
    getUserProfile,
    createUserProfile,
    updateUserProfile
} from '../services/firebaseClient';

interface AuthContextType {
    user: User | null;
    authInitialized: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    logout: () => void;
    setAvatar: (avatarId: string) => void;
    // FIX: Add 'subscribe' to the context type for handling premium subscriptions.
    subscribe: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [authInitialized, setAuthInitialized] = useState(false);

    useEffect(() => {
        initializeFirebaseAuth().then(auth => {
            if (auth) {
                const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                    if (firebaseUser) {
                        // User is signed in, fetch their profile from Firestore.
                        let userProfile = await getUserProfile(firebaseUser.uid);
                        if (!userProfile) {
                            // This might happen if profile creation failed after sign-up.
                            // We can create it here as a fallback.
                            if (firebaseUser.email) {
                                userProfile = await createUserProfile(firebaseUser.uid, firebaseUser.email);
                            }
                        }
                        setUser(userProfile);
                    } else {
                        // User is signed out.
                        setUser(null);
                    }
                    setAuthInitialized(true);
                });
                return () => unsubscribe();
            } else {
                // Firebase failed to initialize
                setAuthInitialized(true);
            }
        });
    }, []);

    const handleAuthError = (error: any): string => {
        const authError = error as AuthError;
        switch (authError.code) {
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Incorrect email or password.';
            case 'auth/user-not-found':
                 return 'No account found with this email. Please sign up.';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists. Please sign in.';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters.';
            default:
                return authError.message || 'An unknown error occurred.';
        }
    };

    const signIn = async (email: string, password: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Authentication service is not available.");
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            throw new Error(handleAuthError(error));
        }
    };

    const signUp = async (email: string, password: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Authentication service is not available.");
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // After user is created in Auth, create their profile in Firestore.
            await createUserProfile(userCredential.user.uid, email);
        } catch (error) {
            throw new Error(handleAuthError(error));
        }
    };


    const logout = () => {
        const auth = getAuthInstance();
        if (auth) {
          signOut(auth);
        }
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };

    const setAvatar = async (avatarId: string) => {
        if (user) {
            // Optimistically update the UI
            const updatedUser = { ...user, avatar: avatarId };
            setUser(updatedUser);

            // Persist the change to Firestore
            try {
                await updateUserProfile(user.uid, { avatar: avatarId });
            } catch (error) {
                console.error("Failed to save avatar to Firestore:", error);
                // Optionally, revert the UI change if the save fails
                setUser(user); 
            }
        }
    };
    
    // FIX: Implement the 'subscribe' function to update user's premium status.
    const subscribe = async () => {
        if (user) {
            // Optimistically update the UI
            const updatedUser = { ...user, isPremiumSubscriber: true };
            setUser(updatedUser);

            // Persist the change to Firestore
            try {
                await updateUserProfile(user.uid, { isPremiumSubscriber: true });
                // Also track this for analytics purposes
                await fetch('/api/track-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: user.email }),
                });
            } catch (error) {
                console.error("Failed to save subscription to Firestore:", error);
                // Optionally, revert the UI change if the save fails
                setUser(user); 
            }
        }
    };
    
    // FIX: Add 'subscribe' to the context value provided to children components.
    const value = { user, authInitialized, signIn, signUp, logout, setAvatar, subscribe };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};