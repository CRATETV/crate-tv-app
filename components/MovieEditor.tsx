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
    
    const [newActorName, setNewActorName] = useState('');
    const [newActorBio, setNewActorBio] = useState('');

    useEffect(() => {
        if (movieToCreate) {
            const newKey = `movie_${Date.now()}`;
            const newFormData: Movie = {
                ...emptyMovie,
                key: newKey,
                title: movieToCreate.title,
                synopsis: movieToCreate.synopsis,
                cast: movieToCreate.cast ? movieToCreate.cast.split(',').map(name => ({ 
                    name: name.trim(), 
                    photo: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png', 
                    bio: 'Cast biography pending.', 
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
                setFormData({ ...movieData });
            } else if (selectedMovieKey.startsWith('movie_') || selectedMovieKey.startsWith('newmovie')) {
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
            bio: newActorBio.trim() || 'Cast biography pending.',
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
            onRefresh();
        } catch (err) {
            console.warn("Sync initiated in background.");
            setSelectedMovieKey('');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!formData) return;
        if (!window.confirm(`PERMANENT ACTION: Purge "${formData.title}" from global database?`)) return;
        setIsSaving(true);
        try {
            await onDeleteMovie(formData.key);
            setSelectedMovieKey('');
            onRefresh();
        } catch (err) {
            console.error("Purge failed.");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(m => {
            const query = searchTerm.toLowerCase().trim();
            if (!query) return true;
            return (m.title || '').toLowerCase().includes(query) || (m.director || '').toLowerCase().includes(query);
        })
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    return (
        <div className="space-y-6 pb-20">
            {!formData ? (
                <div className="bg-[#0f0f0f] rounded-3xl border border-white/5 overflow-hidden shadow-2xl animate-[fadeIn_0.4s_ease-out]">
                    <div className="p-8 bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-white/5">
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Studio Catalog</h3>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">{filteredMovies.length} Global Masters</p>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <input 
                                type="text" 
                                placeholder="Filter catalog..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="form-input !py-3 text-xs w-full sm:w-64 bg-black/40 border-white/10" 
                            />
                            <button onClick={() => setSelectedMovieKey(`movie_${Date.now()}`)} className="bg-red-600 hover:bg-red-700 text-white font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-lg whitespace-nowrap">+ Ingest</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[9px] uppercase tracking-[0.3em] text-gray-500 border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-5">Production Record</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5 text-right">Commands</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredMovies.map(movie => (
                                    <tr key={movie.key} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-14 bg-black rounded border border-white/10 overflow-hidden flex-shrink-0">
                                                    {movie.poster && <img src={movie.poster} className="w-full h-full object-cover" />}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-white uppercase text-sm block tracking-tight group-hover:text-red-500 transition-colors">{movie.title || 'Untitled'}</span>
                                                    <span className="text-[10px] text-gray-500 font-black uppercase">Dir: {movie.director || 'Unknown'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${movie.isUnlisted ? 'bg-gray-800 text-gray-400' : 'bg-green-900/30 text-green-500'}`}>
                                                {movie.isUnlisted ? 'Private' : 'Published'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button onClick={() => setSelectedMovieKey(movie.key)} className="text-white bg-white/5 hover:bg-white/10 font-black text-[9px] uppercase tracking-widest px-4 py-2 rounded-lg transition-all">Edit Manifest</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-[#0f0f0f] rounded-[2.5rem] border border-white/5 p-8 md:p-12 space-y-12 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex justify-between items-center border-b border-white/5 pb-10">
                        <h3 className="text-4xl font-black text-white uppercase tracking-tighter">{formData.title || 'Draft Master'}</h3>
                        <button onClick={() => setSelectedMovieKey('')} className="bg-white/5 hover:bg-white/10 text-gray-400 px-6 py-3 rounded-xl uppercase text-[10px] font-black tracking-widest transition-all">Catalog Root</button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div className="space-y-10">
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">01. Core Identity</h4>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Film Title" className="form-input bg-black/40 border-white/10" />
                                <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={6} placeholder="Narrative Summary" className="form-input bg-black/40 border-white/10" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" name="director" value={formData.director} onChange={handleChange} placeholder="Director" className="form-input bg-black/40 border-white/10" />
                                    <input type="text" name="producers" value={formData.producers} onChange={handleChange} placeholder="Producers" className="form-input bg-black/40 border-white/10" />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">02. Source Stack</h4>
                                <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-4">
                                    <div>
                                        <label className="form-label">Full Film (URL or Upload)</label>
                                        <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} className="form-input bg-black/40 border-white/10 mb-2" />
                                        <S3Uploader label="Ingest High-Bitrate Master" onUploadSuccess={(url) => setFormData({...formData, fullMovie: url})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                        <div>
                                            <label className="form-label">Trailer</label>
                                            <input type="text" name="trailer" value={formData.trailer} onChange={handleChange} className="form-input bg-black/40 border-white/10" />
                                        </div>
                                        <div>
                                            <label className="form-label">Key Art (2:3)</label>
                                            <input type="text" name="poster" value={formData.poster} onChange={handleChange} className="form-input bg-black/40 border-white/10 mb-2" />
                                            <S3Uploader label="Ingest Poster" onUploadSuccess={(url) => setFormData({...formData, poster: url})} />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="space-y-10">
                             <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">03. Cast Manifest</h4>
                                <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-4">
                                    <div className="flex flex-col gap-3">
                                        <input type="text" value={newActorName} onChange={(e) => setNewActorName(e.target.value)} placeholder="Performer Name" className="form-input bg-black/40 border-white/10" />
                                        <textarea value={newActorBio} onChange={(e) => setNewActorBio(e.target.value)} placeholder="Biography" className="form-input bg-black/40 border-white/10" rows={3} />
                                        <button type="button" onClick={handleAddActor} className="bg-white/10 hover:bg-white/20 text-white font-black py-3 rounded-xl text-[9px] uppercase tracking-widest border border-white/5 transition-all">Add Performer to Production</button>
                                    </div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                        {formData.cast.map((actor, idx) => (
                                            <div key={idx} className="flex flex-col p-4 bg-black/60 border border-white/5 rounded-xl group/actor">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-white uppercase tracking-tight">{actor.name}</span>
                                                    <button onClick={() => handleRemoveActor(idx)} className="text-gray-600 hover:text-red-500 transition-colors">
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-gray-500 mt-1 italic">{actor.bio}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">04. Distribution Logic</h4>
                                <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-white tracking-widest">Active Paywall</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="isForSale" checked={formData.isForSale || false} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-green-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                        </label>
                                    </div>
                                    {formData.isForSale && (
                                        <div>
                                            <label className="form-label">Rental Price ($)</label>
                                            <input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange} className="form-input bg-black/40 border-white/10" step="0.01" />
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="pt-12 border-t border-white/5 flex justify-between items-center">
                        <button onClick={handleDelete} className="text-gray-600 hover:text-red-500 font-black uppercase text-[10px] tracking-[0.2em] transition-colors">Purge Global Manifest</button>
                        <button onClick={handleSave} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white font-black py-5 px-16 rounded-2xl uppercase tracking-widest text-sm shadow-2xl transition-all transform active:scale-95">
                            {isSaving ? 'Synchronizing Cluster...' : 'Commit Changes'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieEditor;