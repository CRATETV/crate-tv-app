
import React, { useState } from 'react';
import { Movie } from '../types';
import PublicS3Uploader from './PublicS3Uploader';

interface HeroImageManagerProps {
    allMovies: Movie[];
    onSave: (movie: Movie) => Promise<void>;
}

const HeroImageManager: React.FC<HeroImageManagerProps> = ({ allMovies, onSave }) => {
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleUploadSuccess = async (url: string) => {
        if (!selectedMovie) return;
        setIsSaving(true);
        try {
            await onSave({ ...selectedMovie, rokuHeroImage: url });
            setSelectedMovie(null);
            alert("Roku landscape asset synchronized.");
        } catch (e) {
            alert("Asset sync failure.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-10">
            <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                <div className="relative z-10 max-w-4xl space-y-6">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_#a855f7]"></span>
                        <p className="text-purple-500 font-black uppercase tracking-[0.5em] text-[10px]">High-Fidelity Asset Pipeline</p>
                    </div>
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">Hero Assets.</h2>
                    <p className="text-xl text-gray-400 font-medium leading-relaxed">
                        Configure the immersive landscape art for the Roku home screen. Standards: <span className="text-white">1920x600 px</span>. If no asset is provided, Crate will generate a <span className="text-purple-400">Cinematic Blur</span> fallback.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {allMovies.sort((a, b) => a.title.localeCompare(b.title)).map(movie => (
                    <div 
                        key={movie.key} 
                        onClick={() => setSelectedMovie(movie)}
                        className={`bg-[#0f0f0f] border rounded-[2rem] p-3 transition-all cursor-pointer group hover:scale-[1.03] ${selectedMovie?.key === movie.key ? 'border-purple-600 ring-4 ring-purple-600/10' : 'border-white/5'}`}
                    >
                        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-4 bg-black border border-white/5">
                            {movie.rokuHeroImage ? (
                                <img src={movie.rokuHeroImage} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full relative">
                                    <img src={movie.poster} className="w-full h-full object-cover blur-md scale-125 opacity-40" alt="" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-[6px] font-black text-gray-700 uppercase tracking-widest bg-black/40 px-2 py-1 rounded">Fallback Active</span>
                                    </div>
                                </div>
                            )}
                            
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[9px] font-black uppercase tracking-widest text-white bg-purple-600 px-3 py-1 rounded-full shadow-xl">Manage Art</span>
                            </div>
                            
                            {movie.rokuHeroImage && (
                                <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-lg">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] font-black uppercase text-white truncate text-center px-1">{movie.title}</p>
                    </div>
                ))}
            </div>

            {selectedMovie && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={() => setSelectedMovie(null)}>
                    <div className="bg-[#111] border border-white/10 rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">{selectedMovie.title} // Asset Uplink</h3>
                                <p className="text-[10px] text-purple-500 font-black uppercase tracking-widest mt-1">Target Dimension: 1920 x 600 px</p>
                            </div>
                            <button onClick={() => setSelectedMovie(null)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-10 space-y-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 block">Current Hero Manifest</label>
                                <div className="aspect-[1920/600] bg-black border border-white/10 rounded-2xl overflow-hidden shadow-inner relative">
                                    {selectedMovie.rokuHeroImage ? (
                                        <img src={selectedMovie.rokuHeroImage} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full relative">
                                            <img src={selectedMovie.poster} className="w-full h-full object-cover blur-2xl scale-125 opacity-30" alt="" />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                                <div className="w-32 aspect-[2/3] rounded-lg border-2 border-white/10 overflow-hidden mb-4 shadow-2xl">
                                                    <img src={selectedMovie.poster} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <p className="text-xs font-black uppercase tracking-widest text-purple-400">Dynamic Fallback Generated</p>
                                                <p className="text-[9px] text-gray-600 mt-1 uppercase">Standard Blur/Zoom Logic Applied</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-purple-900/10 border border-purple-500/20 p-6 rounded-2xl flex items-center gap-6">
                                <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-400 flex-shrink-0">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                </div>
                                <div className="flex-grow">
                                    <p className="text-xs font-bold text-white uppercase">Upload Custom Art</p>
                                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">System will prioritize custom uploads over automated fallbacks.</p>
                                </div>
                                <div className="w-64">
                                    <PublicS3Uploader label="Select File" onUploadSuccess={handleUploadSuccess} />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-black/40 border-t border-white/5 flex justify-between items-center">
                            <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">Authorized Asset Forge // Node: {selectedMovie.key}</p>
                            <button onClick={() => setSelectedMovie(null)} className="bg-white/5 hover:bg-white text-gray-500 hover:text-black font-black px-8 py-3 rounded-xl uppercase tracking-widest text-[9px] border border-white/5 transition-all">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeroImageManager;
