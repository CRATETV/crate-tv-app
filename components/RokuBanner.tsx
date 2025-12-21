
import React from 'react';

const RokuBanner: React.FC = () => {
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        window.history.pushState({}, '', '/roku-guide');
        window.dispatchEvent(new Event('pushstate'));
    };
    
    return (
        <div className="bg-purple-900/30 border border-purple-800 rounded-lg p-4 my-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/ruko+logo+.webp" alt="Roku Logo" className="w-12 h-auto" />
                    <div>
                        <h3 className="font-bold text-white">Now available on Roku!</h3>
                        <p className="text-sm text-purple-300">Install our channel for the big screen experience.</p>
                    </div>
                </div>
                <a 
                    href="/roku-guide"
                    onClick={handleNavigate}
                    className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-5 rounded-md transition-colors text-sm"
                >
                    Get Setup Guide
                </a>
            </div>
        </div>
    );
};

export default RokuBanner;
