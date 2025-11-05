import React, { useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

/**
 * This component now serves as a "smart" redirect to the unified Creator Dashboard.
 * It waits for the user's auth claims to be fully loaded before redirecting,
 * preventing a race condition that could cause an infinite loading state.
 */
const ActorPortalPage: React.FC = () => {
    const { claimsLoaded } = useAuth();

    useEffect(() => {
        // Only redirect once we know the user's roles (claims) are loaded.
        if (claimsLoaded) {
            window.history.replaceState({}, '', '/portal');
            window.dispatchEvent(new Event('pushstate'));
        }
    }, [claimsLoaded]);

    // Show a loading spinner while claims are being verified.
    return <LoadingSpinner />;
};

export default ActorPortalPage;