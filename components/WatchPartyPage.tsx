
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, WatchPartyState, ChatMessage, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import LoadingSpinner from './LoadingSpinner';
import { avatars } from './avatars';
import SquarePaymentModal from './SquarePaymentModal';

const PollOverlay = ({ poll, onVote, userId }: { poll: any; onVote: (index: number) => void; userId: string }) => {
    const totalVotes = Object.values(poll.votes as Record<number, number>).reduce((a, b) => a + b, 0);
    const hasVoted = poll.voters.includes(userId);

    return (
        <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-gray-900 border-2 border-pink-500 rounded-[2rem] p-8 max-w-md w-full shadow-2xl space-y-6">
                <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-500">Active Transmission Poll</span>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{poll.question}</h3>
                </div>

                <div className="space-y-3">
                    {poll.options.map((option: string, index: number) => {
                        const votes = (poll.votes[index] || 0);
                        const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                        
                        return (
                            <button 
                                key={index}
                                onClick={() => !hasVoted && onVote(index)}
                                disabled={hasVoted}
                                className={`w-full relative overflow-hidden rounded-xl p-4 text-left transition-all ${hasVoted ? 'cursor-default' : 'hover:bg-white/5 active:scale-95'}`}
                            >
                                <div 
                                    className="absolute inset-0 bg-pink-500/20 transition-all duration-1000" 
                                    style={{ width: `${percentage}%` }}
                                />
                                <div className="relative flex items-center justify-between">
                                    <span className="font-bold uppercase tracking-tight">{option}</span>
                                    {hasVoted && <span className="font-mono text-pink-400">{percentage}%</span>}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{totalVotes} Transmissions Received</span>
                    {hasVoted && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Vote Recorded</span>}
                </div>
            </div>
        </div>
    );
};

interface WatchPartyPageProps {
  movieKey: string;
}

const REACTION_TYPES = [
    { key: 'crate_fire', emoji: '🔥' },
    { key: 'crate_wow', emoji: '😲' },
    { key: 'crate_heart', emoji: '❤️' },
    { key: 'crate_clap', emoji: '👏' },
    { key: 'crate_sad', emoji: '😢' }
] as const;

/**
 * LIVE RELAY ENGINE V4.5
 * Automatically converts browser URLs from major platforms into secure full-screen iframes.
 * Support Added: Restream.io Player
 */
const processLiveEmbed = (input: string, startTimeOffset: number = 0): string => {
    const trimmed = input.trim();
    const startSec = Math.max(0, Math.floor(startTimeOffset));
    
    // 1. RAW IFRAME PASSTHROUGH
    if (trimmed.startsWith('<iframe')) return trimmed;

    // 2. YOUTUBE RECOGNITION
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = trimmed.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
        return `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1&controls=1&showinfo=0${startSec > 0 ? `&start=${startSec}` : ''}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    }

    // 3. VIMEO RECOGNITION
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
    const vimeoMatch = trimmed.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
        return `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&color=ef4444&title=0&byline=0&portrait=0${startSec > 0 ? `#t=${startSec}s` : ''}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    }

    // 4. RESTREAM.IO RECOGNITION
    if (trimmed.includes('restream.io/player/')) {
        const restreamId = trimmed.split('/player/')[1]?.split('?')[0];
        if (restreamId) {
            return `<iframe src="https://restream.io/player/${restreamId}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
        }
    }

    // 5. GENERIC URL WRAPPER (FALLBACK)
    if (trimmed.startsWith('http')) {
        return `<iframe src="${trimmed}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    }

    return `<div class="flex items-center justify-center h-full text-gray-500 font-mono text-xs uppercase p-10 text-center">Invalid Relay Node: ${trimmed}</div>`;
};

const FloatingReaction = React.memo<{ emojiKey: string; onComplete: () => void }>(({ emojiKey, onComplete }) => {
    const randomLeft = useMemo(() => Math.floor(Math.random() * 80) + 10, []); 
    const randomDuration = useMemo(() => 3.5 + Math.random() * 1.5, []); 
    useEffect(() => {
        const timer = setTimeout(onComplete, randomDuration * 1000);
        return () => clearTimeout(timer);
    }, [randomDuration, onComplete]);

    const reaction = REACTION_TYPES.find(r => r.key === emojiKey);

    return (
        <div 
            className="absolute bottom-24 pointer-events-none z-[120] animate-emoji-float flex items-center justify-center" 
            style={{ left: `${randomLeft}%`, animationDuration: `${randomDuration}s` }}
        >
            <div 
                className="crate-emoji"
                dangerouslySetInnerHTML={{ __html: avatars[emojiKey] || '' }}
            />
        </div>
    );
});

const EmbeddedChat = React.memo<{ 
    partyKey: string; 
    directors: string[]; 
    isQALive?: boolean; 
    qaEmbed?: string;
    user: any; 
    isMobileController?: boolean; 
    isBackstageVerified?: boolean; 
    onBackstageVerify?: (key: string) => void;
    backstageKey?: string;
}>(({ partyKey, directors, isQALive, qaEmbed, user, isMobileController, isBackstageVerified, onBackstageVerify, backstageKey }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isTogglingQA, setIsTogglingQA] = useState(false);
    const [isPushingPoll, setIsPushingPoll] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const messagesRef = db.collection('watch_parties').doc(partyKey).collection('messages').orderBy('timestamp', 'asc').limitToLast(100);
        const unsubscribe = messagesRef.onSnapshot(snapshot => {
            const fetchedMessages: ChatMessage[] = [];
            snapshot.forEach(doc => { fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage); });
            setMessages(fetchedMessages);
        });
        return () => unsubscribe();
    }, [partyKey]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;
        setIsSending(true);
        try {
            await fetch('/api/send-chat-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    movieKey: partyKey, 
                    userName: user.name || user.email, 
                    userAvatar: user.avatar || 'fox', 
                    text: newMessage,
                    isVerifiedDirector: isBackstageVerified
                }),
            });
            setNewMessage('');
        } catch (error) { console.error("Chat error:", error); } finally { setIsSending(false); }
    };

    const toggleQA = async () => {
        if (!backstageKey) return;
        setIsTogglingQA(true);
        try {
            const newQAState = !isQALive;
            let embedUrl = qaEmbed || '';
            
            if (newQAState && !embedUrl) {
                const input = window.prompt("Enter Director's Video Stream URL (YouTube, Vimeo, Restream):");
                if (!input) {
                    setIsTogglingQA(false);
                    return;
                }
                embedUrl = input;
            }

            const res = await fetch('/api/toggle-qa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    movieKey: partyKey, 
                    backstageKey, 
                    isQALive: newQAState,
                    qaEmbed: embedUrl
                }),
            });
            if (!res.ok) throw new Error("Failed to toggle Q&A.");
        } catch (error) {
            console.error("QA Toggle Error:", error);
            alert("Failed to toggle Q&A mode.");
        } finally {
            setIsTogglingQA(false);
        }
    };

    const handlePushPoll = async () => {
        if (!backstageKey) return;
        const question = window.prompt("Enter Poll Question:");
        if (!question) return;
        const optionsInput = window.prompt("Enter Options (comma separated):", "Yes, No");
        if (!optionsInput) return;
        const options = optionsInput.split(',').map(o => o.trim()).filter(Boolean);
        if (options.length < 2) {
            alert("Minimum 2 options required.");
            return;
        }

        setIsPushingPoll(true);
        try {
            const res = await fetch('/api/create-poll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    movieKey: partyKey, 
                    backstageKey, 
                    question, 
                    options 
                }),
            });
            if (!res.ok) throw new Error("Failed to push poll.");
        } catch (error) {
            console.error("Push Poll Error:", error);
            alert("Failed to push poll.");
        } finally {
            setIsPushingPoll(false);
        }
    };

    const downloadChat = () => {
        if (messages.length === 0) return;
        
        const csvContent = [
            ['Timestamp', 'User', 'Message'],
            ...messages.map(msg => [
                msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleString() : 'N/A',
                msg.userName,
                msg.text
            ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `chat_history_${partyKey}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        link.remove();
    };

    const handleClearChat = async () => {
        if (!confirm("Are you sure you want to clear ALL messages for this watch party? This cannot be undone.")) return;
        const adminPassword = sessionStorage.getItem('adminPassword');
        if (!adminPassword) {
            const key = prompt("Please enter the Backstage Key or Admin Password to clear chat:");
            if (!key) return;
            // We'll try to use the key as the password
            try {
                const res = await fetch('/api/clear-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ movieKey: partyKey, adminPassword: key }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Failed to clear chat.');
                }
            } catch (error) {
                console.error("Failed to clear chat:", error);
                alert(`Error: ${(error as Error).message}`);
            }
            return;
        }

        try {
            const res = await fetch('/api/clear-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey: partyKey, adminPassword }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to clear chat.');
            }
        } catch (error) {
            console.error("Failed to clear chat:", error);
            alert(`Error: ${(error as Error).message}`);
        }
    };

    return (
        <div 
            className={`w-full h-full flex flex-col ${isMobileController ? 'bg-black' : 'bg-[#0a0a0a] md:bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800'} overflow-hidden min-h-0`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-4 bg-black/40 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Chat</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                </div>
                <div className="flex items-center gap-3">
                    {isBackstageVerified && (
                        <>
                            <button 
                                onClick={handlePushPoll}
                                disabled={isPushingPoll}
                                className="text-[8px] font-black uppercase tracking-widest text-pink-500 hover:text-white transition-colors flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                Push Poll
                            </button>
                            <button 
                                onClick={toggleQA}
                                disabled={isTogglingQA}
                                className={`text-[8px] font-black uppercase tracking-widest ${isQALive ? 'text-red-500' : 'text-emerald-500'} hover:text-white transition-colors flex items-center gap-1`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                {isQALive ? 'End Video' : 'Join w/ Video'}
                            </button>
                            <button 
                                onClick={downloadChat}
                                className="text-[8px] font-black uppercase tracking-widest text-emerald-500 hover:text-white transition-colors flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download
                            </button>
                            <button 
                                onClick={handleClearChat}
                                className="text-[8px] font-black uppercase tracking-widest text-red-500 hover:text-white transition-colors flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Clear
                            </button>
                        </>
                    )}
                </div>
            </div>
            {isMobileController && (
                <div className="p-4 bg-red-600/10 border-b border-red-500/20 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-red-500">Roku Controller Node</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                </div>
            )}
            <div className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-hide min-h-0">
                {!isBackstageVerified && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">Director Verification Required</p>
                        <button 
                            onClick={() => {
                                const key = window.prompt("Enter Backstage Key:");
                                if (key && onBackstageVerify) onBackstageVerify(key);
                            }}
                            className="text-[10px] font-black text-red-500 hover:text-white transition-colors uppercase tracking-tighter"
                        >
                            Authorize Backstage Node →
                        </button>
                    </div>
                )}
                {messages.map(msg => (
                    <div key={msg.id} className="flex items-start gap-3 animate-[fadeIn_0.2s_ease-out]">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 p-1 border border-white/5 bg-gray-800" dangerouslySetInnerHTML={{ __html: avatars[msg.userAvatar] || avatars['fox'] }} />
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className={`font-black text-[11px] uppercase tracking-tighter ${msg.isAdmin ? 'text-pink-500' : 'text-red-500'}`}>{msg.userName}</p>
                                {msg.isAdmin && (
                                    <span className="bg-pink-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Admin</span>
                                )}
                                {msg.isVerifiedDirector && (
                                    <span className="bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Director</span>
                                )}
                            </div>
                            <p className="text-sm break-words leading-snug text-gray-300">{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-3 bg-black/60 backdrop-blur-xl border-t border-white/5 flex-shrink-0">
                <div className="flex items-center gap-2 bg-gray-800/80 rounded-full px-4 py-1 border border-white/10">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={isBackstageVerified ? "Speak as Director..." : "Type a message..."} className="bg-transparent border-none text-white text-sm w-full focus:ring-0 py-2.5" disabled={!user || isSending} />
                    <button type="submit" className="text-red-500" disabled={!user || isSending || !newMessage.trim()}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
                </div>
            </form>
        </div>
    );
});

const SuggestionsSection: React.FC<{ currentMovie: Movie; allMovies: Record<string, Movie> }> = ({ currentMovie, allMovies }) => {
    const suggestions = useMemo(() => {
        return Object.values(allMovies)
            .filter(m => m.key !== currentMovie.key && !m.isUnlisted)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
    }, [currentMovie, allMovies]);

    if (suggestions.length === 0) return null;

    return (
        <div className="mt-12 space-y-6 animate-[fadeIn_1s_ease-out]">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">You Might Also Like</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {suggestions.map(m => (
                    <button 
                        key={m.key} 
                        onClick={() => window.location.href = `/movie/${m.key}`}
                        className="group relative aspect-video rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500 transition-all shadow-2xl"
                    >
                        <img src={m.poster} alt={m.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
                            <p className="text-[11px] font-black uppercase tracking-tighter text-white truncate group-hover:text-emerald-400 transition-colors">{m.title}</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">{m.director}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export const WatchPartyPage: React.FC<WatchPartyPageProps> = ({ movieKey }) => {
    const { 
        user, 
        unlockedWatchPartyKeys, 
        unlockWatchParty, 
        rentals,
        hasFestivalAllAccess,
        hasCrateFestPass,
        hasJuryPass,
        unlockedFestivalBlockIds,
        unlockFestivalBlock
    } = useAuth();
    const { movies: allMovies, isLoading: isFestivalLoading, festivalData, settings } = useFestival();
    const [partyState, setPartyState] = useState<WatchPartyState>();
    const [localReactions, setLocalReactions] = useState<{ id: string; emoji: string }[]>([]);
    const [showPaywall, setShowPaywall] = useState(false);
    const [backstageInput, setBackstageInput] = useState('');
    const [backstageError, setBackstageError] = useState(false);
    const [isBackstageVerified, setIsBackstageVerified] = useState(false);
    const [hasClaimedStub, setHasClaimedStub] = useState(false);
    const [highlights, setHighlights] = useState<any>(null);

    const [isEnded, setIsEnded] = useState(false);
    const [isControllerMode, setIsControllerMode] = useState(false);
    const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastSeekTimeRef = useRef<number>(0);

    const blockMovies = useMemo(() => {
        // Check standard festival blocks
        let block = festivalData.flatMap(d => d.blocks).find(b => b.id === movieKey);
        
        // Check Crate Fest blocks if not found
        if (!block && settings.crateFestConfig?.movieBlocks) {
            block = settings.crateFestConfig.movieBlocks.find(b => b.id === movieKey);
        }

        if (!block) return [];
        return block.movieKeys.map(key => allMovies[key]).filter(Boolean);
    }, [movieKey, allMovies, festivalData, settings.crateFestConfig]);

    const movie = useMemo(() => {
        if (allMovies[movieKey]) return allMovies[movieKey];
        
        // Check if it's a festival block
        let block = festivalData.flatMap(d => d.blocks).find(b => b.id === movieKey);
        
        // Check Crate Fest blocks if not found
        if (!block && settings.crateFestConfig?.movieBlocks) {
            block = settings.crateFestConfig.movieBlocks.find(b => b.id === movieKey);
        }

        if (block) {
            // Synthesize a movie object for the block
            const firstMovie = block.movieKeys.length > 0 ? allMovies[block.movieKeys[0]] : null;
            
            return {
                key: block.id,
                title: block.title,
                watchPartyStartTime: block.watchPartyStartTime,
                isWatchPartyEnabled: true,
                isWatchPartyPaid: true,
                watchPartyPrice: block.price || 10.00,
                director: 'Festival Event',
                fullMovie: firstMovie?.fullMovie || '',
                isLiveStream: firstMovie?.isLiveStream || false,
                liveStreamEmbed: firstMovie?.liveStreamEmbed || ''
            } as Movie;
        }
        return null;
    }, [movieKey, allMovies, festivalData, settings.crateFestConfig]);

    const currentMovie = useMemo(() => {
        if (blockMovies.length > 0) {
            return blockMovies[currentMovieIndex] || blockMovies[0];
        }
        return movie;
    }, [blockMovies, currentMovieIndex, movie]);

    const isBlock = useMemo(() => {
        const inFest = festivalData.flatMap(d => d.blocks).some(b => b.id === movieKey);
        const inCrate = settings.crateFestConfig?.movieBlocks?.some(b => b.id === movieKey);
        return inFest || !!inCrate;
    }, [movieKey, festivalData, settings.crateFestConfig]);

    useEffect(() => {
        if (partyState?.status === 'live' && user && currentMovie && !hasClaimedStub) {
            claimTicketStub();
        }
        if (partyState?.status === 'ended' && !highlights) {
            fetchHighlights();
        }
    }, [partyState?.status, user, currentMovie, hasClaimedStub, highlights]);

    const claimTicketStub = async () => {
        if (!user || !currentMovie) return;
        try {
            const res = await fetch('/api/claim-ticket-stub', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    movieKey: currentMovie.key,
                    userId: user.uid,
                    movieTitle: currentMovie.title,
                    posterUrl: currentMovie.poster
                }),
            });
            if (res.ok) setHasClaimedStub(true);
        } catch (error) {
            console.error("Failed to claim stub:", error);
        }
    };

    const fetchHighlights = async () => {
        try {
            const res = await fetch(`/api/generate-highlights?movieKey=${movieKey}`);
            if (res.ok) {
                const data = await res.json();
                setHighlights(data);
            }
        } catch (error) {
            console.error("Failed to fetch highlights:", error);
        }
    };

    const handleVote = async (optionIndex: number) => {
        if (!user || !partyState?.activePoll) return;
        try {
            await fetch('/api/vote-poll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    movieKey,
                    userId: user.uid,
                    pollId: partyState.activePoll.id,
                    optionIndex
                }),
            });
        } catch (error) {
            console.error("Vote error:", error);
        }
    };

    const handleBackstageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (partyState?.backstageKey && backstageInput.toUpperCase() === partyState.backstageKey.toUpperCase()) {
            if (isBlock) {
                unlockFestivalBlock(movieKey);
            } else {
                unlockWatchParty(movieKey);
            }
            setIsBackstageVerified(true);
            setBackstageError(false);
            setBackstageInput('');
        } else {
            setBackstageError(true);
            setTimeout(() => setBackstageError(false), 2000);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'controller') setIsControllerMode(true);
    }, []);

    const syncClock = useCallback(() => {
        const video = videoRef.current;
        if (!video || !partyState?.actualStartTime || currentMovie?.isLiveStream || isControllerMode || partyState.status !== 'live') return;

        const now = Date.now();
        // Prevent rapid seeking loops
        if (now - lastSeekTimeRef.current < 1500) return;

        try {
            const serverStart = (partyState.actualStartTime as any).toDate().getTime();
            const totalElapsed = Math.max(0, (now - serverStart) / 1000);
            
            if (blockMovies.length > 0) {
                let cumulativeTime = 0;
                let found = false;
                for (let i = 0; i < blockMovies.length; i++) {
                    const m = blockMovies[i];
                    const duration = (m.durationInMinutes || 10) * 60;
                    if (totalElapsed < cumulativeTime + duration) {
                        if (currentMovieIndex !== i) {
                            setCurrentMovieIndex(i);
                            setIsEnded(false);
                            setIsInitialSyncDone(false); // Reset sync for next movie in block
                        }
                        const movieElapsed = totalElapsed - cumulativeTime;
                        syncVideo(movieElapsed);
                        found = true;
                        break;
                    }
                    cumulativeTime += duration;
                }
                if (!found && !isEnded && cumulativeTime > 0) {
                    setIsEnded(true);
                }
            } else {
                // Use movie metadata duration first, then video element duration, then Infinity (to wait for metadata)
                const movieDuration = movie?.durationInMinutes 
                    ? movie.durationInMinutes * 60 
                    : (video.duration > 0 ? video.duration : Infinity);

                if (totalElapsed >= movieDuration && movieDuration !== Infinity) {
                    if (!isEnded) {
                        setIsEnded(true);
                        video.pause();
                        video.currentTime = movieDuration;
                    }
                } else {
                    syncVideo(totalElapsed);
                }
            }
        } catch (e) { console.error("Sync heartbeat failure:", e); }
    }, [partyState, movie, blockMovies, currentMovieIndex, isEnded, isControllerMode, currentMovie]);

    const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [bufferProgress, setBufferProgress] = useState(0);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleProgress = () => {
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                const duration = video.duration;
                if (duration > 0) {
                    setBufferProgress((bufferedEnd / duration) * 100);
                }

                // Smart Buffer Guard: If we have less than 3 seconds of buffer, consider it buffering
                const remainingBuffer = bufferedEnd - video.currentTime;
                if (remainingBuffer < 3 && !video.paused && !isEnded) {
                    setIsBuffering(true);
                } else if (remainingBuffer > 10) {
                    setIsBuffering(false);
                }
            }
        };

        const handleWaiting = () => setIsBuffering(true);
        const handlePlaying = () => setIsBuffering(false);
        const handleCanPlay = () => setIsBuffering(false);

        video.addEventListener('progress', handleProgress);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('timeupdate', handleProgress);

        return () => {
            video.removeEventListener('progress', handleProgress);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('timeupdate', handleProgress);
        };
    }, [isEnded]);

    const driftFilterRef = useRef<number>(0);
    const lastRateUpdateRef = useRef<number>(0);

    const syncVideo = (targetPosition: number) => {
        const video = videoRef.current;
        if (!video || video.seeking) return;
        
        const rawDrift = targetPosition - video.currentTime;
        
        // 1. JITTER FILTER: Smooth out the drift calculation to ignore micro-fluctuations
        // This prevents the playback rate from "flickering" due to network or CPU jitter.
        if (Math.abs(rawDrift) > 60) {
            // Reset filter on massive jumps (e.g. first load)
            driftFilterRef.current = rawDrift;
        } else {
            // Simple low-pass filter: 80% history, 20% new data
            driftFilterRef.current = (driftFilterRef.current * 0.8) + (rawDrift * 0.2);
        }

        const drift = driftFilterRef.current;
        const absDrift = Math.abs(drift);
        const now = Date.now();

        // 2. HARD SEEK: Only if drift is massive (> 45s) or initial sync
        if ((absDrift > 45 || !isInitialSyncDone)) {
            lastSeekTimeRef.current = now;
            video.currentTime = targetPosition;
            video.playbackRate = 1.0;
            driftFilterRef.current = 0; // Reset filter after seek
            if (!isInitialSyncDone) setIsInitialSyncDone(true);
            return;
        } 

        // 3. RATE LIMITER: Only adjust playback rate every 1 second to prevent audio artifacts
        if (now - lastRateUpdateRef.current < 1000) return;
        lastRateUpdateRef.current = now;

        // 4. GRADUATED SYNC: Use extremely small, imperceptible rate changes
        // Dead zone: 0.3 seconds (ignore tiny drifts)
        let targetRate = 1.0;
        if (absDrift > 0.3) {
            if (absDrift > 25) {
                targetRate = drift > 0 ? 1.025 : 0.975; // 2.5% - effective for large drifts
            } else if (absDrift > 10) {
                targetRate = drift > 0 ? 1.012 : 0.988; // 1.2% - barely audible pitch shift
            } else if (absDrift > 3) {
                targetRate = drift > 0 ? 1.006 : 0.994; // 0.6% - safe for most content
            } else {
                targetRate = drift > 0 ? 1.003 : 0.997; // 0.3% - ultra-fine adjustment
            }
        }

        // 5. BUFFER GUARD: If we are running low on buffer, prioritize stability over sync
        if (video.buffered.length > 0) {
            const remainingBuffer = video.buffered.end(video.buffered.length - 1) - video.currentTime;
            if (remainingBuffer < 4 && targetRate > 1.0) {
                targetRate = 1.0; // Stop speeding up if buffer is low
            }
            if (remainingBuffer < 1.5 && !video.paused) {
                targetRate = 0.90; // Aggressively slow down to avoid a hard stall
            }
        }

        if (video.playbackRate !== targetRate) {
            video.playbackRate = targetRate;
        }

        // Handle play/pause state from server
        if (partyState?.isPlaying && video.paused && !video.ended) {
            video.play().catch(() => {});
        } else if (!partyState?.isPlaying && !video.paused) {
            video.pause();
        }
    };

    useEffect(() => {
        if (isControllerMode || currentMovie?.isLiveStream) return;
        const interval = setInterval(syncClock, 500); // Check every 500ms for ultra-smooth tracking
        syncClock(); 
        return () => clearInterval(interval);
    }, [syncClock, isControllerMode, currentMovie]);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const partyRef = db.collection('watch_parties').doc(movieKey);
        const unsubscribe = partyRef.onSnapshot(doc => { if (doc.exists) setPartyState(doc.data() as WatchPartyState); });
        const reactionsRef = partyRef.collection('live_reactions').where('timestamp', '>=', new Date(Date.now() - 5000))
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') setLocalReactions(prev => [...prev, { id: change.doc.id, emoji: change.doc.data().emoji }]);
                });
            });
        return () => { unsubscribe(); reactionsRef(); };
    }, [movieKey]);

    const hasAccess = useMemo(() => {
        if (isControllerMode || isBackstageVerified) return true;
        if (!movie) return false;
        
        // 1. Direct Watch Party Unlock
        if (unlockedWatchPartyKeys.has(movieKey)) return true;
        
        // 2. Festival All Access
        if (hasFestivalAllAccess || hasCrateFestPass || hasJuryPass) return true;
        
        // 3. Block Unlock (If this is a block watch party)
        if (unlockedFestivalBlockIds.has(movieKey)) return true;
        
        // 4. Check if the movie itself is unlocked (rentals)
        const exp = rentals[movieKey];
        if (exp && new Date(exp) > new Date()) return true;

        // 5. Free Watch Party
        if (!movie.isWatchPartyPaid) return true;

        return false;
    }, [movie, rentals, movieKey, unlockedWatchPartyKeys, isControllerMode, isBackstageVerified, hasFestivalAllAccess, hasCrateFestPass, hasJuryPass, unlockedFestivalBlockIds]);

    const logSentiment = async (emoji: string) => {
        const db = getDbInstance();
        if (db) db.collection('watch_parties').doc(movieKey).collection('live_reactions').add({ emoji, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    };

    const handleBackstageVerify = useCallback((key: string) => {
        if (partyState?.backstageKey && key.toUpperCase() === partyState.backstageKey.toUpperCase()) {
            setIsBackstageVerified(true);
            unlockWatchParty(movieKey);
        } else {
            alert("Invalid Protocol Key.");
        }
    }, [partyState?.backstageKey, movieKey, unlockWatchParty]);

    const emptyDirectors = useMemo(() => [] as string[], []);

    if (isFestivalLoading || !movie) return <LoadingSpinner />;

    if (isControllerMode) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col z-[500]">
                <div className="p-4 bg-red-600 flex justify-between items-center">
                    <h1 className="font-black uppercase tracking-widest text-xs">Crate Remote</h1>
                    <button onClick={() => window.location.href = '/'} className="text-[10px] font-bold">EXIT</button>
                </div>
                <div className="flex-grow flex flex-col overflow-hidden">
                    <EmbeddedChat partyKey={movieKey} directors={[]} isQALive={partyState?.isQALive} user={user} isMobileController={true} />
                </div>
                <div className="p-4 bg-white/5 grid grid-cols-5 gap-2 border-t border-white/10">
                    {REACTION_TYPES.map(reaction => (
                        <button key={reaction.key} onClick={() => logSentiment(reaction.key)} className="flex items-center justify-center py-4 hover:scale-125 transition-transform">
                            <div 
                                className="crate-emoji w-10 h-10"
                                dangerouslySetInnerHTML={{ __html: avatars[reaction.key] || '' }}
                            />
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    useEffect(() => {
        const handleFocus = () => setIsKeyboardOpen(true);
        const handleBlur = () => setIsKeyboardOpen(false);
        
        window.addEventListener('focusin', handleFocus);
        window.addEventListener('focusout', handleBlur);
        
        return () => {
            window.removeEventListener('focusin', handleFocus);
            window.removeEventListener('focusout', handleBlur);
        };
    }, []);

    return (
        <div className={`flex flex-col ${isKeyboardOpen ? 'h-screen' : 'h-[100svh]'} bg-black text-white overflow-hidden transition-all duration-300`}>
                <div className="flex-grow flex flex-col md:flex-row relative overflow-hidden h-full">
                <div className="flex-grow flex flex-col relative h-full">
                    <div className="p-3 bg-black/90 flex items-center justify-between border-b border-white/5">
                        <button onClick={() => window.history.back()} className="text-gray-400 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div className="text-center flex flex-col items-center">
                            <span className="text-red-500 font-black text-[9px] uppercase tracking-widest animate-pulse">Transmission Active</span>
                            <h2 className="text-sm font-bold truncate max-w-[200px] md:max-w-none">{currentMovie?.title || 'Loading...'}</h2>
                            {blockMovies.length > 1 && currentMovie && (
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">Part {currentMovieIndex + 1} of {blockMovies.length}</span>
                                    {currentMovieIndex < blockMovies.length - 1 && (
                                        <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Up Next: {blockMovies[currentMovieIndex + 1].title}</span>
                                    )}
                                </div>
                            )}
                            {isBackstageVerified && (
                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Backstage Verified</span>
                            )}
                        </div>
                        <div className="w-10 flex justify-end">
                            {!isBackstageVerified && (
                                <button 
                                    onClick={() => {
                                        const key = window.prompt("Enter Backstage Key:");
                                        if (key && partyState?.backstageKey && key.toUpperCase() === partyState.backstageKey.toUpperCase()) {
                                            setIsBackstageVerified(true);
                                            unlockWatchParty(movieKey);
                                        } else if (key) {
                                            alert("Invalid Protocol Key.");
                                        }
                                    }}
                                    className="text-gray-600 hover:text-white transition-colors"
                                    title="Backstage Access"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-grow bg-[#050505] relative flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 z-[150] pointer-events-none">
                            {localReactions.map(r => (
                                <FloatingReaction key={r.id} emojiKey={r.emoji} onComplete={() => setLocalReactions(prev => prev.filter(item => item.id !== r.id))} />
                            ))}
                        </div>

                        {!hasAccess ? (
                             <div className="text-center p-8 space-y-10 animate-[fadeIn_0.8s_ease-out] max-w-xl mx-auto">
                                <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none">Admission Required.</h2>
                                <div className="space-y-6">
                                    <button onClick={() => setShowPaywall(true)} className="w-full bg-white text-black px-16 py-6 rounded-full font-black uppercase tracking-tighter text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all">Unlock Admission // ${movie.watchPartyPrice?.toFixed(2)}</button>
                                    
                                    <div className="pt-12 border-t border-white/10">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-6">Director & Staff Verification</p>
                                        <form onSubmit={handleBackstageSubmit} className="flex flex-col gap-4">
                                            <input 
                                                type="text" 
                                                placeholder="Enter Backstage Key" 
                                                value={backstageInput}
                                                onChange={(e) => setBackstageInput(e.target.value)}
                                                className={`bg-white/5 border ${backstageError ? 'border-red-500' : 'border-white/10'} rounded-2xl px-6 py-4 text-center font-mono text-xl tracking-[0.5em] uppercase outline-none focus:border-white/30 transition-all`}
                                            />
                                            <button type="submit" className="text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-widest transition-colors">
                                                {backstageError ? 'Invalid Protocol Key' : 'Authorize Backstage Access'}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                             </div>
                        ) : partyState?.status === 'ended' ? (
                            <div className="w-full h-full flex items-center justify-center p-6 md:p-12 animate-[fadeIn_0.8s_ease-out]">
                                <div className="max-w-2xl w-full space-y-12 text-center">
                                    <div className="space-y-4">
                                        <h2 className="text-6xl md:text-9xl font-black uppercase italic tracking-tighter leading-none">Transmission Concluded.</h2>
                                        <p className="text-xl font-bold text-gray-400 uppercase tracking-widest">Thank you for joining Crate TV Live.</p>
                                    </div>

                                    {highlights && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-white/10">
                                            <div className="bg-white/5 p-6 rounded-3xl space-y-2">
                                                <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Total Transmissions</span>
                                                <p className="text-4xl font-black italic">{highlights.totalMessages}</p>
                                            </div>
                                            <div className="bg-white/5 p-6 rounded-3xl space-y-2">
                                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Peak Sentiment</span>
                                                <p className="text-4xl font-black italic uppercase">{highlights.topReaction}</p>
                                            </div>
                                            <div className="bg-white/5 p-6 rounded-3xl space-y-2">
                                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Viewers Joined</span>
                                                <p className="text-4xl font-black italic">{highlights.uniqueViewers}</p>
                                            </div>
                                        </div>
                                    )}

                                    {hasClaimedStub && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 p-8 rounded-[3rem] animate-[bounceIn_0.8s_ease-out]">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Ticket Stub Claimed!</h3>
                                                    <p className="text-sm font-bold text-emerald-400/80 uppercase tracking-widest">Added to your collection.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button onClick={() => window.history.back()} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-[0.5em] transition-all">Return to Main Terminal</button>
                                </div>
                            </div>
                        ) : partyState?.isQALive && partyState?.qaEmbed ? (
                            <div className="w-full h-full p-2 md:p-6 lg:p-12 flex items-center justify-center bg-black animate-[fadeIn_0.5s_ease-out] relative">
                                {partyState.activePoll && partyState.activePoll.isOpen && user && (
                                    <PollOverlay poll={partyState.activePoll} onVote={handleVote} userId={user.uid} />
                                )}
                                <div className="w-full h-full bg-gray-900 rounded-[2rem] md:rounded-[4rem] overflow-hidden shadow-2xl border border-emerald-500/30 relative">
                                    <div className="absolute top-8 left-8 z-[200] flex items-center gap-2 bg-emerald-600 px-3 py-1 rounded-full shadow-lg">
                                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Director Live</span>
                                    </div>
                                    <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: processLiveEmbed(partyState.qaEmbed) }} />
                                </div>
                            </div>
                        ) : (
                            movie.isLiveStream ? (
                                <div className="w-full h-full p-2 md:p-6 lg:p-12 flex items-center justify-center bg-black relative">
                                    {partyState?.activePoll && partyState.activePoll.isOpen && user && (
                                        <PollOverlay poll={partyState.activePoll} onVote={handleVote} userId={user.uid} />
                                    )}
                                    <div className="w-full h-full bg-gray-900 rounded-[2rem] md:rounded-[4rem] overflow-hidden shadow-2xl border border-white/5 relative" dangerouslySetInnerHTML={{ __html: processLiveEmbed(movie.liveStreamEmbed!) }} />
                                </div>
                            ) : (
                                <div className="relative w-full h-full">
                                    <video 
                                        ref={videoRef} 
                                        src={currentMovie?.fullMovie} 
                                        className={`w-full h-full object-contain transition-opacity duration-1000 ${isEnded ? 'opacity-30 blur-xl' : 'opacity-100'}`} 
                                        autoPlay 
                                        muted={false} 
                                        playsInline
                                        webkit-playsinline="true"
                                        controls={false}
                                        preload="auto"
                                        disableRemotePlayback
                                        style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
                                        onLoadedMetadata={() => {
                                            syncClock();
                                        }}
                                        onCanPlay={() => {
                                            if (!isInitialSyncDone) setIsInitialSyncDone(true);
                                        }}
                                    />
                                    {isEnded && currentMovie && (
                                        <div className="absolute inset-0 z-[160] flex flex-col items-center justify-center bg-black/60 backdrop-blur-3xl animate-[fadeIn_1.2s_ease-out] text-center p-8">
                                            <div className="max-w-3xl space-y-10">
                                                <div>
                                                    <p className="text-red-500 font-black uppercase tracking-[0.8em] text-[10px] mb-4">Transmission Complete</p>
                                                    <h3 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none text-white">Thank You.</h3>
                                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-6 max-w-lg mx-auto leading-relaxed">
                                                        "{currentMovie.title}" produced by <span className="text-white">{currentMovie.director}</span>. Thank you for supporting the distribution afterlife of independent cinema.
                                                    </p>
                                                </div>

                                                {currentMovie && blockMovies.length === 0 && <SuggestionsSection currentMovie={currentMovie} allMovies={allMovies} />}

                                                <div className="pt-10 flex flex-col sm:flex-row items-center justify-center gap-10">
                                                    <button onClick={() => window.history.back()} className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 hover:text-white transition-colors">Return to Library</button>
                                                    <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
                                                    <button onClick={() => window.location.href='/public-square'} className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500 hover:text-white transition-colors">The Public Square</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>

                    <div 
                        className="p-4 bg-black/40 border-y border-white/5 flex justify-center gap-6 md:gap-12 backdrop-blur-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {REACTION_TYPES.map(reaction => (
                            <button 
                                key={reaction.key} 
                                onClick={(e) => { e.stopPropagation(); logSentiment(reaction.key); }} 
                                className="hover:scale-150 active:scale-90 transition-transform drop-shadow-lg"
                            >
                                <div 
                                    className="crate-emoji w-12 h-12 md:w-16 md:h-16"
                                    dangerouslySetInnerHTML={{ __html: avatars[reaction.key] || '' }}
                                />
                            </button>
                        ))}
                    </div>

                    <div className={`md:hidden ${isKeyboardOpen ? 'h-40' : 'h-80'} flex flex-col overflow-hidden bg-[#0a0a0a] transition-all duration-300`}>
                        <EmbeddedChat 
                            partyKey={movieKey} 
                            directors={emptyDirectors} 
                            isQALive={partyState?.isQALive} 
                            qaEmbed={partyState?.qaEmbed}
                            user={user} 
                            isBackstageVerified={isBackstageVerified} 
                            backstageKey={partyState?.backstageKey}
                            onBackstageVerify={handleBackstageVerify}
                        />
                    </div>
                </div>

                <div className="hidden md:flex w-96 flex-shrink-0 h-full border-l border-white/5">
                    <EmbeddedChat 
                        partyKey={movieKey} 
                        directors={emptyDirectors} 
                        isQALive={partyState?.isQALive} 
                        qaEmbed={partyState?.qaEmbed}
                        user={user} 
                        isBackstageVerified={isBackstageVerified} 
                        backstageKey={partyState?.backstageKey}
                        onBackstageVerify={handleBackstageVerify}
                    />
                </div>
            </div>

            {showPaywall && movie && (
                <SquarePaymentModal 
                    movie={movie} 
                    paymentType="watchPartyTicket" 
                    onClose={() => setShowPaywall(false)} 
                    onPaymentSuccess={() => { 
                        if (isBlock) {
                            unlockFestivalBlock(movieKey);
                        } else {
                            unlockWatchParty(movieKey);
                        }
                        setShowPaywall(false); 
                    }} 
                />
            )}
        </div>
    );
};
