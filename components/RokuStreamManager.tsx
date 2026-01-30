
import React, { useState } from 'react';
import { Movie } from '../types';

interface RokuStreamManagerProps {
    allMovies: Movie[];
    onSave: (movie: Movie) => Promise<void>;
}

const RokuStreamManager: React.FC<RokuStreamManagerProps> = ({ allMovies, onSave }) => {
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [streamUrl, setStreamUrl] = useState('');

    const handleOpenEditor = (movie: Movie) => {
        setSelectedMovie(movie);
        setStreamUrl(movie.rokuStreamUrl || '');
    };

    const handleCommit = async () => {
        if (!selectedMovie) return;
        setIsSaving(true);
        try {
            await onSave({ ...selectedMovie, rokuStreamUrl: streamUrl.trim() });
            setSelectedMovie(null);
            alert("Optimization manifest synced to Roku feed.");
        } catch (e) {
            alert("Handshake failure.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-cyan-500/20 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="relative z-10 max-w-4xl space-y-6">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#06b6d4]"></span>
                        <p className="text-cyan-500 font-black uppercase tracking-[0.5em] text-[10px]">Big Screen Encoding Engine</p>
                    </div>
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">Compatibility.</h2>
                    <p className="text-xl text-gray-400 font-medium leading-relaxed">
                        If a film fails to play on hardware due to encoding (mismatched profiles), provide a <span className="text-white">Roku-Optimized Link</span> here. Usually an HLS (.m3u8) or standard MP4.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allMovies.sort((a, b) => a.title.localeCompare(b.title)).map(movie => (
                    <div 
                        key={movie.key} 
                        className={`bg-[#0f0f0f] border rounded-3xl p-6 transition-all hover:bg-white/[0.02] flex items-center justify-between ${movie.rokuStreamUrl ? 'border-cyan-500/30 bg-cyan-600/5' : 'border-white/5'}`}
                    >
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800 shadow-lg">
                                <img src={movie.poster} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-sm font-black text-white uppercase truncate">{movie.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${movie.rokuStreamUrl ? 'bg-cyan-500' : 'bg-gray-700'}`}></span>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                                        {movie.rokuStreamUrl ? 'Optimized Link Active' : 'Using Web Default'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleOpenEditor(movie)}
                            className="bg-white/5 hover:bg-white text-gray-500 hover:text-black font-black px-4 py-2 rounded-xl text-[9px] uppercase tracking-widest transition-all"
                        >
                            Configure
                        </button>
                    </div>
                ))}
            </div>

            {selectedMovie && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[200] p-4" onClick={() => setSelectedMovie(null)}>
                    <div className="bg-[#111] border border-white/10 rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Optimization Hub</h3>
                                <p className="text-[10px] text-cyan-500 font-black uppercase tracking-widest mt-1">Target Node: {selectedMovie.title}</p>
                            </div>
                            <button onClick={() => setSelectedMovie(null)} className="p-2 hover:bg-white/5 rounded-full text-gray-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 block">Roku-Specific Stream URL</label>
                                <input 
                                    type="text" 
                                    value={streamUrl}
                                    onChange={e => setStreamUrl(e.target.value)}
                                    placeholder="https://.../roku_optimized.m3u8"
                                    className="form-input !bg-black/40 border-white/10 text-xs font-mono"
                                />
                                <p className="text-[9px] text-gray-600 uppercase font-bold italic">Leave blank to use the standard web master file.</p>
                            </div>

                            <button 
                                onClick={handleCommit}
                                disabled={isSaving}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest shadow-xl transition-all disabled:opacity-20"
                            >
                                {isSaving ? 'Syncing...' : 'Authorize Optimized Link'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RokuStreamManager;
