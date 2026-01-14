
import React, { useState, useEffect, useMemo } from 'react';
import { MoviePipelineEntry, JuryVerdict, Movie } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';
import firebase from 'firebase/compat/app';

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
            snap.forEach((doc: firebase.firestore.QueryDocumentSnapshot) => {
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
        return pipeline
            .filter(film => film.status === 'pending')
            .map(film => {
                const admin = adminVerdicts[film.id];
                const guests = guestVerdicts[film.id] || [];
                
                const adminAvg = admin ? (Number(admin.direction || 0) + Number(admin.performance || 0) + Number(admin.cinematography || 0) + Number(admin.writing || 0)) / 4 : 0;
                const guestAvg = guests.length > 0 ? (guests.reduce((a, b) => a + (Number(b.narrative) + Number(b.technique) + Number(b.impact)) / 3, 0) / guests.length) : 0;
                
                const combinedScore = (adminAvg * 0.6) + (guestAvg * 0.4);
                const velocity = (guests.length * 2.5) + (combinedScore * 1.5);
                
                // Prediction: Should this film move to The Vault?
                const yieldPotential = velocity > 25 ? 'HIGH' : velocity > 15 ? 'MODERATE' : 'STABLE';

                return {
                    ...film,
                    adminScore: adminAvg,
                    guestScore: guestAvg,
                    guestCount: guests.length,
                    combinedScore,
                    hasReview: !!admin || guests.length > 0,
                    velocity,
                    yieldPotential
                };
            })
            .filter(f => f.hasReview)
            .sort((a, b) => b.velocity - a.velocity);
    }, [pipeline, adminVerdicts, guestVerdicts]);

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-emerald-900/10 border border-emerald-500/20 p-10 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8">
                <div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Academy Intelligence</h2>
                    <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] mt-3">Consensus Analysis // Yield Projections</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-black/40 p-6 rounded-3xl border border-white/5 text-center min-w-[140px]">
                        <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Active Ballots</p>
                        <p className="text-3xl font-black text-white">{(Object.values(guestVerdicts) as JuryVerdict[][]).reduce((a, b) => a + b.length, 0)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-6 bg-white/[0.02] border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 italic">Target Acquisition Manifest</h3>
                    <span className="text-[8px] font-black text-emerald-800 uppercase animate-pulse">Syncing Cloud Nodes...</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-black/40 text-gray-600 uppercase">
                            <tr>
                                <th className="p-6">Rank</th>
                                <th className="p-6">Identity</th>
                                <th className="p-6 text-center">Consensus</th>
                                <th className="p-6 text-center">Voter Density</th>
                                <th className="p-6 text-right">Yield Potential</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {rankedFilms.map((film, i) => (
                                <tr key={film.id} className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="p-6">
                                        <span className="text-3xl font-black text-gray-800 italic group-hover:text-emerald-500/30 transition-colors">#0{i+1}</span>
                                    </td>
                                    <td className="p-6">
                                        <p className="text-sm font-black text-white uppercase">{film.title}</p>
                                        <p className="text-[8px] text-gray-600 uppercase font-bold mt-1">Ref: {film.id.substring(0,8)}</p>
                                    </td>
                                    <td className="p-6 text-center">
                                        <div className="inline-flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            <span className="font-bold text-gray-300 text-sm">{film.combinedScore.toFixed(1)}/10</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className="text-white font-bold bg-white/5 px-3 py-1 rounded-full border border-white/10">{film.guestCount} Ballots</span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <span className={`px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest ${
                                            film.yieldPotential === 'HIGH' ? 'bg-red-600 text-white animate-pulse shadow-lg' : 
                                            film.yieldPotential === 'MODERATE' ? 'bg-amber-600 text-white' : 
                                            'bg-white/5 text-gray-600'
                                        }`}>
                                            {film.yieldPotential === 'HIGH' ? 'Vault Contender' : film.yieldPotential}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {rankedFilms.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center opacity-20">
                                        <p className="text-sm font-black uppercase tracking-[0.5em]">Awaiting Adjudication Data</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AcademyIntelTab;
