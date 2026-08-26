import React, { useState, useEffect, useMemo } from 'react';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { Movie, ActorProfile, ScoutReport } from '../types';

const StatCard: React.FC<{ title: string; value: string; color?: string }> = ({ title, value, color = 'text-white' }) => (
    <div className="bg-white/[0.03] border border-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl text-center hover:bg-white/[0.05] transition-all">
        <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">{title}</h3>
        <p className={`text-2xl md:text-3xl font-black italic tracking-tighter uppercase ${color}`}>{value}</p>
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

            if (!res.ok) throw new Error('Report generation failed.');
            const data = await res.json();
            setReport(data.report);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not generate the scout report — try again.');
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
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div>
                <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic leading-none">Talent Scout</h1>
                <p className="text-gray-500 mt-2 font-black uppercase text-[10px] tracking-[0.4em]">Browse Crate's verified talent and generate AI scouting reports</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Films on Crate" value={aggregatedStats.screenerCount.toString()} />
                <StatCard title="Verified Talent" value={aggregatedStats.talentCount.toString()} />
                <StatCard title="Avg. Likes per Film" value={aggregatedStats.avgVelocity} color="text-amber-400" />
                <StatCard title="Status" value="Online" color="text-green-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
                {/* Left Panel: Talent Directory */}
                <div className="lg:col-span-4 flex flex-col bg-[#0f0f0f] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gray-500">Talent Directory</h2>
                    </div>
                    <div className="flex-grow overflow-y-auto scrollbar-hide">
                        {actors.map(actor => (
                            <button
                                key={actor.slug}
                                onClick={() => { setSelectedActor(actor); setReport(null); setError(''); }}
                                className={`w-full text-left p-6 border-b border-white/5 transition-all hover:bg-white/[0.03] group ${selectedActor?.slug === actor.slug ? 'bg-white/[0.05]' : ''}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden flex-shrink-0">
                                        <img src={actor.photo} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-bold uppercase tracking-tight truncate ${selectedActor?.slug === actor.slug ? 'text-red-500' : 'text-white group-hover:text-red-500'} transition-colors`}>{actor.name}</p>
                                        <p className={`text-[9px] font-black tracking-widest mt-0.5 ${actor.isAvailableForCasting ? 'text-green-500' : 'text-gray-600'}`}>
                                            {actor.isAvailableForCasting ? 'Available for Casting' : 'Not Currently Available'}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Scout Report */}
                <div className="lg:col-span-8 flex flex-col bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative">
                    {!selectedActor ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center opacity-30 space-y-6">
                            <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 3c0-1.1-.9-2-2-2h-8a2 2 0 00-2 2v2h12v-2z" /></svg>
                            <p className="text-sm font-black uppercase tracking-[0.4em] text-gray-600">Select an actor to get started</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full animate-[fadeIn_0.5s_ease-out]">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-10">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-2xl border border-white/10 overflow-hidden">
                                        <img src={selectedActor.photo} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white italic leading-none">{selectedActor.name}</h3>
                                        <p className={`text-xs font-bold mt-2 uppercase tracking-[0.2em] ${selectedActor.isAvailableForCasting ? 'text-green-500' : 'text-gray-500'}`}>
                                            {selectedActor.isAvailableForCasting ? 'Available for Casting' : 'Not Currently Available'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSynthesizeReport(selectedActor)}
                                    disabled={isSynthesizing}
                                    className="bg-white text-black font-black px-8 py-4 rounded-xl text-[10px] uppercase tracking-widest active:scale-95 transition-all disabled:opacity-20 flex items-center gap-3 whitespace-nowrap"
                                >
                                    {isSynthesizing ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                            Generating...
                                        </>
                                    ) : (
                                        'Generate Scout Report'
                                    )}
                                </button>
                            </div>

                            <div className="flex-grow overflow-y-auto scrollbar-hide space-y-10">
                                {error && (
                                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                                        <p className="text-xs font-black uppercase tracking-widest text-red-500">{error}</p>
                                    </div>
                                )}

                                {!report && !isSynthesizing && !error && (
                                    <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl space-y-4">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.3em]">Bio</p>
                                        <p className="text-sm text-gray-300 leading-relaxed italic">"{selectedActor.bio}"</p>
                                    </div>
                                )}

                                {isSynthesizing && (
                                    <div className="space-y-6 animate-pulse">
                                        <div className="h-4 bg-white/5 rounded-full w-3/4"></div>
                                        <div className="h-4 bg-white/5 rounded-full w-1/2"></div>
                                        <div className="h-20 bg-white/[0.03] rounded-2xl"></div>
                                        <div className="h-4 bg-white/5 rounded-full w-2/3"></div>
                                    </div>
                                )}

                                {report && (
                                    <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-black/40 border border-white/5 p-6 rounded-2xl space-y-2">
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Scout Score</p>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-5xl font-black text-white italic">{report.potentialScore}</p>
                                                    <span className="text-xs text-gray-600 font-bold">/ 100</span>
                                                </div>
                                            </div>
                                            <div className="bg-black/40 border border-white/5 p-6 rounded-2xl space-y-2">
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Market Fit</p>
                                                <p className="text-xl font-black text-white uppercase tracking-tighter leading-none pt-1">
                                                    <TypewriterText text={report.marketFit} />
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] border-b border-white/5 pb-2">Performance Profile</p>
                                            <div className="flex flex-wrap gap-2">
                                                {report.performanceDna.map((dna, idx) => (
                                                    <span key={idx} className="bg-red-600/10 border border-red-600/30 text-red-400 text-[10px] font-black uppercase px-4 py-2 rounded-xl">
                                                        {dna}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4 bg-white/[0.02] p-8 rounded-3xl border border-white/5">
                                            <p className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Casting Recommendation</p>
                                            <p className="text-lg text-gray-300 leading-relaxed font-medium italic">
                                                <TypewriterText text={report.acquisitionStrategy} delay={15} />
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] border-b border-white/5 pb-2">Comparable Talent</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {report.comparables.map((comp, idx) => (
                                                    <div key={idx} className="bg-black/40 border border-white/5 p-4 rounded-xl text-center">
                                                        <p className="text-xs font-bold text-gray-300 uppercase tracking-tighter">{comp}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IndustryPortalView;
