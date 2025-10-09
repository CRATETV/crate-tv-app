import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
    user: User | null;
    login: (email: string) => void;
    logout: () => void;
    subscribe: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // On initial load, check for a user in localStorage
        try {
            const storedUser = localStorage.getItem('crateTvUser');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error("Failed to parse user from localStorage", error);
            localStorage.removeItem('crateTvUser');
        }
    }, []);

    const login = (email: string) => {
        // In a real app, this would involve a password and API call.
        // For now, we'll check if a user with this email exists, or create a new one.
        const storedUser = localStorage.getItem('crateTvUser');
        let currentUser: User;
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            // If it's a different user logging in, create a new profile.
            if (currentUser.email !== email) {
                currentUser = { email, isPremiumSubscriber: false };
            }
        } else {
            currentUser = { email, isPremiumSubscriber: false };
        }
        
        localStorage.setItem('crateTvUser', JSON.stringify(currentUser));
        setUser(currentUser);
    };

    const logout = () => {
        localStorage.removeItem('crateTvUser');
        setUser(null);
        // Navigate to home page after logout
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };

    const subscribe = () => {
        if (user) {
            const updatedUser = { ...user, isPremiumSubscriber: true };
            localStorage.setItem('crateTvUser', JSON.stringify(updatedUser));
            setUser(updatedUser);
        }
    };
    
    const value = { user, login, logout, subscribe };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};