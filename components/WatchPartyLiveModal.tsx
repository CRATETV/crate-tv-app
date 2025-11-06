import React from 'react';
import { Movie } from '../types';

interface WatchPartyLiveModalProps {
    movie: Movie;
    onJoin: () => void;
}

const WatchPartyLiveModal: React.FC<WatchPartyLiveModalProps> = ({ movie, onJoin }) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div 
                className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border-2 border-red-500"
                style={{
                    backgroundImage: `url(${movie.poster})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="absolute inset-0 bg-black/70 backdrop-blur-md"></div>
                <div className="relative z-10 p-8 sm:p-12 text-center text-white animate-[fadeIn_0.5s_ease-out]">
                    <div className="flex justify-center mb-4">
                        <div className="bg-red-600 text-white font-bold text-lg px-6 py-2 rounded-full animate-pulse">
                            LIVE NOW
                        </div>
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-extrabold mb-3" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>
                        The Watch Party is Starting!
                    </h1>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-200 mb-8">
                        "{movie.title}"
                    </p>
                    <button 
                        onClick={onJoin}
                        className="w-full sm:w-auto bg-red-600 hover:bg-red-700 font-bold text-xl py-4 px-12 rounded-lg transition-transform hover:scale-105 shadow-lg"
                    >
                        Join the Party
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WatchPartyLiveModal;
