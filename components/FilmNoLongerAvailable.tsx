import React from 'react';

// Shown instead of the player once a film's "Hide automatically after" time
// has passed (api/_lib/filmAvailability.ts). The server also refuses the
// video link, so this is just the friendly message.
const FilmNoLongerAvailable: React.FC<{ title?: string; poster?: string }> = ({ title, poster }) => {
    const goHome = () => { window.history.pushState({}, '', '/'); window.dispatchEvent(new Event('pushstate')); };
    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center p-8 z-[50]">
            {poster && (
                <div className="absolute inset-0">
                    <img src={poster} alt="" className="w-full h-full object-cover opacity-[0.08] blur-3xl scale-110" />
                    <div className="absolute inset-0 bg-black/85" />
                </div>
            )}
            <div className="relative z-10 text-center space-y-5 max-w-md">
                <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px]">No longer available</p>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">{title || 'This film'} has left CRATE</h2>
                <p className="text-gray-400 text-sm leading-relaxed">It was available for a limited time. Thanks for watching independent film.</p>
                <button onClick={goHome} className="bg-white text-black font-black px-8 py-3 rounded-xl uppercase text-xs tracking-widest">Explore CRATE</button>
            </div>
        </div>
    );
};

export default FilmNoLongerAvailable;
