
import React, { useState, useEffect } from 'react';
import { Movie, RokuAsset } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import PublicS3Uploader from './PublicS3Uploader';
import LoadingSpinner from './LoadingSpinner';
import firebase from 'firebase/compat/app';

interface RokuAssetManagerProps {
    allMovies: Movie[];
}

const RokuAssetManager: React.FC<RokuAssetManagerProps> = ({ allMovies }) => {
    const [assets, setAssets] = useState<Record<string, RokuAsset>>({});
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
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
            
            // Increment version in main config to trigger feed refresh
            await db.collection('roku').doc('config').update({ _version: firebase.firestore.FieldValue.increment(1) });
            
            setSelectedMovie(null);
            alert("Elite assets synchronized.");
        } catch (e) {
            alert("Sync Failure.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-purple-500/20 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="relative z-10 max-w-4xl space-y-6">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_#a855f7]"></span>
                        <p className="text-purple-500 font-black uppercase tracking-[0.5em] text-[10px]">High-Fidelity Asset Hub</p>
                    </div>
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">Visual Overrides.</h2>
                    <p className="text-xl text-gray-400 font-medium leading-relaxed">
                        Configure <span className="text-white">Roku-Specific Assets</span> and optimized <span className="text-cyan-400">Stream Links</span>. Use this to solve hardware encoding issues or provide 4K landscape art.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {allMovies.sort((a, b) => a.title.localeCompare(b.title)).map(movie => {
                    const asset = assets[movie.key];
                    return (
                        <div 
                            key={movie.key} 
                            onClick={() => handleOpenEditor(movie)}
                            className={`bg-[#0f0f0f] border rounded-[2rem] p-3 transition-all cursor-pointer group hover:scale-[1.03] ${asset ? 'border-purple-600 ring-4 ring-purple-600/10' : 'border-white/5'}`}
                        >
                            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-4 bg-black border border-white/5">
                                <img src={asset?.heroImage || movie.poster} className={`w-full h-full object-cover ${!asset?.heroImage ? 'blur-md opacity-30 scale-125' : ''}`} alt="" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white bg-purple-600 px-3 py-1 rounded-full shadow-xl">Configure Node</span>
                                </div>
                                {asset?.rokuStreamUrl && (
                                    <div className="absolute top-2 left-2 bg-cyan-500 text-white p-1 rounded-full shadow-lg">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] font-black uppercase text-white truncate text-center px-1">{movie.title}</p>
                        </div>
                    );
                })}
            </div>

            {selectedMovie && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[200] p-4" onClick={() => setSelectedMovie(null)}>
                    <div className="bg-[#111] border border-white/10 rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-[ticketEntry_0.4s_ease-out]" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Asset Forge: {selectedMovie.title}</h3>
                                <p className="text-[10px] text-purple-500 font-black uppercase tracking-widest mt-1">Terminal Node ID: {selectedMovie.key}</p>
                            </div>
                            <button onClick={() => setSelectedMovie(null)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Big Screen Art (1920x600)</label>
                                    <div className="aspect-[1920/600] bg-black border border-white/10 rounded-2xl overflow-hidden shadow-inner relative group">
                                        <img src={tempAsset.heroImage || selectedMovie.poster} className={`w-full h-full object-cover ${!tempAsset.heroImage ? 'blur-xl opacity-30' : ''}`} alt="" />
                                        {!tempAsset.heroImage && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Awaiting Manifest Uplink</p>
                                            </div>
                                        )}
                                    </div>
                                    <PublicS3Uploader label="Ingest High-Res Landscape" onUploadSuccess={(url) => setTempAsset({...tempAsset, heroImage: url})} />
                                </div>
                                
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">TV Poster Override (Optional)</label>
                                    <div className="flex gap-6 items-center">
                                        <div className="w-24 aspect-[2/3] bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                            <img src={tempAsset.tvPoster || selectedMovie.poster} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div className="flex-grow">
                                            <PublicS3Uploader label="Upload TV Poster" onUploadSuccess={(url) => setTempAsset({...tempAsset, tvPoster: url})} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8 bg-black/40 p-8 rounded-[2rem] border border-white/5">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></span>
                                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500">Roku Encoding Override</label>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed font-medium">If the standard master file fails on hardware, provide a Roku-safe HLS (.m3u8) or standard MP4 link below.</p>
                                    <input 
                                        type="text"
                                        value={tempAsset.rokuStreamUrl || ''}
                                        onChange={e => setTempAsset({...tempAsset, rokuStreamUrl: e.target.value})}
                                        placeholder="https://.../roku_safe_stream.m3u8"
                                        className="form-input !bg-black border-white/10 font-mono text-[10px] text-cyan-400"
                                    />
                                    <p className="text-[9px] text-gray-700 font-bold uppercase">Web catalog will continue to use original master file.</p>
                                </div>

                                <div className="pt-8 border-t border-white/5">
                                    <button 
                                        onClick={handleCommit}
                                        disabled={isSaving}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 disabled:opacity-20"
                                    >
                                        {isSaving ? 'Syncing Node...' : 'Commit Visual Manifest'}
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
