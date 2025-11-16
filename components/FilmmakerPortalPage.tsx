import React, { useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

/**
 * This component now serves as a "smart" redirect to the unified Creator Dashboard.
 * It waits for the user's auth claims to be fully loaded before redirecting,
 * preventing a race condition that could cause an infinite loading state.
 */
const FilmmakerPortalPage: React.FC = () => {
    const { claimsLoaded, user } = useAuth();

    useEffect(() => {
        // Only redirect once we know the user's roles (claims) are loaded.
        // FIX: Add a more robust guard. The child components (Filmmaker/Actor views)
        // require the user's name to be present. Waiting for `user.name`
        // to be present prevents a race condition and the resulting infinite loading screen.
        if (claimsLoaded && user?.name) {
            window.history.replaceState({}, '', '/portal');
            window.dispatchEvent(new Event('pushstate'));
        }
    }, [claimsLoaded, user]);

    // Show a loading spinner while claims are being verified.
    return <LoadingSpinner />;
};

export default FilmmakerPortalPage;