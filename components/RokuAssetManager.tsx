
import React, { useState, useEffect, useMemo } from 'react';
import { Movie, RokuAsset } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import PublicS3Uploader from './PublicS3Uploader';
import LoadingSpinner from './LoadingSpinner';
import firebase from 'firebase/compat/app';

interface RokuAssetManagerProps {
    allMovies: Movie[];
}

const ImageTester: React.FC<{ url: string; onResult: (ok: boolean) => void }> = ({ url, onResult }) => {
    useEffect(() => {
        if (!url) { onResult(false); return; }
        const img = new Image();
        img.onload = () => onResult(true);
        img.onerror = () => onResult(false);
        img.src = url;
    }, [url]);
    return null;
};

const RokuAssetManager: React.FC<RokuAssetManagerProps> = ({ allMovies }) => {
    const [assets, setAssets] = useState<Record<string, RokuAsset>>({});
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [healthStatus, setHealthStatus] = useState<Record<string, boolean>>({});
    
    // Editor State
    const [tempAsset, setTempAsset] = useState<Partial<RokuAsset>>({});

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const unsub = db.collection('roku_assets').onSnapshot(snap => {
            const fetched: Record<string, RokuAsset> = {};
            snap.forEach(doc => { fetched[doc.id] = doc.data() as RokuAsset; });
            setAssets(fetched);
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    const handleOpenEditor = (movie: Movie) => {
        setSelectedMovie(movie);
        setTempAsset(assets[movie.key] || { movieKey: movie.key, heroImage: '', tvPoster: '', rokuStreamUrl: '' });
    };

    const handleCommit = async () => {
        if (!selectedMovie) return;
        setIsSaving(true);
        const db = getDbInstance();
        if (!db) return;

        try {
            await db.collection('roku_assets').doc(selectedMovie.key).set({
                ...tempAsset,
                movieKey: selectedMovie.key,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            await db.collection('roku').doc('config').update({ _version: firebase.firestore.FieldValue.increment(1) });
            setSelectedMovie(null);
            alert("Elite assets synchronized.");
        } catch (e) { alert("Sync Failure."); } finally { setIsSaving(false); }
    };

    const brokenCount = useMemo(() => Object.values(healthStatus).filter(v => v === false).length, [healthStatus]);

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-purple-500/20 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="relative z-10 max-w-4xl space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-red-600/10 px-3 py-1 rounded-full border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                            <p className="text-red-500 font-black uppercase text-[8px] tracking-widest">{brokenCount} Broken Posters Flagged</p>
                        </div>
                    </div>
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">Asset Forge.</h2>
                    <p className="text-xl text-gray-400 font-medium leading-relaxed">
                        Solve hardware playback issues with <span className="text-white">Stream Overrides</span> or fix broken art by providing verified TV posters.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {allMovies.sort((a, b) => a.title.localeCompare(b.title)).map(movie => {
                    const asset = assets[movie.key];
                    const posterUrl = asset?.tvPoster || movie.poster;
                    return (
                        <div 
                            key={movie.key} 
                            onClick={() => handleOpenEditor(movie)}
                            className={`bg-[#0f0f0f] border rounded-[2rem] p-3 transition-all cursor-pointer group hover:scale-[1.03] ${healthStatus[movie.key] === false ? 'border-red-600 ring-4 ring-red-600/10' : asset ? 'border-purple-600 ring-4 ring-purple-600/10' : 'border-white/5'}`}
                        >
                            <ImageTester url={posterUrl} onResult={(ok) => setHealthStatus(prev => ({...prev, [movie.key]: ok}))} />
                            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-4 bg-black border border-white/5">
                                <img src={posterUrl} className={`w-full h-full object-cover ${healthStatus[movie.key] === false ? 'blur-sm grayscale' : ''}`} alt="" />
                                {healthStatus[movie.key] === false && (
                                    <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center p-4 text-center">
                                        <p className="text-[10px] font-black text-white uppercase drop-shadow-lg">Link Corrupted</p>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white bg-purple-600 px-3 py-1 rounded-full shadow-xl">Configure</span>
                                </div>
                            </div>
                            <p className="text-[10px] font-black uppercase text-white truncate text-center px-1">{movie.title}</p>
                        </div>
                    );
                })}
            </div>

            {selectedMovie && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[200] p-4" onClick={() => setSelectedMovie(null)}>
                    <div className="bg-[#111] border border-white/10 rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-[ticketEntry_0.4s_ease-out]" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Fix Narrative Art: {selectedMovie.title}</h3>
                                <p className="text-[10px] text-purple-500 font-black uppercase tracking-widest mt-1">Status: {healthStatus[selectedMovie.key] === false ? 'CRITICAL_FIX_REQUIRED' : 'NOMINAL'}</p>
                            </div>
                            <button onClick={() => setSelectedMovie(null)} className="p-2 hover:bg-white/5 rounded-full text-gray-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">TV Poster Target (2:3)</label>
                                    <div className="w-48 aspect-[2/3] bg-black border border-white/10 rounded-2xl overflow-hidden shadow-inner relative group mx-auto">
                                        <img src={tempAsset.tvPoster || selectedMovie.poster} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <PublicS3Uploader label="Upload Corrected Poster" onUploadSuccess={(url) => setTempAsset({...tempAsset, tvPoster: url})} />
                                </div>
                            </div>

                            <div className="space-y-8 bg-black/40 p-8 rounded-[2rem] border border-white/5">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></span>
                                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500">HLS Optimization Link</label>
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium">Solving buffering or playback failure for hardware nodes.</p>
                                    <input 
                                        type="text"
                                        value={tempAsset.rokuStreamUrl || ''}
                                        onChange={e => setTempAsset({...tempAsset, rokuStreamUrl: e.target.value})}
                                        placeholder="https://.../hls_master.m3u8"
                                        className="form-input !bg-black border-white/10 font-mono text-[10px] text-cyan-400"
                                    />
                                </div>

                                <div className="pt-8 border-t border-white/5">
                                    <button 
                                        onClick={handleCommit}
                                        disabled={isSaving}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl transition-all disabled:opacity-20"
                                    >
                                        {isSaving ? 'Syncing Node...' : 'Authorize Forge Patch'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RokuAssetManager;
