import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SiteSettings, RedCarpetClip } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface RedCarpetPageProps {
    settings: SiteSettings;
    onEnterWatchParty: () => void;
}

const RedCarpetPage: React.FC<RedCarpetPageProps> = ({ settings, onEnterWatchParty }) => {
    const { user } = useAuth();
    const [now, setNow] = useState(new Date());
    const [currentClipIndex, setCurrentClipIndex] = useState(-1); // -1 = welcome video
    const [clipEnded, setClipEnded] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const carpetStart = settings.pwffRedCarpetStartTime ? new Date(settings.pwffRedCarpetStartTime) : null;
    const carpetEnd = settings.pwffRedCarpetEndTime ? new Date(settings.pwffRedCarpetEndTime) : null;
    const clips: RedCarpetClip[] = (settings.pwffRedCarpetClips || []).sort((a, b) => (a.order || 0) - (b.order || 0));

    // Live clock
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Countdown to end
    const secondsLeft = carpetEnd ? Math.max(0, Math.floor((carpetEnd.getTime() - now.getTime()) / 1000)) : 0;
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;

    // Auto-enter watch party when carpet ends
    useEffect(() => {
        if (carpetEnd && now >= carpetEnd) {
            onEnterWatchParty();
        }
    }, [now, carpetEnd]);

    // Current video URL
    const currentVideoUrl = useMemo(() => {
        if (currentClipIndex === -1) return settings.pwffRedCarpetWelcomeVideo || '';
        return clips[currentClipIndex]?.videoUrl || '';
    }, [currentClipIndex, clips, settings]);

    const currentClipLabel = useMemo(() => {
        if (currentClipIndex === -1) return {
            name: settings.pwffRedCarpetHost || 'Your Host',
            film: 'Welcome to the Festival',
            isWelcome: true,
        };
        const clip = clips[currentClipIndex];
        return {
            name: clip?.filmmakerName || '',
            film: clip?.filmTitle || '',
            isWelcome: false,
        };
    }, [currentClipIndex, clips, settings]);

    const playNext = () => {
        const next = currentClipIndex + 1;
        if (next < clips.length) {
            setCurrentClipIndex(next);
            setClipEnded(false);
        } else {
            setClipEnded(true);
        }
    };

    const hasContent = settings.pwffRedCarpetWelcomeVideo || clips.length > 0;

    return (
        <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden relative">

            {/* Animated film grain texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}>
            </div>

            {/* Red top accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 z-20"></div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-red-500 mb-0.5">Crate TV</p>
                    <p className="text-white font-black text-sm uppercase tracking-widest">
                        {settings.pwffFestivalName || 'Playhouse West Film Festival'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Live Red Carpet</span>
                </div>
            </div>

            {/* Main layout */}
            <div className="flex-1 flex flex-col md:flex-row relative z-10">

                {/* Left — Video player */}
                <div className="flex-1 flex flex-col">

                    {/* Countdown bar */}
                    <div className="bg-[#0a0a0a] border-b border-white/5 px-6 md:px-12 py-3 flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Opening Night Begins In</p>
                        <div className="flex items-center gap-2">
                            <div className="bg-red-600/10 border border-red-600/20 px-4 py-1.5 rounded-lg">
                                <span className="text-red-400 font-black text-xl tabular-nums">
                                    {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Video area */}
                    <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 py-8">

                        {hasContent && currentVideoUrl ? (
                            <div className="w-full max-w-3xl space-y-4">
                                {/* Filmmaker ID card */}
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center">
                                        <span className="text-red-400 font-black text-lg">
                                            {currentClipLabel.name.charAt(0)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-white font-black text-base">{currentClipLabel.name}</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
                                            {currentClipLabel.isWelcome ? 'Festival Host' : `Director · ${currentClipLabel.film}`}
                                        </p>
                                    </div>
                                    {!currentClipLabel.isWelcome && (
                                        <div className="ml-auto bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                                {currentClipIndex + 1} of {clips.length}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Video player */}
                                <div className="relative aspect-video bg-[#0a0a0a] rounded-2xl overflow-hidden border border-white/5">
                                    <video
                                        ref={videoRef}
                                        src={currentVideoUrl}
                                        className="w-full h-full object-contain"
                                        autoPlay
                                        playsInline
                                        controls={false}
                                        onPlay={() => setIsPlaying(true)}
                                        onPause={() => setIsPlaying(false)}
                                        onEnded={playNext}
                                    />
                                    {/* Play/pause overlay */}
                                    <button
                                        onClick={() => {
                                            if (videoRef.current?.paused) videoRef.current.play();
                                            else videoRef.current?.pause();
                                        }}
                                        className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center">
                                            {isPlaying
                                                ? <div className="flex gap-1.5"><div className="w-3 h-8 bg-white rounded-sm"></div><div className="w-3 h-8 bg-white rounded-sm"></div></div>
                                                : <div className="w-0 h-0 border-t-[14px] border-t-transparent border-b-[14px] border-b-transparent border-l-[24px] border-l-white ml-2"></div>
                                            }
                                        </div>
                                    </button>
                                </div>

                                {/* Clip navigation */}
                                {clipEnded && clips.length > 0 && (
                                    <div className="text-center py-4">
                                        <p className="text-gray-500 text-sm mb-4">All filmmaker clips have played.</p>
                                    </div>
                                )}

                                {/* Clip playlist */}
                                {(settings.pwffRedCarpetWelcomeVideo || clips.length > 0) && (
                                    <div className="flex gap-2 flex-wrap mt-4">
                                        {settings.pwffRedCarpetWelcomeVideo && (
                                            <button
                                                onClick={() => { setCurrentClipIndex(-1); setClipEnded(false); }}
                                                className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-all ${currentClipIndex === -1 ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500 hover:text-white border border-white/5'}`}
                                            >
                                                Welcome
                                            </button>
                                        )}
                                        {clips.map((clip, i) => (
                                            <button
                                                key={clip.id}
                                                onClick={() => { setCurrentClipIndex(i); setClipEnded(false); }}
                                                className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-all ${currentClipIndex === i ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500 hover:text-white border border-white/5'}`}
                                            >
                                                {clip.filmmakerName}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // No video content — atmosphere screen
                            <div className="text-center max-w-lg space-y-8">
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-red-500">Tonight's Opening Film</p>
                                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-none text-white">
                                        {settings.pwffRedCarpetFilmTitle || 'Opening Night'}
                                    </h1>
                                    {settings.pwffRedCarpetFilmDirector && (
                                        <p className="text-gray-500 font-bold tracking-widest text-sm uppercase">
                                            Directed by {settings.pwffRedCarpetFilmDirector}
                                        </p>
                                    )}
                                </div>

                                <div className="w-16 h-0.5 bg-red-600 mx-auto"></div>

                                <p className="text-gray-600 text-sm leading-relaxed">
                                    The film begins in <span className="text-white font-bold">{mins} minutes</span>. 
                                    Settle in — you're about to watch something made with intention.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right — Info + Chat strip */}
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/5 flex flex-col bg-[#050505]">

                    {/* Tonight's programme */}
                    <div className="p-6 border-b border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 mb-4">Opening Night</p>
                        <div className="space-y-3">
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-red-400">Now on the carpet</p>
                                </div>
                                <p className="text-white font-black text-sm">
                                    {settings.pwffRedCarpetFilmTitle || 'Opening Night Film'}
                                </p>
                                {settings.pwffRedCarpetFilmDirector && (
                                    <p className="text-[10px] text-gray-600 mt-1">dir. {settings.pwffRedCarpetFilmDirector}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Attending filmmakers */}
                    {clips.length > 0 && (
                        <div className="p-6 border-b border-white/5">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 mb-4">Filmmakers Tonight</p>
                            <div className="space-y-2">
                                {clips.map(clip => (
                                    <div key={clip.id} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-black text-gray-400">{clip.filmmakerName.charAt(0)}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-white text-xs font-bold truncate">{clip.filmmakerName}</p>
                                            <p className="text-[9px] text-gray-600 truncate">{clip.filmTitle}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Chat reminder */}
                    <div className="p-6 flex-1 flex flex-col justify-end">
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center space-y-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">Watch Party Chat</p>
                            <p className="text-gray-700 text-xs leading-relaxed">Chat opens when the film begins. Say hello to tonight's audience.</p>
                        </div>

                        <button
                            onClick={onEnterWatchParty}
                            className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                        >
                            Enter Watch Party Early →
                        </button>
                        <p className="text-[9px] text-gray-700 text-center mt-2">Film starts automatically at showtime</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RedCarpetPage;
