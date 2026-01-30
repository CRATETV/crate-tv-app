
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
    const [isSettingSpotlight, setIsSettingSpotlight] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
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
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">02. Hardware Pre-Flight</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} className="form-input bg-black/40 flex-grow" placeholder="Master File URL (MP4/HLS)" />
                                            <button 
                                                onClick={() => handleRunProbe(formData.fullMovie)}
                                                disabled={isProbing || !formData.fullMovie}
                                                className="bg-red-600 text-white font-black px-6 rounded-2xl uppercase text-[10px] tracking-widest disabled:opacity-30"
                                            >
                                                {isProbing ? 'Probing...' : 'Check Roku'}
                                            </button>
                                        </div>
                                        
                                        {probeResult && (
                                            <div className={`p-4 rounded-xl border transition-all animate-[fadeIn_0.3s_ease-out] ${probeResult.status === 'OPTIMAL' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-600/10 border-red-500/20'}`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${probeResult.status === 'OPTIMAL' ? 'text-green-500' : 'text-red-500'}`}>
                                                        {probeResult.status} Affinity: {probeResult.score}%
                                                    </span>
                                                </div>
                                                {probeResult.findings.map((f: string, i: number) => (
                                                    <p key={i} className="text-[10px] text-gray-400 italic">! {f}</p>
                                                ))}
                                                {probeResult.ffmpegHint && (
                                                    <div className="mt-3">
                                                        <p className="text-[8px] font-black text-gray-600 uppercase mb-1">Recommended Correction:</p>
                                                        <code className="block bg-black p-2 rounded text-[9px] text-red-400 overflow-x-auto select-all">{probeResult.ffmpegHint}</code>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 bg-purple-600/5 border border-purple-500/20 rounded-2xl">
                                        <label className="form-label !text-purple-500">Roku Specific Override (HLS Recommended)</label>
                                        <input 
                                            type="text" 
                                            name="rokuStreamUrl" 
                                            value={formData.rokuStreamUrl || ''} 
                                            onChange={handleChange} 
                                            className="form-input bg-black/60 border-purple-500/20 text-xs font-mono" 
                                            placeholder="https://.../roku_optimized.m3u8" 
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="space-y-12">
                             <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">03. Key Art & Promotional</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="form-label">Poster (2:3)</label>
                                            <div className="aspect-[2/3] bg-black rounded-xl border border-white/10 overflow-hidden mb-2">
                                                <img src={formData.poster} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <S3Uploader label="Upload Art" onUploadSuccess={(url) => setFormData({...formData, poster: url, tvPoster: url})} />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="form-label">Teaser/Trailer</label>
                                            <input type="text" name="trailer" value={formData.trailer} onChange={handleChange} className="form-input bg-black/40" placeholder="Trailer URL" />
                                            <S3Uploader label="Ingest Teaser" onUploadSuccess={(url) => setFormData({...formData, trailer: url})} />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">04. Access & Monetization</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 cursor-pointer">
                                            <input type="checkbox" name="isForSale" checked={formData.isForSale} onChange={handleChange} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-red-600 focus:ring-red-500" />
                                            <span className="text-xs font-black uppercase text-gray-300">Enable VOD Paywall</span>
                                        </label>
                                        {formData.isForSale && (
                                            <input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange} className="form-input bg-black/40" step="0.01" />
                                        )}
                                    </div>
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
        </div>
    );
};

export default MovieEditor;
