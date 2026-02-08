
import React, { useState, useEffect } from 'react';
import { Movie, Actor, MoviePipelineEntry } from '../types';
import S3Uploader from './S3Uploader';

interface MovieEditorProps {
    allMovies: Record<string, Movie>;
    onRefresh: () => void;
    onSave: (movieData: Record<string, Movie>) => Promise<void>;
    onDeleteMovie: (movieKey: string) => Promise<void>;
    onSetNowStreaming: (movieKey: string) => Promise<void>;
    movieToCreate?: MoviePipelineEntry | null;
    onCreationDone?: () => void;
}

const emptyMovie: Movie = {
    key: `movie_${Date.now()}`,
    title: '',
    synopsis: '',
    cast: [],
    director: '',
    producers: '',
    trailer: '',
    fullMovie: '',
    rokuStreamUrl: '',
    poster: '',
    tvPoster: '',
    likes: 0,
    rating: 0,
    releaseDateTime: '',
    publishedAt: new Date().toISOString(),
    autoReleaseDate: '',
    mainPageExpiry: '',
    isUnlisted: false,
    isSeries: false,
    isEpisode: false,
    episodes: [],
    durationInMinutes: 0,
    hasCopyrightMusic: false,
    isSupportEnabled: true,
    isWatchPartyEnabled: false,
    watchPartyStartTime: '',
    isWatchPartyPaid: false,
    watchPartyPrice: 5.00,
    isForSale: false,
    salePrice: 5.00,
    isLiveStream: false,
    liveStreamEmbed: ''
};

const ActorEditorModal: React.FC<{ actor: Actor, onSave: (updated: Actor) => void, onClose: () => void }> = ({ actor, onSave, onClose }) => {
    const [editActor, setEditActor] = useState<Actor>({ ...actor });

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#111] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Edit Actor Profile</h3>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">{editActor.name}</p>
                    </div>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <label className="form-label">Professional Biography</label>
                        <textarea 
                            value={editActor.bio} 
                            onChange={e => setEditActor({...editActor, bio: e.target.value})}
                            className="form-input bg-black/40 border-white/10 h-40 text-sm leading-relaxed"
                            placeholder="Write the actor's bio here..."
                        />
                    </div>
                    <div className="space-y-4">
                        <label className="form-label">Headshot URL (AWS S3)</label>
                        <input 
                            type="text" 
                            value={editActor.photo} 
                            onChange={e => setEditActor({...editActor, photo: e.target.value, highResPhoto: e.target.value})}
                            className="form-input bg-black/40 border-white/10 text-xs font-mono"
                        />
                        <S3Uploader label="Upload New Headshot" onUploadSuccess={(url) => setEditActor({...editActor, photo: url, highResPhoto: url})} />
                    </div>
                </div>
                <div className="p-8 border-t border-white/5 flex gap-4 bg-black/40">
                    <button onClick={onClose} className="flex-1 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Discard</button>
                    <button onClick={() => onSave(editActor)} className="flex-[2] bg-white text-black font-black py-4 rounded-xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-gray-200 transition-all">Save Profile</button>
                </div>
            </div>
        </div>
    );
};

