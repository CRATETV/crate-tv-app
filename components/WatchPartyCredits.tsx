import React, { useState, useEffect } from 'react';
import { Movie, WatchPartyState } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import { avatars } from './avatars';

interface WatchPartyCreditsProps {
    movie: Movie;
    partyState?: WatchPartyState;
    viewerCount: number;
    onClose: () => void;
    onRewatch: () => void;
    user: { name?: string; email: string | null; avatar?: string } | null;
    isLiked: boolean;
    onToggleLike: () => void;
    hasFestivalAllAccess?: boolean;
    onUpgradeToFullPass?: () => void;
}

const WatchPartyCredits: React.FC<WatchPartyCreditsProps> = ({ 
    movie, 
    partyState, 
    viewerCount, 
    onClose, 
    onRewatch,
    user,
    isLiked,
    onToggleLike,
    hasFestivalAllAccess,
    onUpgradeToFullPass,
}) => {
    const [applauseCount, setApplauseCount] = useState(0);
    const [hasApplauded, setHasApplauded] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);
    const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; left: number }[]>([]);
    const [directorThankYou, setDirectorThankYou] = useState<string | null>(null);

    // Listen for applause count
    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const unsub = db.collection('watch_parties').doc(movie.key).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                setApplauseCount(data?.applauseCount || 0);
                if (data?.directorThankYou) {
                    setDirectorThankYou(data.directorThankYou);
                }
            }
        });

        return () => unsub();
    }, [movie.key]);

    // Listen for live applause reactions
    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const unsub = db.collection('watch_parties').doc(movie.key).collection('live_reactions')
            .where('timestamp', '>=', new Date(Date.now() - 30000))
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added' && change.doc.data().emoji === '👏') {
                        const id = Date.now() + Math.random();
                        const left = Math.floor(Math.random() * 80) + 10;
                        setFloatingEmojis(prev => [...prev, { id, emoji: '👏', left }]);
                        setTimeout(() => {
                            setFloatingEmojis(prev => prev.filter(e => e.id !== id));
                        }, 3000);
                    }
                });
            });

        return () => unsub();
    }, [movie.key]);

    const handleApplause = async () => {
        if (hasApplauded) return;
        
        setHasApplauded(true);
        
        const db = getDbInstance();
        if (!db) return;

        // Increment applause count
        await db.collection('watch_parties').doc(movie.key).update({
            applauseCount: firebase.firestore.FieldValue.increment(1)
        });

        // Add live reaction
        await db.collection('watch_parties').doc(movie.key).collection('live_reactions').add({
            emoji: '👏',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Show thank you after a moment
        setTimeout(() => setShowThankYou(true), 500);
    };

    return (
        <div className="fixed inset-0 bg-black z-50 overflow-hidden">
            {/* Background poster blur */}
            <div className="absolute inset-0">
                <img 
                    src={movie.poster} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover opacity-5 blur-3xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-black/80" />
            </div>

            {/* Floating applause */}
            {floatingEmojis.map(e => (
                <div 
                    key={e.id}
                    className="absolute bottom-0 text-5xl animate-[floatUp_3s_ease-out_forwards] pointer-events-none"
                    style={{ left: `${e.left}%` }}
                >
                    {e.emoji}
                </div>
            ))}

            {/* Main content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 text-center">
                
                {/* Film grain overlay for cinematic feel */}
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />

                <div className="max-w-2xl mx-auto space-y-12 animate-[fadeIn_1s_ease-out]">
                    
                    {/* "End" title card */}
                    <div className="space-y-4">
                        <p className="text-red-500 font-black uppercase tracking-[0.5em] text-xs animate-pulse">Transmission Complete</p>
                        <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none">{movie.title}</h1>
                        <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-xs">Directed by {movie.director}</p>
                    </div>

                    {/* Viewer stats */}
                    <div className="flex items-center justify-center gap-8">
                        <div className="text-center">
                            <div className="text-3xl font-black text-white">{viewerCount}</div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-600">Watched Together</div>
                        </div>
                        <div className="w-px h-12 bg-white/10" />
                        <div className="text-center">
                            <div className="text-3xl font-black text-red-500">{applauseCount}</div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-600">Standing Ovation</div>
                        </div>
                    </div>

                    {/* Director thank you message */}
                    {directorThankYou && (
                        <div className="bg-gradient-to-r from-white/5 via-white/5 to-transparent border-l-2 border-white/20 p-6 rounded-r-xl text-left animate-[fadeIn_0.5s_ease-out]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">From the Director</p>
                            <p className="text-gray-300 italic text-lg">"{directorThankYou}"</p>
                            <p className="text-gray-600 text-xs mt-3">— {movie.director}</p>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        {/* Applause button */}
                        <button 
                            onClick={handleApplause}
                            disabled={hasApplauded}
                            className={`group relative px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${
                                hasApplauded 
                                    ? 'bg-red-600 text-white shadow-[0_0_40px_rgba(239,68,68,0.4)]' 
                                    : 'bg-white/10 text-white hover:bg-red-600 hover:shadow-[0_0_40px_rgba(239,68,68,0.4)] border border-white/10'
                            }`}
                        >
                            <span className="flex items-center gap-3">
                                <span className={`text-2xl ${hasApplauded ? 'animate-bounce' : 'group-hover:animate-bounce'}`}>👏</span>
                                {hasApplauded ? 'Applauded!' : 'Give Applause'}
                            </span>
                        </button>

                        {/* Like button */}
                        <button 
                            onClick={onToggleLike}
                            className={`group px-8 py-6 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${
                                isLiked 
                                    ? 'bg-pink-600 text-white shadow-[0_0_30px_rgba(236,72,153,0.3)]' 
                                    : 'bg-white/5 text-white hover:bg-pink-600/20 border border-white/10'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <svg className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                {isLiked ? 'Liked' : 'Like Film'}
                            </span>
                        </button>
                    </div>

                    {/* Thank you message after applause */}
                    {showThankYou && (
                        <div className="animate-[fadeIn_0.5s_ease-out] bg-gradient-to-r from-red-900/20 via-transparent to-red-900/20 p-4 rounded-xl">
                            <p className="text-red-400 text-sm">Thank you for supporting independent film! 🎬</p>
                        </div>
                    )}

                    {/* Upgrade to Full Pass — shown to block ticket holders only */}
                    {!hasFestivalAllAccess && onUpgradeToFullPass && (
                        <div className="animate-[fadeIn_0.8s_ease-out] bg-gradient-to-br from-red-900/20 via-black to-purple-900/20 border border-red-500/20 rounded-2xl p-8 text-center space-y-4">
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-red-400">Festival All-Access</p>
                            <h3 className="text-xl font-black uppercase text-white">Want to see more?</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Upgrade to the All-Access Pass and watch every screening block from the festival — live and on-demand for two weeks.
                            </p>
                            <button
                                onClick={onUpgradeToFullPass}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-2xl"
                            >
                                Upgrade to All-Access — $50
                            </button>
                            <p className="text-gray-700 text-[10px]">Covers all festival blocks · 14 days access · Web + Roku</p>
                        </div>
                    )}

                    {/* Secondary actions */}
                    <div className="flex items-center justify-center gap-8 pt-8 border-t border-white/5">
                        <button 
                            onClick={onRewatch}
                            className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 hover:text-white transition-colors"
                        >
                            Re-Watch
                        </button>
                        <div className="w-px h-4 bg-white/10" />
                        <button 
                            onClick={onClose}
                            className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 hover:text-white transition-colors"
                        >
                            Return Home
                        </button>
                    </div>
                </div>
            </div>

            {/* CSS for float animation */}
            <style>{`
                @keyframes floatUp {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    100% { transform: translateY(-100vh) scale(1.5); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default WatchPartyCredits;
