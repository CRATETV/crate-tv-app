
import React, { useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * This component now serves as a redirect to the unified Creator Dashboard.
 * Any user landing on the old '/actor-portal' URL will be seamlessly
 * moved to '/portal' to ensure a consistent experience.
 */
const ActorPortalPage: React.FC = () => {
    useEffect(() => {
        window.history.replaceState({}, '', '/portal');
        window.dispatchEvent(new Event('pushstate'));
    }, []);

    return <LoadingSpinner />;
};

export default ActorPortalPage;
