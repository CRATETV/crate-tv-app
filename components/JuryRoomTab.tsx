import React, { useState, useEffect } from 'react';
import { MoviePipelineEntry } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';

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

        return () => unsubscribe();
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
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Progress</p>
                    <p className="text-white font-bold">{Object.keys(existingVotes).length} / {pendingFilms.length} Reviewed</p>
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
                        <div className="lg:col-span-2 space-y-6">
                            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 relative group">
                                <video 
                                    src={selectedFilm.movieUrl} 
                                    controls 
                                    className="w-full h-full"
                                    controlsList="nodownload"
                                />
                                <div className="absolute top-4 left-4 pointer-events-none">
                                    <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest">
                                        Secure Screener
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-800/40 p-8 rounded-2xl border border-white/5">
                                <h3 className="text-3xl font-bold text-white mb-2">{selectedFilm.title}</h3>
                                <p className="text-red-500 font-black uppercase tracking-widest mb-6">Directed by {selectedFilm.director}</p>
                                <div className="prose prose-invert max-w-none">
                                    <p className="text-gray-300 text-lg leading-relaxed">{selectedFilm.synopsis}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-900 border border-red-600/30 p-8 rounded-3xl shadow-2xl space-y-8">
                                <h4 className="text-lg font-black text-white uppercase tracking-tighter border-b border-white/5 pb-4">Consensus Verdict</h4>
                                
                                <div className="space-y-6">
                                    <RatingSlider 
                                        label="Direction" 
                                        value={vote.direction} 
                                        onChange={(v) => setVote({...vote, direction: v})} 
                                    />
                                    <RatingSlider 
                                        label="Performance" 
                                        value={vote.performance} 
                                        onChange={(v) => setVote({...vote, performance: v})} 
                                    />
                                    <RatingSlider 
                                        label="Cinematography" 
                                        value={vote.cinematography} 
                                        onChange={(v) => setVote({...vote, cinematography: v})} 
                                    />
                                    <RatingSlider 
                                        label="Writing" 
                                        value={vote.writing} 
                                        onChange={(v) => setVote({...vote, writing: v})} 
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Laurel Recommendation</label>
                                    <select 
                                        value={vote.recommendation}
                                        onChange={(e) => setVote({...vote, recommendation: e.target.value})}
                                        className="form-input bg-gray-800 border-gray-700 text-sm"
                                    >
                                        {AWARD_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Jury Notes</label>
                                    <textarea 
                                        value={vote.comments}
                                        onChange={(e) => setVote({...vote, comments: e.target.value})}
                                        className="form-input bg-gray-800 border-gray-700 text-sm h-24 resize-none"
                                        placeholder="Specific reasoning for award nomination..."
                                    />
                                </div>

                                <button 
                                    onClick={handleSubmitVerdict}
                                    disabled={isSubmitting}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-xl transition-all transform active:scale-95 disabled:bg-gray-800"
                                >
                                    {isSubmitting ? 'Recording...' : 'Submit Jury Verdict'}
                                </button>
                            </div>

                            <div className="bg-gray-800/40 p-6 rounded-2xl border border-white/5">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Submission Logistics</h4>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Submitter</p>
                                        <p className="text-white text-sm font-medium truncate">{selectedFilm.submitterEmail || 'Internal Entry'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Cast Details</p>
                                        <p className="text-white text-sm font-medium line-clamp-2">{selectedFilm.cast}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {pendingFilms.length > 0 ? pendingFilms.map(film => {
                        const isJudged = !!existingVotes[film.id];
                        return (
                            <div 
                                key={film.id} 
                                onClick={() => setSelectedFilm(film)}
                                className="group cursor-pointer space-y-3"
                            >
                                <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/5 transition-all duration-500 group-hover:scale-[1.03] group-hover:border-red-600/50 shadow-xl">
                                    <img src={film.posterUrl} alt={film.title} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                                    
                                    {/* Judged Overlay Badge */}
                                    {isJudged && (
                                        <div className="absolute top-2 right-2 bg-green-500 text-black font-black px-2 py-0.5 rounded text-[8px] uppercase tracking-tighter shadow-lg z-10">
                                            Reviewed
                                        </div>
                                    )}

                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-white text-black font-black px-4 py-2 rounded-full text-[10px] uppercase tracking-widest shadow-2xl">Screen Film</div>
                                    </div>
                                </div>
                                <div className="px-1">
                                    <h4 className="text-white font-bold text-sm truncate">{film.title}</h4>
                                    <p className="text-gray-500 text-[9px] uppercase font-black tracking-tighter truncate">{film.director}</p>
                                    {isJudged && (
                                        <div className="mt-1 flex items-center gap-1">
                                            <span className="text-yellow-500 text-[10px]">★</span>
                                            <span className="text-gray-400 text-[10px] font-bold">
                                                {((existingVotes[film.id].direction + existingVotes[film.id].performance + existingVotes[film.id].cinematography + existingVotes[film.id].writing) / 4).toFixed(1)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="col-span-full py-24 text-center">
                            <p className="text-gray-600 font-bold uppercase tracking-[0.5em]">No Pending Submissions for Review</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default JuryRoomTab;