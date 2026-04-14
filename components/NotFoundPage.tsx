import React from 'react';

const NotFoundPage: React.FC = () => {
    const navigate = (path: string) => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-6 text-center">
            <div className="space-y-6 max-w-md">
                <p className="text-[120px] font-black text-white/5 leading-none select-none">404</p>
                <div className="space-y-2 -mt-6">
                    <h1 className="text-2xl font-black uppercase tracking-tight text-white">Page Not Found</h1>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        This reel seems to have gone missing from the archive. Let's get you back to the library.
                    </p>
                </div>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => navigate('/')}
                        className="bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-full transition-all"
                    >
                        Back to Home
                    </button>
                    <button
                        onClick={() => navigate('/library')}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-full transition-all"
                    >
                        Browse Library
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
