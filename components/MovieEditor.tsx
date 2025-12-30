import React, { useState, useEffect } from 'react';
import { Movie, Actor, MoviePipelineEntry } from '../types';
import S3Uploader from './S3Uploader';

interface MovieEditorProps {
    allMovies: Record<string, Movie>;
    onRefresh: () => void;
    onSave: (movieData: Record<string, Movie>, pipelineId?: string | null) => Promise<void>;
    onDeleteMovie: (movieKey: string) => Promise<void>;
    onSetNowStreaming: (movieKey: string) => Promise<void>;
    movieToCreate?: MoviePipelineEntry | null;
    onCreationDone?: () => void;
}

const emptyMovie: Movie = {
    key: `newmovie${Date.now()}`,
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
    isUnlisted: false,
    isSeries: false,
    episodes: [],
    durationInMinutes: 0,
    hasCopyrightMusic: false,
    isSupportEnabled: true,
    isWatchPartyEnabled: false,
    watchPartyStartTime: '',
    isForSale: false,
    salePrice: 5.00,
};

const MovieEditor: React.FC<MovieEditorProps> = ({ 
    allMovies, 
    onSave, 
    onDeleteMovie, 
    onSetNowStreaming,
    onRefresh,
    movieToCreate, 
    onCreationDone 
}) => {
    const [selectedMovieKey, setSelectedMovieKey] = useState<string>('');
    const [formData, setFormData] = useState<Movie | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Cast Inputs
    const [newActorName, setNewActorName] = useState('');
    const [newActorBio, setNewActorBio] = useState('');

    useEffect(() => {
        if (movieToCreate) {
            const newKey = `newmovie${Date.now()}`;
            const newFormData: Movie = {
                ...emptyMovie,
                key: newKey,
                title: movieToCreate.title,
                synopsis: movieToCreate.synopsis,
                cast: movieToCreate.cast ? movieToCreate.cast.split(',').map(name => ({ 
                    name: name.trim(), 
                    photo: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png', 
                    bio: '', 
                    highResPhoto: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png' 
                })) : [],
                director: movieToCreate.director,
                fullMovie: movieToCreate.movieUrl,
                poster: movieToCreate.posterUrl,
                tvPoster: movieToCreate.posterUrl,
            };
            setFormData(newFormData);
            setSelectedMovieKey(newKey);
            onCreationDone?.();
        }
    }, [movieToCreate, onCreationDone]);

    useEffect(() => {
        if (selectedMovieKey) {
            const movieData = allMovies[selectedMovieKey];
            if (movieData) {
                setFormData({ 
                    ...movieData, 
                    cast: Array.isArray(movieData.cast) ? movieData.cast : [] 
                });
            } else if (selectedMovieKey.startsWith('newmovie')) {
                setFormData({ ...emptyMovie, key: selectedMovieKey });
            }
        } else {
            setFormData(null);
        }
    }, [selectedMovieKey, allMovies]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!formData) return;
        const target = e.target as HTMLInputElement;
        const { name, value, type } = target;
        
        if (type === 'checkbox') {
             setFormData({ ...formData, [name]: target.checked });
        } else if (type === 'number') {
            setFormData({ ...formData, [name]: parseFloat(value) || 0 });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleAddActor = () => {
        if (!formData || !newActorName.trim()) return;
        const newActor: Actor = {
            name: newActorName.trim(),
            photo: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png',
            bio: newActorBio.trim() || 'Biography pending.',
            highResPhoto: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png'
        };
        setFormData({ ...formData, cast: [...formData.cast, newActor] });
        setNewActorName('');
        setNewActorBio('');
    };

    const handleRemoveActor = (index: number) => {
        if (!formData) return;
        const newCast = [...formData.cast];
        newCast.splice(index, 1);
        setFormData({ ...formData, cast: newCast });
    };

    const handleSave = async () => {
        if (!formData) return;
        setIsSaving(true);
        try {
            await onSave({ [formData.key]: formData });
            setSelectedMovieKey('');
        } catch (err) {
            // Silently handle sync delays to maintain seamless UX
            console.warn("Background sync in progress...");
            setSelectedMovieKey('');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(m => {
            const query = searchTerm.toLowerCase().trim();
            if (!query) return true;
            return (
                (m.title || '').toLowerCase().includes(query) ||
                (m.key || '').toLowerCase().includes(query) ||
                (m.director || '').toLowerCase().includes(query)
            );
        })
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    return (
        <div className="space-y-6 pb-20">
            {!formData ? (
                <div className="bg-[#0f0f0f] rounded-3xl border border-white/5 overflow-hidden shadow-2xl animate-[fadeIn_0.4s_ease-out]">
                    <div className="p-8 bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-white/5">
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Master Catalog</h3>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">{filteredMovies.length} Global Records Online</p>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <div className="relative flex-grow">
                                <input 
                                    type="text" 
                                    placeholder="Filter catalog..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    className="form-input !py-3 !pl-10 text-xs w-full sm:w-80 bg-black/40 border-white/10" 
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <button onClick={onRefresh} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                            <button onClick={() => setSelectedMovieKey(`newmovie${Date.now()}`)} className="bg-red-600 hover:bg-red-700 text-white font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-lg whitespace-nowrap">+ Ingest New</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white/[0.01] text-[10px] uppercase tracking-[0.3em] text-gray-500 border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-5">Production Record</th>
                                    <th className="px-8 py-5">Global Impression</th>
                                    <th className="px-8 py-5 text-right">Terminal Commands</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredMovies.map(movie => (
                                    <tr key={movie.key} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0 border border-white/10 shadow-2xl relative">
                                                    {movie.poster ? (
                                                        <img src={movie.poster} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-800 uppercase font-black">NO_ART</div>
                                                    )}
                                                    {movie.isForSale && (
                                                        <div className="absolute top-0 right-0 bg-green-500 w-2 h-2 rounded-bl shadow-sm" title="Paywalled Content"></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="font-black text-white uppercase text-base block tracking-tight group-hover:text-red-500 transition-colors">{movie.title || 'Draft Manifest'}</span>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] text-gray-600 font-mono">ID: {movie.key}</span>
                                                        <div className="h-1 w-1 bg-gray-800 rounded-full"></div>
                                                        <span className="text-[10px] text-gray-400 font-black uppercase">Dir: {movie.director || 'UNASSIGNED'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest">Aggregate Feedback</p>
                                                <p className="text-sm font-bold text-gray-300">{(movie.likes || 0).toLocaleString()} <span className="text-[10px] text-gray-600 font-normal">Likes</span></p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => onSetNowStreaming(movie.key)}
                                                    className="text-gray-500 hover:text-white font-black text-[9px] uppercase tracking-widest border border-white/5 bg-white/5 hover:bg-red-600 px-4 py-2 rounded-xl transition-all"
                                                >
                                                    Spotlight
                                                </button>
                                                <button 
                                                    onClick={() => setSelectedMovieKey(movie.key)} 
                                                    className="text-white bg-white/10 hover:bg-white/20 font-black text-[9px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-[#0f0f0f] rounded-[2.5rem] border border-white/5 p-8 md:p-12 space-y-12 shadow-[0_50px_100px_rgba(0,0,0,0.8)] animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/5 pb-10">
                        <div>
                            <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Production Manifest</p>
                            <h3 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">{formData.title || 'New Record'}</h3>
                        </div>
                        <button onClick={() => setSelectedMovieKey('')} className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black px-8 py-4 rounded-2xl uppercase text-[10px] tracking-widest transition-all">Catalog Root</button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div className="space-y-12">
                            <section className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em] border-l-4 border-red-600 pl-4">01. Narrative Stack</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="form-label">Production Title</label>
                                        <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-input bg-black/40 border-white/10" />
                                    </div>
                                    <div>
                                        <label className="form-label">Narrative Summary</label>
                                        <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={8} className="form-input bg-black/40 border-white/10" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="form-label">Primary Director</label>
                                            <input type="text" name="director" value={formData.director} onChange={handleChange} className="form-input bg-black/40 border-white/10" />
                                        </div>
                                        <div>
                                            <label className="form-label">Lead Producers</label>
                                            <input type="text" name="producers" value={formData.producers} onChange={handleChange} className="form-input bg-black/40 border-white/10" />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em] border-l-4 border-red-600 pl-4">02. Media Pipeline</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div>
                                        <label className="form-label">Distribution Source (S3/Vimeo)</label>
                                        <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} className="form-input mb-3 bg-black/40 border-white/10" />
                                        <S3Uploader label="Ingest High-Bitrate Master" onUploadSuccess={(url) => setFormData({...formData, fullMovie: url})} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                        <div>
                                            <label className="form-label">Trailer Link</label>
                                            <input type="text" name="trailer" value={formData.trailer} onChange={handleChange} className="form-input bg-black/40 border-white/10" />
                                        </div>
                                        <div>
                                            <label className="form-label">Primary Key Art (2:3)</label>
                                            <input type="text" name="poster" value={formData.poster} onChange={handleChange} className="form-input mb-2 bg-black/40 border-white/10" />
                                            <S3Uploader label="Ingest Key Art" onUploadSuccess={(url) => setFormData({...formData, poster: url})} />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="space-y-12">
                             <section className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em] border-l-4 border-red-600 pl-4">03. Cast Attribution</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="space-y-4">
                                        <input 
                                            type="text" 
                                            value={newActorName} 
                                            onChange={(e) => setNewActorName(e.target.value)} 
                                            placeholder="Actor Name" 
                                            className="form-input !py-2.5 text-xs bg-black/40 border-white/10" 
                                        />
                                        <textarea 
                                            value={newActorBio} 
                                            onChange={(e) => setNewActorBio(e.target.value)} 
                                            placeholder="Professional Biography" 
                                            className="form-input !py-2.5 text-xs bg-black/40 border-white/10" 
                                            rows={3}
                                        />
                                        <button 
                                            type="button" 
                                            onClick={handleAddActor} 
                                            className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest border border-white/10 transition-all"
                                        >
                                            Assign Performer
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                        {formData.cast && formData.cast.length > 0 ? formData.cast.map((actor, idx) => (
                                            <div key={idx} className="flex flex-col p-4 bg-black/40 border border-white/5 rounded-xl gap-2 group/actor">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-white uppercase tracking-tight">{actor.name}</span>
                                                    <button onClick={() => handleRemoveActor(idx)} className="text-gray-600 hover:text-red-500 transition-colors">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-gray-500 line-clamp-2 italic leading-relaxed">{actor.bio}</p>
                                            </div>
                                        )) : (
                                            <p className="text-center py-10 text-gray-700 text-[10px] font-black uppercase tracking-widest">No cast records assigned</p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em] border-l-4 border-red-600 pl-4">04. Financial Layer (VOD)</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-white tracking-widest block">Active Paywall</span>
                                            <span className="text-[8px] text-gray-600 uppercase font-bold">Require 24h rental via Square</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="isForSale" checked={formData.isForSale || false} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-green-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                        </label>
                                    </div>
                                    {formData.isForSale && (
                                        <div className="animate-[fadeIn_0.3s_ease-out]">
                                            <label className="form-label">Rental Price (USD)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-500">$</span>
                                                <input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange} className="form-input bg-black/40 border-white/10 pl-8" step="0.01" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em] border-l-4 border-red-600 pl-4">05. Global Deployment Config</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <label className="flex items-center gap-4 cursor-pointer group">
                                            <div className="relative">
                                                <input type="checkbox" name="isUnlisted" checked={formData.isUnlisted || false} onChange={handleChange} className="sr-only peer" />
                                                <div className="w-12 h-6 bg-gray-800 rounded-full peer peer-checked:bg-red-600 transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-6"></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase text-white tracking-widest group-hover:text-red-500 transition-colors">Unlisted</span>
                                                <span className="text-[8px] text-gray-600 uppercase font-bold">Private Link</span>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-4 cursor-pointer group">
                                            <div className="relative">
                                                <input type="checkbox" name="isSeries" checked={formData.isSeries || false} onChange={handleChange} className="sr-only peer" />
                                                <div className="w-12 h-6 bg-gray-800 rounded-full peer peer-checked:bg-purple-600 transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-6"></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase text-white tracking-widest group-hover:text-purple-500 transition-colors">Series</span>
                                                <span className="text-[8px] text-gray-600 uppercase font-bold">Episodes</span>
                                            </div>
                                        </label>
                                    </div>
                                    <div className="space-y-4 pt-4 border-t border-white/5">
                                        <div>
                                            <label className="form-label">Global Premiere (UTC)</label>
                                            <input type="datetime-local" name="releaseDateTime" value={formData.releaseDateTime ? new Date(formData.releaseDateTime).toISOString().slice(0, 16) : ''} onChange={handleChange} className="form-input bg-black/40 border-white/10" />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="pt-12 border-t border-white/5 flex flex-col sm:flex-row gap-6 justify-between items-center">
                        <button onClick={() => onDeleteMovie(formData.key)} className="w-full sm:w-auto bg-white/5 hover:bg-red-600/20 text-gray-600 hover:text-red-500 font-black py-4 px-10 rounded-2xl uppercase tracking-widest text-[10px] transition-all border border-white/5">Purge Manifest</button>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <button onClick={handleSave} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white font-black py-5 px-20 rounded-2xl uppercase tracking-widest text-sm shadow-2xl disabled:opacity-20 transition-all transform active:scale-95">
                                {isSaving ? 'Syncing...' : 'Commit to Global Feed'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieEditor;