import React, { useState, useEffect, useMemo } from 'react';
import { MoviePipelineEntry, JuryVerdict, Movie } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';

interface AcademyIntelTabProps {
    pipeline: MoviePipelineEntry[];
    movies: Record<string, Movie>;
}

const AcademyIntelTab: React.FC<AcademyIntelTabProps> = ({ pipeline, movies }) => {
    const [adminVerdicts, setAdminVerdicts] = useState<Record<string, any>>({});
    const [guestVerdicts, setGuestVerdicts] = useState<Record<string, JuryVerdict[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const unsubAdmin = db.collection('jury_reviews').onSnapshot(snap => {
            const votes: Record<string, any> = {};
            snap.forEach(doc => votes[doc.id] = doc.data());
            setAdminVerdicts(votes);
        });

        const unsubGuest = db.collection('guest_judging').onSnapshot(snap => {
            const votes: Record<string, JuryVerdict[]> = {};
            snapshot.forEach(doc => {
                const data = doc.data() as JuryVerdict & { filmId: string };
                if (!votes[data.filmId]) votes[data.filmId] = [];
                votes[data.filmId].push(data);
            });
            setGuestVerdicts(votes);
            setIsLoading(false);
        });

        return () => { unsubAdmin(); unsubGuest(); };
    }, []);

    const rankedFilms = useMemo(() => {
        return pipeline.map(film => {
            const admin = adminVerdicts[film.id];
            const guests = guestVerdicts[film.id] || [];
            
            const adminAvg = admin ? (admin.direction + admin.performance + admin.cinematography + admin.writing) / 4 : 0;
            // Add explicit type to reduce to ensure correct accumulator inference
            const guestAvg = guests.length > 0 ? (guests.reduce<number>((a, b) => a + (b.narrative + b.technique + b.impact) / 3, 0) / guests.length) : 0;
            
            // Weighted logic: Admin counts for 60%, Guests for 40%
            const combinedScore = (adminAvg * 0.6) + (guestAvg * 0.4);

            return {
                ...film,
                adminScore: adminAvg,
                guestScore: guestAvg,
                guestCount: guests.length,
                combinedScore,
                categories: {
                    // Fix operator precedence and add explicit type to reduce
                    narrative: (admin?.writing || 0) + (guests.reduce<number>((a,b) => a + b.narrative, 0) / (guests.length || 1)),
                    technique: (admin?.technique || 0) + (guests.reduce<number>((a,b) => a + b.technique, 0) / (guests.length || 1)),
                    impact: (admin?.performance || 0) + (guests.reduce<number>((a,b) => a + b.impact, 0) / (guests.length || 1))
                }
            };
        }).sort((a, b) => b.combinedScore - a.combinedScore);
    }, [pipeline, adminVerdicts, guestVerdicts]);

    const projectedAwards = useMemo(() => {
        if (rankedFilms.length === 0) return [];
        
        // Simple logic for category leaders
        const bestNarrative = [...rankedFilms].sort((a,b) => b.categories.narrative - a.categories.narrative)[0];
        const bestTechnique = [...rankedFilms].sort((a,b) => b.categories.technique - a.categories.technique)[0];
        const mostImpact = [...rankedFilms].sort((a,b) => b.categories.impact - a.categories.impact)[0];

        return [
            { category: 'Best Screenplay', film: bestNarrative, metric: 'Narrative Lead' },
            { category: 'Best Direction', film: bestTechnique, metric: 'Technical Lead' },
            { category: 'Audience Choice', film: mostImpact, metric: 'Emotional Lead' }
        ];
    }, [rankedFilms]);

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-emerald-900/10 border border-emerald-500/20 p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8">
                <div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Academy Intel Center</h2>
                    <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Weighted Adjudication Analysis // Live Session</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                        <p className="text-[8px] font-black text-gray-500 uppercase">Total Adjudicators</p>
                        {/* Fix type error by asserting Object.values type and using typed reduce */}
                        <p className="text-2xl font-black text-white">{(Object.values(guestVerdicts) as JuryVerdict[][]).reduce<number>((a, b) => a + b.length, 0)}</p>
                    </div>
                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                        <p className="text-[8px] font-black text-gray-500 uppercase">Yield (Passes)</p>
                        {/* Fix type error by asserting Object.values type and using typed reduce */}
                        <p className="text-2xl font-black text-emerald-500">${((Object.values(guestVerdicts) as JuryVerdict[][]).reduce<number>((a, b) => a + b.length, 0) * 25).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="p-6 bg-white/[0.02] border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Consensus Leaderboard</h3>
                            <span className="text-[8px] font-black text-emerald-800 uppercase">Algorithm: 60_Expert / 40_Guest</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left font-mono text-xs">
                                <thead className="bg-black/40 text-gray-600 uppercase">
                                    <tr>
                                        <th className="p-5">Rank</th>
                                        <th className="p-5">Film Identity</th>
                                        <th className="p-5 text-center">Expert</th>
                                        <th className="p-5 text-center">Guest ({rankedFilms[0]?.guestCount || 0})</th>
                                        <th className="p-5 text-right">Weighted</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {rankedFilms.map((film, i) => (
                                        <tr key={film.id} className="hover:bg-white/[0.01] transition-colors group">
                                            <td className="p-5">
                                                <span className="text-xl font-black text-gray-800 italic group-hover:text-emerald-500/30 transition-colors">#0{i+1}</span>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-sm font-black text-white uppercase truncate max-w-[200px]">{film.title}</p>
                                                <p className="text-[8px] text-gray-600 uppercase font-bold mt-1">Dir. {film.director}</p>
                                            </td>
                                            <td className="p-5 text-center font-bold text-gray-400">
                                                {film.adminScore.toFixed(1)}
                                            </td>
                                            <td className="p-5 text-center font-bold text-emerald-800">
                                                {film.guestScore.toFixed(1)}
                                            </td>
                                            <td className="p-5 text-right">
                                                <span className="text-lg font-black text-white italic">{film.combinedScore.toFixed(2)}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                             <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-8">Award Projections</h3>
                        <div className="space-y-6">
                            {projectedAwards.map(award => (
                                <div key={award.category} className="bg-black/40 border border-white/5 p-5 rounded-2xl group hover:border-indigo-500/30 transition-all">
                                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1">{award.category}</p>
                                    <h4 className="text-lg font-black text-white uppercase tracking-tighter italic">{award.film?.title || 'Calculating...'}</h4>
                                    <p className="text-[9px] text-gray-600 font-bold uppercase mt-2">Protocol: {award.metric}</p>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={() => window.location.hash = 'laurels'}
                            className="mt-8 w-full bg-white text-black font-black py-4 rounded-xl uppercase tracking-widest text-[9px] shadow-xl hover:bg-indigo-500 hover:text-white transition-all"
                        >
                            Open Laurel Forge
                        </button>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-4 shadow-xl">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest">Decision Logic</h3>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium italic">"Current projections are based on normalized sentiment data. Top-tier outliers are recommended for immediate promotion to the Prime Exhibition blocks."</p>
                        <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                            <span className="text-[8px] font-black text-gray-700 uppercase">Auth: V4_CORE</span>
                            <div className="flex gap-1">
                                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AcademyIntelTab;