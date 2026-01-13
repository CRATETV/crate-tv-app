
import React, { useEffect } from 'react';

/**
 * LEGACY_NODE_REDIRECT: PublicAccess sector has been rebranded to PublicSquare.
 * This component handles the transition to ensure build integrity and routing safety.
 */
const PublicAccessPage: React.FC = () => {
    useEffect(() => {
        window.history.replaceState({}, '', '/public-square');
        window.dispatchEvent(new Event('pushstate'));
    }, []);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Routing to The Square...</p>
            </div>
        </div>
    );
};

export default PublicAccessPage;
