
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
            alert("Roku Optimization Manifest Synced.");
        } catch (e) {
            alert("Handshake failure.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-cyan-500/20 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                    <svg className="w-48 h-48 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div className="relative z-10 max-w-4xl space-y-6">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#06b6d4]"></span>
                        <p className="text-cyan-500 font-black uppercase tracking-[0.5em] text-[10px]">Hardware Optimization Core</p>
                    </div>
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">Roku Compatibility.</h2>
                    <p className="text-xl text-gray-400 font-medium leading-relaxed">
                        Roku hardware requires specific encoding levels. Use this terminal to provide <span className="text-white">optimized links</span> (HLS .m3u8 or compatible MP4) that bypass standard web assets.
                    </p>
                    
                    <div className="bg-black/60 p-5 rounded-2xl border border-white/5 space-y-3">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Transcoding Standard (FFmpeg)</p>
                        <code className="block text-[10px] text-cyan-400 font-mono break-all bg-black p-3 rounded-lg border border-cyan-950 select-all cursor-pointer" onClick={() => { navigator.clipboard.writeText('ffmpeg -i in.mp4 -c:v libx264 -profile:v high -level:4.1 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k out.mp4'); alert('Copied'); }}>
                            ffmpeg -i in.mp4 -c:v libx264 -profile:v high -level:4.1 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k out.mp4
                        </code>
                    </div>
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
                                    <span className={`w-1.5 h-1.5 rounded-full ${movie.rokuStreamUrl ? 'bg-cyan-500 shadow-[0_0_5px_cyan]' : 'bg-gray-700'}`}></span>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                                        {movie.rokuStreamUrl ? 'Optimized' : 'Web Default'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleOpenEditor(movie)}
                            className="bg-white/5 hover:bg-white text-gray-500 hover:text-black font-black px-4 py-2 rounded-xl text-[9px] uppercase tracking-widest transition-all"
                        >
                            Override
                        </button>
                    </div>
                ))}
            </div>

            {selectedMovie && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={() => setSelectedMovie(null)}>
                    <div className="bg-[#111] border border-white/10 rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Hardware Payload</h3>
                                <p className="text-[10px] text-cyan-500 font-black uppercase tracking-widest mt-1">Target: {selectedMovie.title}</p>
                            </div>
                            <button onClick={() => setSelectedMovie(null)} className="p-2 hover:bg-white/5 rounded-full text-gray-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 block">Roku Optimized Stream URL</label>
                                <input 
                                    type="text" 
                                    value={streamUrl}
                                    onChange={e => setStreamUrl(e.target.value)}
                                    placeholder="https://.../roku_master.m3u8"
                                    className="form-input !bg-black/40 border-white/10 text-xs font-mono text-cyan-400"
                                />
                                <div className="bg-cyan-600/10 p-4 rounded-xl border border-cyan-500/20">
                                    <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest leading-relaxed">
                                        SYSTEM ADVISORY: Providing a URL here forces the Roku Channel to use this link instead of the primary AWS S3 master. Recommended for HLS segmented streams.
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={handleCommit}
                                disabled={isSaving}
                                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-sm shadow-xl transition-all disabled:opacity-20"
                            >
                                {isSaving ? 'Synchronizing...' : 'Authorize Optimized Link'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RokuStreamManager;