const MovieEditor: React.FC<MovieEditorProps> = ({ 
    allMovies, 
    onSave, 
    onDeleteMovie, 
    onSetNowStreaming,
    movieToCreate, 
    onCreationDone 
}) => {
    const [selectedMovieKey, setSelectedMovieKey] = useState<string>('');
    const [formData, setFormData] = useState<Movie | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newActorName, setNewActorName] = useState('');
    const [editingActorIdx, setEditingActorIdx] = useState<number | null>(null);
    
    // Roku Probe State
    const [isProbing, setIsProbing] = useState(false);
    const [probeResult, setProbeResult] = useState<any>(null);

    useEffect(() => {
        if (movieToCreate) {
            const newKey = `movie_${Date.now()}`;
            setFormData({
                ...emptyMovie,
                key: newKey,
                title: movieToCreate.title,
                synopsis: movieToCreate.synopsis,
                director: movieToCreate.director,
                fullMovie: movieToCreate.movieUrl,
                poster: movieToCreate.posterUrl,
                tvPoster: movieToCreate.posterUrl,
                isSupportEnabled: true,
                publishedAt: new Date().toISOString(),
                cast: movieToCreate.cast ? movieToCreate.cast.split(',').map(name => ({
                    name: name.trim(),
                    bio: 'Biographical data pending.',
                    photo: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png',
                    highResPhoto: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png'
                })) : []
            });
            setSelectedMovieKey(newKey);
            onCreationDone?.();
        }
    }, [movieToCreate, onCreationDone]);

    useEffect(() => {
        if (selectedMovieKey) {
            const movieData = allMovies[selectedMovieKey];
            if (movieData) setFormData({ ...movieData });
            else if (selectedMovieKey.startsWith('movie_')) setFormData({ ...emptyMovie, key: selectedMovieKey });
            setProbeResult(null);
        } else setFormData(null);
    }, [selectedMovieKey, allMovies]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!formData) return;
        const target = e.target as HTMLInputElement;
        const { name, value, type } = target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? target.checked : (type === 'number' ? parseFloat(value) : value) });
    };

    const handleAddActor = () => {
        if (!formData || !newActorName.trim()) return;
        const actor: Actor = {
            name: newActorName.trim(),
            photo: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png',
            bio: 'Biographical data pending.',
            highResPhoto: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png'
        };
        setFormData({ ...formData, cast: [...formData.cast, actor] });
        setNewActorName('');
    };

    const handleUpdateActor = (idx: number, updatedActor: Actor) => {
        if (!formData) return;
        const nextCast = [...formData.cast];
        nextCast[idx] = updatedActor;
        setFormData({ ...formData, cast: nextCast });
        setEditingActorIdx(null);
    };

    const handleRemoveActor = (index: number) => {
        if (!formData) return;
        const nextCast = [...formData.cast];
        nextCast.splice(index, 1);
        setFormData({ ...formData, cast: nextCast });
    };

    const handleRunProbe = async (url: string) => {
        if (!url) return;
        setIsProbing(true);
        setProbeResult(null);
        try {
            const res = await fetch('/api/probe-roku-compatibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    url, 
                    password: sessionStorage.getItem('adminPassword') 
                })
            });
            const data = await res.json();
            setProbeResult(data);
        } catch (e) {
            alert("Probe Failed. Check CORS settings.");
        } finally {
            setIsProbing(false);
        }
    };

    const handleSave = async () => {
        if (!formData) return;
        setIsSaving(true);
        try {
            await onSave({ [formData.key]: formData });
            setSelectedMovieKey('');
        } catch (err) {
            alert("Save failed.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!formData || isDeleting) return;
        if (!window.confirm(`PURGE RECORD: Irreversibly erase "${formData.title}" from the global catalog?`)) return;
        
        setIsDeleting(true);
        try {
            await onDeleteMovie(formData.key);
            setSelectedMovieKey('');
            setFormData(null);
        } catch (err) {
            alert("Delete sequence failed.");
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(m => (m.title || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    const isSavedRecord = formData && allMovies[formData.key] !== undefined;

    return (
        <div className="space-y-6 pb-20">
            {!formData ? (
                <div className="bg-[#0f0f0f] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-8 bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Catalog Records</h3>
                            <span className="bg-red-600/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{Object.keys(allMovies).length} Films Total</span>
                        </div>
                        <div className="flex gap-3">
                            <input type="text" placeholder="Filter..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="form-input !py-3 text-xs bg-black/40 border-white/10" />
                            <button onClick={() => setSelectedMovieKey(`movie_${Date.now()}`)} className="bg-red-600 text-white font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest">+ New Entry</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-white/5">
                                {filteredMovies.map(movie => (
                                    <tr key={movie.key} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 shadow-2xl">
                                                    <img src={movie.poster || 'https://via.placeholder.com/100x150'} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div>
                                                    <span className="font-black text-white uppercase text-lg tracking-tighter">{movie.title || 'Untitled'}</span>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-tighter">Dir. {movie.director}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <button onClick={() => setSelectedMovieKey(movie.key)} className="text-white bg-white/5 hover:bg-red-600 font-black text-[9px] uppercase px-6 py-3 rounded-xl border border-white/5 transition-all">Edit Manifest</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-[#0f0f0f] rounded-[2.5rem] border border-white/5 p-8 md:p-12 space-y-12 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-10 gap-6">
                        <div>
                            <h3 className="text-4xl font-black text-white uppercase tracking-tighter">{formData.title || 'Draft Master'}</h3>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.4em] mt-2">UUID: {formData.key}</p>
                        </div>
                        <div className="flex gap-4">
                            {isSavedRecord && (
                                <button onClick={handleDelete} disabled={isDeleting} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-6 py-3 rounded-xl uppercase text-[10px] font-black border border-red-500/20 transition-all">
                                    {isDeleting ? 'Purging...' : 'Purge Record'}
                                </button>
                            )}
                            <button onClick={() => setSelectedMovieKey('')} className="bg-white/5 text-gray-400 px-6 py-3 rounded-xl uppercase text-[10px] font-black">Close</button>
                            <button onClick={handleSave} disabled={isSaving} className="bg-white text-black px-8 py-3 rounded-xl uppercase text-[10px] font-black shadow-xl hover:bg-gray-200 transition-all">{isSaving ? 'Syncing...' : 'Push Global Manifest'}</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div className="space-y-12">
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">01. Master Metadata</h4>
                                <div className="space-y-4">
                                    <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Film/Series Title" className="form-input bg-black/40" />
                                    <input type="text" name="director" value={formData.director} onChange={handleChange} placeholder="Director(s)" className="form-input bg-black/40" />
                                    <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={4} placeholder="Synopsis Treatment" className="form-input bg-black/40" />
                                    
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-white uppercase tracking-widest">Episodic Series</p>
                                            <p className="text-[9px] text-gray-500 uppercase">Enable episodic navigation for this node</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="isSeries" checked={formData.isSeries} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-red-600 transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                        </label>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">02. Verified Cast Manifest</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={newActorName} 
                                            onChange={e => setNewActorName(e.target.value)} 
                                            placeholder="Actor name..." 
                                            className="form-input bg-black/40 flex-grow"
                                            onKeyDown={e => e.key === 'Enter' && handleAddActor()}
                                        />
                                        <button 
                                            onClick={handleAddActor}
                                            className="bg-white text-black font-black px-6 rounded-xl uppercase text-[10px] tracking-widest"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {formData.cast.map((actor, idx) => (
                                            <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between group/actor">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                                                        <img src={actor.photo} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-xs font-black text-white uppercase truncate block">{actor.name}</span>
                                                        <p className="text-[8px] text-gray-500 uppercase truncate">Bio: {actor.bio ? 'Synced' : 'Missing'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => setEditingActorIdx(idx)}
                                                        className="text-white/40 hover:text-white transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleRemoveActor(idx)} className="text-red-500 font-black hover:text-red-400">×</button>
                                                </div>
                                            </div>
                                        ))}
                                        {formData.cast.length === 0 && <p className="col-span-2 text-[9px] text-gray-700 uppercase font-black italic text-center py-4">No actors assigned</p>}
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="space-y-12">
                             <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">03. High-Bitrate Assets</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="space-y-4">
                                        <label className="form-label">Primary Master URL (AWS S3)</label>
                                        <div className="flex gap-2">
                                            <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} className="form-input bg-black/40 flex-grow text-xs font-mono" placeholder="https://..." />
                                            <button 
                                                onClick={() => handleRunProbe(formData.fullMovie)}
                                                disabled={isProbing || !formData.fullMovie}
                                                className="bg-red-600 text-white font-black px-6 rounded-2xl uppercase text-[10px] tracking-widest disabled:opacity-30"
                                            >
                                                {isProbing ? '...' : 'Probe'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_cyan]"></span>
                                            <label className="form-label !text-cyan-500">Roku Optimized Override (HLS/MP4)</label>
                                        </div>
                                        <input 
                                            type="text" 
                                            name="rokuStreamUrl" 
                                            value={formData.rokuStreamUrl || ''} 
                                            onChange={handleChange} 
                                            className="form-input bg-black/60 border-cyan-500/20 text-xs font-mono text-cyan-400" 
                                            placeholder="Optional: Hardware-specific link" 
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <label className="form-label">Poster URL (2:3)</label>
                                            <input type="text" name="poster" value={formData.poster} onChange={handleChange} className="form-input bg-black/40 text-[10px] font-mono" />
                                            <S3Uploader label="Ingest Art" onUploadSuccess={(url) => setFormData({...formData, poster: url, tvPoster: url})} />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="form-label">Teaser/Teaser (URL)</label>
                                            <input type="text" name="trailer" value={formData.trailer} onChange={handleChange} className="form-input bg-black/40 text-[10px] font-mono" />
                                            <S3Uploader label="Ingest Teaser" onUploadSuccess={(url) => setFormData({...formData, trailer: url})} />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">04. Access & Monetization</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                                <span className="text-[10px] font-black uppercase text-gray-300">VOD Paywall</span>
                                                <input type="checkbox" name="isForSale" checked={formData.isForSale} onChange={handleChange} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-red-600 focus:ring-red-500" />
                                            </div>
                                            {formData.isForSale && (
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                                    <input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange} className="form-input !pl-8 bg-black/40" step="0.01" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                                <span className="text-[10px] font-black uppercase text-gray-300">Creator Support</span>
                                                <input type="checkbox" name="isSupportEnabled" checked={formData.isSupportEnabled} onChange={handleChange} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-emerald-600 focus:ring-emerald-500" />
                                            </div>
                                            <p className="text-[8px] text-gray-600 uppercase px-2 font-bold">Enables community tips/donations</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500">05. Live Broadcast Relay</h4>
                                <div className="bg-indigo-900/5 border border-indigo-500/20 p-8 rounded-3xl space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-white uppercase tracking-widest">Enable Live Mode</p>
                                            <p className="text-[9px] text-gray-500 uppercase">Use external URL for Watch Parties (Bypasses S3 file)</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="isLiveStream" checked={formData.isLiveStream} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                        </label>
                                    </div>
                                    
                                    {formData.isLiveStream && (
                                        <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                                            <label className="form-label">Live Relay URL (YouTube / Restream / Vimeo)</label>
                                            <input 
                                                type="text" 
                                                name="liveStreamEmbed" 
                                                value={formData.liveStreamEmbed} 
                                                onChange={handleChange} 
                                                className="form-input bg-black/40 border-indigo-500/30 text-xs font-mono" 
                                                placeholder="e.g. https://restream.io/player/..." 
                                            />
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-6">
                        <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-black py-6 px-24 rounded-[2rem] uppercase tracking-[0.3em] shadow-[0_30px_60px_rgba(239,68,68,0.3)] transition-all transform active:scale-95 disabled:opacity-20 text-sm">
                            {isSaving ? 'Synchronizing Cluster...' : 'Push Global Manifest'}
                        </button>
                    </div>
                </div>
            )}
            
            {editingActorIdx !== null && formData && (
                <ActorEditorModal 
                    actor={formData.cast[editingActorIdx]} 
                    onClose={() => setEditingActorIdx(null)}
                    onSave={(updated) => handleUpdateActor(editingActorIdx, updated)}
                />
            )}
        </div>
    );
};

export default MovieEditor;
