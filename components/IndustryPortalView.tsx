import React, { useState, useEffect, useMemo } from 'react';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { Movie, ActorProfile, ScoutReport } from '../types';

const TerminalStat: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-green-500' }) => (
    <div className="border border-green-900/30 p-4 bg-black/80 backdrop-blur-sm shadow-inner">
        <p className="text-[10px] font-mono text-green-700 uppercase tracking-widest mb-1">{" >> "} {label}</p>
        <p className={`text-2xl font-mono ${color} tracking-tighter`}>{value}</p>
    </div>
);

const TypewriterText: React.FC<{ text: string; delay?: number }> = ({ text, delay = 20 }) => {
    const [displayedText, setDisplayedText] = useState('');
    
    useEffect(() => {
        setDisplayedText('');
        let i = 0;
        const timer = setInterval(() => {
            setDisplayedText(text.slice(0, i));
            i++;
            if (i > text.length) clearInterval(timer);
        }, delay);
        return () => clearInterval(timer);
    }, [text, delay]);

    return <span>{displayedText}</span>;
};

const IndustryPortalView: React.FC = () => {
    const { movies, isLoading: isFestivalLoading } = useFestival();
    const { getUserIdToken } = useAuth();
    const [actors, setActors] = useState<ActorProfile[]>([]);
    const [selectedActor, setSelectedActor] = useState<ActorProfile | null>(null);
    const [isFetchingActors, setIsFetchingActors] = useState(true);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [report, setReport] = useState<ScoutReport | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchActors = async () => {
            try {
                const res = await fetch('/api/get-public-actors');
                if (!res.ok) throw new Error('Failed to fetch verified talent.');
                const data = await res.json();
                setActors(data.actors || []);
            } catch (err) {
                console.error(err);
            } finally {
                setIsFetchingActors(false);
            }
        };
        fetchActors();
    }, []);

    const handleSynthesizeReport = async (actor: ActorProfile) => {
        setIsSynthesizing(true);
        setError('');
        setReport(null);
        try {
            const token = await getUserIdToken();
            const res = await fetch('/api/generate-scout-report', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ actorId: actor.slug }),
            });
            
            if (!res.ok) throw new Error('Intelligence synthesis rejected.');
            const data = await res.json();
            setReport(data.report);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Uplink to Gemini Core failed.');
        } finally {
            setIsSynthesizing(false);
        }
    };

    const aggregatedStats = useMemo(() => {
        const movieArray = Object.values(movies) as Movie[];
        const totalLikes = movieArray.reduce((s, m) => s + (m.likes || 0), 0);
        const avgLikes = movieArray.length ? (totalLikes / movieArray.length).toFixed(1) : '0';
        return {
            screenerCount: movieArray.length,
            talentCount: actors.length,
            avgVelocity: avgLikes
        };
    }, [movies, actors]);

    if (isFestivalLoading || isFetchingActors) return <LoadingSpinner />;

    return (
        <div className="bg-[#000d00] min-h-screen font-mono p-8 text-green-500 relative overflow-hidden rounded-[2.5rem] border border-green-900/30 shadow-[0_0_100px_rgba(0,20,0,0.5)]">
            {/* CRT Effect Overlay */}
            <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20"></div>
            
            <div className="max-w-7xl mx-auto space-y-10 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-green-900 pb-8 gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-5xl font-black uppercase tracking-tighter text-green-400 italic">Industry Discovery Terminal</h1>
                            <span className="bg-green-600/10 border border-green-600/30 text-green-500 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest animate-pulse">PRO_AUTH_V4</span>
                        </div>
                        <p className="text-xs text-green-800 mt-2 tracking-[0.4em]">ENCRYPTED ACCESS // GLOBAL TALENT RECONNAISSANCE</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-green-900 uppercase">System Frequency: 14.2 THz</p>
                        <p className="text-sm font-bold text-green-600">{new Date().toLocaleTimeString()} // NODE_ALPHA</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <TerminalStat label="Verified Screeners" value={aggregatedStats.screenerCount.toString()} />
                    <TerminalStat label="Talent Nodes" value={aggregatedStats.talentCount.toString()} />
                    <TerminalStat label="Avg. Audience Velocity" value={`+${aggregatedStats.avgVelocity}`} color="text-amber-500" />
                    <TerminalStat label="Network Status" value="Secure" color="text-green-400" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
                    {/* Left Panel: Talent Directory */}
                    <div className="lg:col-span-4 flex flex-col bg-black/40 border border-green-900/30 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-green-900/30 bg-green-900/5 flex justify-between items-center">
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-green-700">Verified Talent Feed</h2>
                        </div>
                        <div className="flex-grow overflow-y-auto scrollbar-hide">
                            {actors.map(actor => (
                                <button 
                                    key={actor.slug}
                                    onClick={() => { setSelectedActor(actor); setReport(null); setError(''); }}
                                    className={`w-full text-left p-6 border-b border-green-900/10 transition-all hover:bg-green-900/10 group ${selectedActor?.slug === actor.slug ? 'bg-green-900/20' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full border border-green-900/30 overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                                            <img src={actor.photo} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-bold uppercase tracking-tight ${selectedActor?.slug === actor.slug ? 'text-green-400' : 'text-green-800 group-hover:text-green-500'}`}>{actor.name}</p>
                                            <p className="text-[9px] text-green-900 font-black tracking-widest mt-0.5">AVAILABILITY: CHECK_MANUAL</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Intelligence Synthesis */}
                    <div className="lg:col-span-8 flex flex-col bg-black/60 border border-green-900/30 rounded-[2.5rem] p-8 shadow-2xl relative">
                        {!selectedActor ? (
                            <div className="flex-grow flex flex-col items-center justify-center text-center opacity-20 space-y-6">
                                <div className="w-32 h-32 border-2 border-dashed border-green-900 rounded-full flex items-center justify-center animate-[spin_30s_linear_infinite]">
                                    <svg className="w-12 h-12 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                </div>
                                <p className="text-sm font-black uppercase tracking-[0.5em] text-green-900">Awaiting Node Selection</p>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full animate-[fadeIn_0.5s_ease-out]">
                                <div className="flex justify-between items-start mb-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-2xl border-2 border-green-400/50 overflow-hidden shadow-[0_0_30px_rgba(74,222,128,0.2)]">
                                            <img src={selectedActor.photo} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div>
                                            <h3 className="text-4xl font-black uppercase tracking-tighter text-green-400 leading-none">{selectedActor.name}</h3>
                                            <p className="text-xs text-green-800 font-bold mt-2 uppercase tracking-[0.2em]">Verified Actor Node // HASH_{selectedActor.slug.toUpperCase().substring(0,8)}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleSynthesizeReport(selectedActor)}
                                        disabled={isSynthesizing}
                                        className="bg-green-600 hover:bg-green-500 text-black font-black px-8 py-4 rounded-xl text-[10px] uppercase tracking-widest shadow-[0_15px_40px_rgba(0,255,0,0.15)] active:scale-95 transition-all disabled:opacity-20 flex items-center gap-3"
                                    >
                                        {isSynthesizing ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                                Synthesizing...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                Run Intel Scan
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="flex-grow overflow-y-auto scrollbar-hide space-y-10">
                                    {error && (
                                        <div className="p-6 bg-red-900/10 border border-red-900/30 rounded-2xl text-center">
                                            <p className="text-xs font-black uppercase tracking-widest text-red-500">{error}</p>
                                        </div>
                                    )}

                                    {!report && !isSynthesizing && !error && (
                                        <div className="bg-green-900/5 border border-green-900/20 p-8 rounded-3xl space-y-4">
                                            <p className="text-xs text-green-800 font-bold uppercase tracking-[0.3em]">Talent Briefing</p>
                                            <p className="text-sm text-green-700 leading-relaxed italic">"{selectedActor.bio}"</p>
                                        </div>
                                    )}

                                    {isSynthesizing && (
                                        <div className="space-y-6 animate-pulse">
                                            <div className="h-4 bg-green-900/20 rounded-full w-3/4"></div>
                                            <div className="h-4 bg-green-900/20 rounded-full w-1/2"></div>
                                            <div className="h-20 bg-green-900/10 rounded-2xl"></div>
                                            <div className="h-4 bg-green-900/20 rounded-full w-2/3"></div>
                                        </div>
                                    )}

                                    {report && (
                                        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-black/60 border border-green-900/30 p-6 rounded-2xl space-y-2 shadow-inner">
                                                    <p className="text-[9px] font-black text-green-800 uppercase tracking-widest">Discovery Readiness</p>
                                                    <div className="flex items-baseline gap-2">
                                                        <p className="text-5xl font-black text-green-400 italic">0{report.potentialScore}</p>
                                                        <span className="text-xs text-green-900 font-bold">/ 100</span>
                                                    </div>
                                                </div>
                                                <div className="bg-black/60 border border-green-900/30 p-6 rounded-2xl space-y-2 shadow-inner">
                                                    <p className="text-[9px] font-black text-green-800 uppercase tracking-widest">Market Fit Alignment</p>
                                                    <p className="text-xl font-black text-green-400 uppercase tracking-tighter leading-none pt-1">
                                                        <TypewriterText text={report.marketFit} />
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-green-800 uppercase tracking-[0.4em] border-b border-green-900/30 pb-2">Performance DNA Profile</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {report.performanceDna.map((dna, idx) => (
                                                        <span key={idx} className="bg-green-600/10 border border-green-600/30 text-green-400 text-[10px] font-black uppercase px-4 py-2 rounded-xl shadow-lg">
                                                            {dna}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-4 bg-green-900/5 p-8 rounded-3xl border border-green-900/20 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                                    <svg className="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                                </div>
                                                <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">Acquisition Strategy Recommendation</p>
                                                <p className="text-lg text-green-300 leading-relaxed font-medium italic">
                                                    <TypewriterText text={report.acquisitionStrategy} delay={15} />
                                                </p>
                                            </div>

                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-green-800 uppercase tracking-[0.4em] border-b border-green-900/30 pb-2">Institutional Comparables</p>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {report.comparables.map((comp, idx) => (
                                                        <div key={idx} className="bg-black/40 border border-green-900/10 p-4 rounded-xl text-center">
                                                            <p className="text-xs font-bold text-green-600 uppercase tracking-tighter">{comp}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 pt-8 border-t border-green-900/30 flex justify-between items-center text-[10px] font-black text-green-900 uppercase tracking-[0.3em]">
                                    <span>Auth_Protocol: V1.0_LIFT</span>
                                    <span>Grounding_Engine: Gemini_3_Pro</span>
                                    <span>Sync_Status: High_Velocity</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IndustryPortalView;
