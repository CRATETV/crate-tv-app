
import React, { useState, useEffect } from 'react';
import { MoviePipelineEntry, JuryVerdict } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';
import firebase from 'firebase/compat/app';

interface JuryRoomTabProps {
    pipeline: MoviePipelineEntry[];
}

interface JuryVote {
    direction: number;
    performance: number;
    cinematography: number;
    writing: number;
    recommendation: string;
    comments: string;
}

const AWARD_CATEGORIES = [
    "Best Short Film",
    "Best Director",
    "Best Screenplay",
    "Best Performance",
    "Best Cinematography",
    "Best Documentary Short",
    "Best Animation Selection",
    "Best Student Film",
    "Audience Choice Contender"
];

const RatingSlider: React.FC<{ label: string; value: number; onChange: (val: number) => void }> = ({ label, value, onChange }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</label>
            <span className="text-sm font-bold text-red-500">{value}/10</span>
        </div>
        <input 
            type="range" 
            min="0" 
            max="10" 
            step="0.5"
            value={value} 
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
        />
    </div>
);

const JuryRoomTab: React.FC<JuryRoomTabProps> = ({ pipeline }) => {
    const [selectedFilm, setSelectedFilm] = useState<MoviePipelineEntry | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingVotes, setExistingVotes] = useState<Record<string, any>>({});
    const [communityVotes, setCommunityVotes] = useState<Record<string, JuryVerdict[]>>({});
    const [vote, setVote] = useState<JuryVote>({
        direction: 5,
        performance: 5,
        cinematography: 5,
        writing: 5,
        recommendation: AWARD_CATEGORIES[0],
        comments: ''
    });

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        
        const unsubscribe = db.collection('jury_reviews').onSnapshot(snapshot => {
            const votes: Record<string, any> = {};
            snapshot.forEach(doc => {
                votes[doc.id] = doc.data();
            });
            setExistingVotes(votes);
        });

        const unsubCommunity = db.collection('guest_judging').onSnapshot(snapshot => {
            const votes: Record<string, JuryVerdict[]> = {};
            snapshot.forEach((doc: firebase.firestore.QueryDocumentSnapshot) => {
                const data = doc.data() as JuryVerdict & { filmId: string };
                if (!votes[data.filmId]) votes[data.filmId] = [];
                votes[data.filmId].push(data);
            });
            setCommunityVotes(votes);
        });

        return () => { unsubscribe(); unsubCommunity(); };
    }, []);

    useEffect(() => {
        if (selectedFilm && existingVotes[selectedFilm.id]) {
            setVote(existingVotes[selectedFilm.id]);
        } else {
            setVote({
                direction: 5,
                performance: 5,
                cinematography: 5,
                writing: 5,
                recommendation: AWARD_CATEGORIES[0],
                comments: ''
            });
        }
    }, [selectedFilm, existingVotes]);

    const handleSelectFilm = (film: MoviePipelineEntry) => {
        setSelectedFilm(film);
    };

    const pendingFilms = pipeline.filter(item => item.status === 'pending' || !item.status);

    const handleSubmitVerdict = async () => {
        if (!selectedFilm) return;
        setIsSubmitting(true);
        try {
            const db = getDbInstance();
            if (!db) throw new Error("DB not initialized");

            await db.collection('jury_reviews').doc(selectedFilm.id).set({
                ...vote,
                filmTitle: selectedFilm.title,
                lastUpdated: new Date()
            });
            
            alert(`Verdict recorded for "${selectedFilm.title}"`);
            setSelectedFilm(null);
        } catch (error) {
            console.error("Failed to save jury vote:", error);
            alert("Failed to save verdict. Check console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-gradient-to-r from-gray-900 to-black border border-white/5 p-8 rounded-2xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Grand Jury Screening Room</h2>
                    <p className="text-gray-400 mt-2 text-lg">Confidential deliberation portal for Crate TV festival adjudicators.</p>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-white font-bold">{Object.keys(existingVotes).length} / {pendingFilms.length} Vetted</p>
                </div>
            </div>

            {selectedFilm ? (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                    <button 
                        onClick={() => setSelectedFilm(null)}
                        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors uppercase font-black text-xs tracking-widest group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Submissions
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 relative group">
                                <video src={selectedFilm.movieUrl} controls className="w-full h-full" controlsList="nodownload" />
                            </div>
                            
                            <div className="bg-emerald-900/10 border border-emerald-500/20 p-8 rounded-3xl space-y-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500">Guest Jury Intelligence</h3>
                                {communityVotes[selectedFilm.id] && communityVotes[selectedFilm.id].length > 0 ? (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center bg-black/40 p-4 rounded-xl">
                                            <p className="text-[8px] font-black text-emerald-800 uppercase">Avg Narrative</p>
                                            <p className="text-2xl font-black text-white">
                                                {(communityVotes[selectedFilm.id].reduce((sum, v) => sum + Number(v.narrative), 0) / communityVotes[selectedFilm.id].length).toFixed(1)}
                                            </p>
                                        </div>
                                        <div className="text-center bg-black/40 p-4 rounded-xl">
                                            <p className="text-[8px] font-black text-emerald-800 uppercase">Avg Tech</p>
                                            <p className="text-2xl font-black text-white">
                                                {(communityVotes[selectedFilm.id].reduce((sum, v) => sum + Number(v.technique), 0) / communityVotes[selectedFilm.id].length).toFixed(1)}
                                            </p>
                                        </div>
                                        <div className="text-center bg-black/40 p-4 rounded-xl">
                                            <p className="text-[8px] font-black text-emerald-800 uppercase">Total Votes</p>
                                            <p className="text-2xl font-black text-white">{communityVotes[selectedFilm.id].length}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-emerald-900 italic uppercase">No guest verdicts synchronized for this node.</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-900 border border-red-600/30 p-8 rounded-3xl shadow-2xl space-y-8">
                                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                    <h4 className="text-lg font-black text-white uppercase tracking-tighter italic">Consensus Verdict</h4>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${selectedFilm.source === 'AI_SCOUTED' ? 'bg-cyan-600 text-white' : 'bg-red-600 text-white'}`}>
                                        {selectedFilm.source || 'FFREEWAY'}
                                    </span>
                                </div>
                                <div className="space-y-6">
                                    <RatingSlider label="Direction" value={vote.direction} onChange={(v) => setVote({...vote, direction: v})} />
                                    <RatingSlider label="Performance" value={vote.performance} onChange={(v) => setVote({...vote, performance: v})} />
                                    <RatingSlider label="Cinematography" value={vote.cinematography} onChange={(v) => setVote({...vote, cinematography: v})} />
                                    <RatingSlider label="Writing" value={vote.writing} onChange={(v) => setVote({...vote, writing: v})} />
                                </div>
                                <select value={vote.recommendation} onChange={(e) => setVote({...vote, recommendation: e.target.value})} className="form-input bg-gray-800 border-gray-700 text-sm">
                                    {AWARD_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                <textarea value={vote.comments} onChange={(e) => setVote({...vote, comments: e.target.value})} className="form-input bg-gray-800 border-gray-700 text-sm h-24 resize-none" placeholder="Jury notes..." />
                                <button onClick={handleSubmitVerdict} disabled={isSubmitting} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-xl transition-all disabled:bg-gray-800">
                                    {isSubmitting ? 'Recording...' : 'Submit Jury Verdict'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {pendingFilms.map(film => {
                        const isJudged = !!existingVotes[film.id];
                        const communityCount = communityVotes[film.id]?.length || 0;
                        const isScouted = film.source === 'AI_SCOUTED';
                        return (
                            <div key={film.id} onClick={() => handleSelectFilm(film)} className="group cursor-pointer space-y-3">
                                <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/5 transition-all duration-500 group-hover:scale-[1.03] group-hover:border-red-600/50 shadow-xl">
                                    <img src={film.posterUrl} alt={film.title} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                                    
                                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                        {isScouted && <span className="bg-cyan-600 text-white font-black px-1.5 py-0.5 rounded text-[7px] uppercase tracking-tighter shadow-lg">Scouted Target</span>}
                                        {isJudged && <span className="bg-green-500 text-black font-black px-1.5 py-0.5 rounded text-[7px] uppercase tracking-tighter shadow-lg">Vetted</span>}
                                    </div>
                                    
                                    {communityCount > 0 && <div className="absolute bottom-2 right-2 bg-emerald-600 text-white font-black px-2 py-0.5 rounded text-[8px] uppercase tracking-tighter shadow-lg z-10">{communityCount} Guest Votes</div>}
                                    
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-white text-black font-black px-4 py-2 rounded-full text-[10px] uppercase tracking-widest shadow-2xl">Enter Deliberation</div>
                                    </div>
                                </div>
                                <div className="px-1">
                                    <h4 className="text-white font-bold text-sm truncate">{film.title}</h4>
                                    <p className="text-gray-500 text-[9px] uppercase font-black tracking-tighter truncate">{film.director}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default JuryRoomTab;
