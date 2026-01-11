
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
    poster: '',
    tvPoster: '',
    likes: 0,
    rating: 0,
    releaseDateTime: '',
    publishedAt: new Date().toISOString(),
    autoReleaseDate: '',
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
    const [isSettingSpotlight, setIsSettingSpotlight] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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
        } else setFormData(null);
    }, [selectedMovieKey, allMovies]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!formData) return;
        const target = e.target as HTMLInputElement;
        const { name, value, type } = target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? target.checked : (type === 'number' ? parseFloat(value) : value) });
    };

    const handleCastChange = (idx: number, updates: Partial<Actor>) => {
        if (!formData) return;
        const newCast = [...formData.cast];
        newCast[idx] = { ...newCast[idx], ...updates };
        setFormData({ ...formData, cast: newCast });
    };

    const handleAddActor = () => {
        if (!formData) return;
        setFormData({
            ...formData,
            cast: [...formData.cast, {
                name: 'New Actor',
                bio: '',
                photo: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png',
                highResPhoto: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png'
            }]
        });
    };

    const handleRemoveActor = (idx: number) => {
        if (!formData) return;
        const newCast = [...formData.cast];
        newCast.splice(idx, 1);
        setFormData({ ...formData, cast: newCast });
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

    const handleSetSpotlight = async () => {
        if (!formData || isSettingSpotlight) return;
        if (!window.confirm(`PROMOTE TO SPOTLIGHT: Set "${formData.title}" as the global Now Streaming film?`)) return;
        
        setIsSettingSpotlight(true);
        try {
            await onSetNowStreaming(formData.key);
            alert(`"${formData.title}" is now the global spotlight.`);
        } catch (err) {
            alert("Spotlight update failed.");
        } finally {
            setIsSettingSpotlight(false);
        }
    };

    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(m => (m.title || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    const isSavedRecord = formData && allMovies[formData.key] !== undefined;
    const totalCount = Object.keys(allMovies).length;

    return (
        <div className="space-y-6 pb-20">
            {!formData ? (
                <div className="bg-[#0f0f0f] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-8 bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Catalog Records</h3>
                            <span className="bg-red-600/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{totalCount} Films Total</span>
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
                                                    <div className="flex gap-2 mt-2">
                                                        {movie.isEpisode && <span className="text-[7px] bg-amber-600 text-white px-2 py-0.5 rounded-full uppercase font-black tracking-widest">EPISODE</span>}
                                                        {movie.isSeries && <span className="text-[7px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase font-black tracking-widest">SERIES</span>}
                                                        {movie.isSupportEnabled && <span className="text-[7px] bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase font-black tracking-widest">TIPS ACTIVE</span>}
                                                        {movie.isForSale && <span className="text-[7px] bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase font-black tracking-widest">VOD: ${movie.salePrice?.toFixed(2)}</span>}
                                                    </div>
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
                        <div className="flex items-center gap-6">
                            <div>
                                <h3 className="text-4xl font-black text-white uppercase tracking-tighter">{formData.title || 'Draft Master'}</h3>
                                <div className="flex items-center gap-3 mt-2">
                                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.4em]">UUID: {formData.key}</p>
                                    {isSavedRecord ? (
                                        <span className="text-[8px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 uppercase tracking-widest">Live in Database</span>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest">Draft (Unsaved Changes)</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isSavedRecord && (
                                <button 
                                    onClick={handleSetSpotlight}
                                    disabled={isSettingSpotlight}
                                    className="bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 transition-all group shadow-xl"
                                >
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600 group-hover:bg-white"></span>
                                    </span>
                                    <span className="text-[10px] uppercase tracking-widest">{isSettingSpotlight ? 'Pulsing...' : 'Set as Global Spotlight'}</span>
                                </button>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setSelectedMovieKey('')} className="bg-white/5 text-gray-400 px-6 py-3 rounded-xl uppercase text-[10px] font-black">Close</button>
                            <button onClick={handleSave} disabled={isSaving} className="bg-white text-black px-8 py-3 rounded-xl uppercase text-[10px] font-black shadow-xl hover:bg-gray-200 transition-all">{isSaving ? 'Syncing...' : 'Push Global Manifest'}</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div className="space-y-12">
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">01. Content Structure</h4>
                                <div className="space-y-4">
                                    <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Film/Series Title" className="form-input bg-black/40" />
                                    <input type="text" name="director" value={formData.director} onChange={handleChange} placeholder="Director(s)" className="form-input bg-black/40" />
                                    <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={4} placeholder="Synopsis Treatment" className="form-input bg-black/40" />
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 cursor-pointer">
                                            <input type="checkbox" name="isSeries" checked={formData.isSeries} onChange={handleChange} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-red-600 focus:ring-red-500" />
                                            <span className="text-xs font-black uppercase text-gray-300">Mark as Series</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 cursor-pointer">
                                            <input type="checkbox" name="isEpisode" checked={formData.isEpisode} onChange={handleChange} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-amber-600 focus:ring-amber-500" />
                                            <span className="text-xs font-black uppercase text-gray-300">Mark as Episode</span>
                                        </label>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">02. Revenue Logic</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-8">
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-4 cursor-pointer group">
                                            <div className="relative">
                                                <input type="checkbox" name="isSupportEnabled" checked={formData.isSupportEnabled} onChange={handleChange} className="sr-only peer" />
                                                <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:bg-emerald-600 transition-all"></div>
                                                <div className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all peer-checked:translate-x-7"></div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white uppercase tracking-tight">Allow Community Support (Tips)</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Enables the "Support Creator" button</p>
                                            </div>
                                        </label>
                                    </div>
                                    
                                    <div className="space-y-4 border-t border-white/5 pt-6">
                                        <label className="flex items-center gap-4 cursor-pointer group">
                                            <div className="relative">
                                                <input type="checkbox" name="isForSale" checked={formData.isForSale} onChange={handleChange} className="sr-only peer" />
                                                <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
                                                <div className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all peer-checked:translate-x-7"></div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white uppercase tracking-tight">VOD Paywall Authorization</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Requires paid rental for access</p>
                                            </div>
                                        </label>
                                        
                                        {formData.isForSale && (
                                            <div className="pl-18 animate-[fadeIn_0.3s_ease-out] space-y-4">
                                                <div>
                                                    <label className="form-label !text-blue-400">VOD Rental Price (USD)</label>
                                                    <div className="relative max-w-[200px]">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                                        <input 
                                                            type="number" 
                                                            name="salePrice" 
                                                            value={formData.salePrice} 
                                                            onChange={handleChange} 
                                                            className="form-input !pl-8 bg-black/40 text-blue-500 font-black text-2xl" 
                                                            step="0.01"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="form-label">Auto-Release Date (Becomes Free)</label>
                                                    <input 
                                                        type="datetime-local" 
                                                        name="autoReleaseDate" 
                                                        value={formData.autoReleaseDate?.slice(0, 16)} 
                                                        onChange={handleChange} 
                                                        className="form-input bg-black/40 border-white/10 text-xs" 
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 border-t border-white/5 pt-6">
                                        <label className="flex items-center gap-4 cursor-pointer group">
                                            <div className="relative">
                                                <input type="checkbox" name="isWatchPartyPaid" checked={formData.isWatchPartyPaid} onChange={handleChange} className="sr-only peer" />
                                                <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:bg-pink-600 transition-all"></div>
                                                <div className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all peer-checked:translate-x-7"></div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white uppercase tracking-tight">Paid Watch Party Admission</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Requires ticket for live screening</p>
                                            </div>
                                        </label>

                                        {formData.isWatchPartyPaid && (
                                            <div className="pl-18 animate-[fadeIn_0.3s_ease-out]">
                                                <label className="form-label !text-pink-400">Ticket Price (USD)</label>
                                                <div className="relative max-w-[200px]">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                                    <input 
                                                        type="number" 
                                                        name="watchPartyPrice" 
                                                        value={formData.watchPartyPrice} 
                                                        onChange={handleChange} 
                                                        className="form-input !pl-8 bg-black/40 text-pink-500 font-black text-2xl" 
                                                        step="0.01"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="space-y-12">
                             <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">03. Master Media</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="space-y-2">
                                        <label className="form-label">High-Bitrate Master</label>
                                        <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} className="form-input bg-black/40" placeholder="https://..." />
                                        <S3Uploader label="Ingest New Stream" onUploadSuccess={(url) => setFormData({...formData, fullMovie: url})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="form-label">Key Art (2:3)</label>
                                            <div className="aspect-[2/3] bg-black rounded-xl border border-white/10 overflow-hidden mb-2">
                                                <img src={formData.poster} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <input type="text" name="poster" value={formData.poster} onChange={handleChange} className="form-input bg-black/40 mb-2 !py-2 text-xs" placeholder="Poster URL" />
                                            <S3Uploader label="Upload Art" onUploadSuccess={(url) => setFormData({...formData, poster: url, tvPoster: url})} />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="form-label">Promotional Teaser</label>
                                            <input type="text" name="trailer" value={formData.trailer} onChange={handleChange} className="form-input bg-black/40" placeholder="Trailer URL" />
                                            <S3Uploader label="Ingest Teaser" onUploadSuccess={(url) => setFormData({...formData, trailer: url})} />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">04. Visibility Window</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div>
                                        <label className="form-label">Official Release Date & Time</label>
                                        <input type="datetime-local" name="releaseDateTime" value={formData.releaseDateTime?.slice(0, 16)} onChange={handleChange} className="form-input bg-black/40 border-white/10" />
                                        <p className="text-[8px] text-gray-600 mt-2 font-black uppercase tracking-widest italic">Film will be hidden from public catalog until this timestamp.</p>
                                    </div>
                                    <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 cursor-pointer">
                                        <input type="checkbox" name="isUnlisted" checked={formData.isUnlisted} onChange={handleChange} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-gray-500 focus:ring-gray-400" />
                                        <div className="min-w-0">
                                            <span className="text-xs font-black uppercase text-gray-300">Unlist from Public Catalog</span>
                                            <p className="text-[8px] text-gray-600 uppercase font-bold mt-1">Requires direct link for discovery.</p>
                                        </div>
                                    </label>
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">05. Talent Manifest</h4>
                            <button onClick={handleAddActor} className="bg-white/5 hover:bg-white text-gray-400 hover:text-black font-black px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest border border-white/10 transition-all">+ Add Lead Talent</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {formData.cast.map((actor, idx) => (
                                <div key={idx} className="bg-black/60 p-6 rounded-3xl border border-white/5 space-y-6 group">
                                    <div className="flex justify-between items-start border-b border-white/5 pb-4">
                                        <input 
                                            value={actor.name} 
                                            onChange={(e) => handleCastChange(idx, { name: e.target.value })} 
                                            className="bg-transparent text-white font-black text-xl uppercase tracking-tight focus:outline-none placeholder:text-gray-800" 
                                            placeholder="Actor Name"
                                        />
                                        <button onClick={() => handleRemoveActor(idx)} className="text-gray-700 hover:text-red-500 text-[9px] font-black uppercase tracking-widest transition-colors">Erase Node</button>
                                    </div>
                                    <textarea 
                                        value={actor.bio} 
                                        onChange={(e) => handleCastChange(idx, { bio: e.target.value })} 
                                        placeholder="Talent Biography..." 
                                        className="form-input !bg-transparent border-white/5 h-24 text-xs font-medium"
                                    />
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Headshot URL</p>
                                            <div className="w-16 h-16 rounded-full overflow-hidden border border-white/10 mb-2 bg-black">
                                                <img src={actor.photo} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <input 
                                                type="text" 
                                                value={actor.photo} 
                                                onChange={(e) => handleCastChange(idx, { photo: e.target.value })} 
                                                placeholder="https://..." 
                                                className="form-input !py-1.5 !px-3 text-[10px] bg-white/5 border-white/5"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Bio Art URL (High Res)</p>
                                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 mb-2 bg-black">
                                                <img src={actor.highResPhoto} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <input 
                                                type="text" 
                                                value={actor.highResPhoto} 
                                                onChange={(e) => handleCastChange(idx, { highResPhoto: e.target.value })} 
                                                placeholder="https://..." 
                                                className="form-input !py-1.5 !px-3 text-[10px] bg-white/5 border-white/5"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-6">
                        <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-black py-6 px-24 rounded-[2rem] uppercase tracking-[0.3em] shadow-[0_30px_60px_rgba(239,68,68,0.3)] transition-all transform active:scale-95 disabled:opacity-20 text-sm">
                            {isSaving ? 'Synchronizing Cluster...' : 'Push Global Manifest'}
                        </button>
                        <button 
                            onClick={() => { if(window.confirm("PURGE PROTOCOL: Irreversibly erase this record?")) onDeleteMovie(formData.key); }}
                            className="text-[10px] text-gray-700 font-black uppercase tracking-widest hover:text-red-600 transition-colors"
                        >
                            Purge Data Stream
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieEditor;
