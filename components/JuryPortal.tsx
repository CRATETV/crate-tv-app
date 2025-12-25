
import React, { useState } from 'react';
import { MoviePipelineEntry } from '../types';

interface JuryPortalProps {
    pipeline: MoviePipelineEntry[];
}

const JuryPortal: React.FC<JuryPortalProps> = ({ pipeline }) => {
    const [selectedFilm, setSelectedFilm] = useState<MoviePipelineEntry | null>(null);

    const pendingFilms = pipeline.filter(item => item.status === 'pending' || !item.status);

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-gradient-to-r from-gray-900 to-black border border-white/5 p-8 rounded-2xl shadow-2xl">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Grand Jury Screening Room</h2>
                <p className="text-gray-400 mt-2 text-lg">Confidential deliberation portal for Crate TV festival adjudicators.</p>
            </div>

            {selectedFilm ? (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                    <button 
                        onClick={() => setSelectedFilm(null)}
                        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors uppercase font-black text-xs tracking-widest"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Submissions
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                                <video 
                                    src={selectedFilm.movieUrl} 
                                    controls 
                                    className="w-full h-full"
                                    controlsList="nodownload"
                                />
                            </div>
                            <div className="bg-gray-800/40 p-8 rounded-2xl border border-white/5">
                                <h3 className="text-3xl font-bold text-white mb-2">{selectedFilm.title}</h3>
                                <p className="text-red-500 font-black uppercase tracking-widest mb-6">Directed by {selectedFilm.director}</p>
                                <div className="prose prose-invert max-w-none">
                                    <p className="text-gray-300 text-lg leading-relaxed">{selectedFilm.synopsis}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-gray-800/40 p-6 rounded-2xl border border-white/5">
                                <h4 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Film Metadata</h4>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Submitter</p>
                                        <p className="text-white font-medium">{selectedFilm.submitterEmail || 'Internal Entry'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Lead Cast</p>
                                        <p className="text-white font-medium">{selectedFilm.cast}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Submission Date</p>
                                        <p className="text-white font-medium">
                                            {selectedFilm.submissionDate ? new Date(selectedFilm.submissionDate.seconds * 1000).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-purple-900/10 border border-purple-500/20 p-6 rounded-2xl">
                                <h4 className="text-purple-400 font-black text-sm uppercase tracking-widest mb-2">Jury Verdict</h4>
                                <p className="text-gray-400 text-xs leading-relaxed">Please use the Pipeline tab to formally approve or reject this film for the festival lineup based on jury consensus.</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {pendingFilms.length > 0 ? pendingFilms.map(film => (
                        <div 
                            key={film.id} 
                            onClick={() => setSelectedFilm(film)}
                            className="group cursor-pointer space-y-3"
                        >
                            <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/5 transition-all duration-500 group-hover:scale-[1.03] group-hover:border-red-600/50 shadow-xl">
                                <img src={film.posterUrl} alt={film.title} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-white text-black font-black px-4 py-2 rounded-full text-xs uppercase tracking-widest shadow-2xl">Screen Film</div>
                                </div>
                            </div>
                            <div className="px-1">
                                <h4 className="text-white font-bold text-sm truncate">{film.title}</h4>
                                <p className="text-gray-500 text-[10px] uppercase font-black tracking-tighter">{film.director}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-24 text-center">
                            <p className="text-gray-600 font-bold uppercase tracking-[0.5em]">No Pending Submissions for Review</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default JuryPortal;
