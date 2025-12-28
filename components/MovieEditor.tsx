import React, { useState, useEffect } from 'react';
import { Movie, Actor, MoviePipelineEntry, Episode } from '../types';
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
    movieToCreate, 
    onCreationDone 
}) => {
    const [selectedMovieKey, setSelectedMovieKey] = useState<string>('');
    const [formData, setFormData] = useState<Movie | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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
                    photo: '', 
                    bio: '', 
                    highResPhoto: '' 
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
                // Defensive check to ensure cast is always an array
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
        if (!formData) return;
        setFormData({
            ...formData,
            cast: [...(formData.cast || []), { name: '', bio: '', photo: '', highResPhoto: '' }]
        });
    };

    const handleActorChange = (index: number, field: keyof Actor, value: string) => {
        if (!formData || !formData.cast) return;
        const newCast = [...formData.cast];
        newCast[index] = { ...newCast[index], [field]: value };
        setFormData({ ...formData, cast: newCast });
    };

    const handleRemoveActor = (index: number) => {
        if (!formData || !formData.cast) return;
        const newCast = formData.cast.filter((_, i) => i !== index);
        setFormData({ ...formData, cast: newCast });
    };

    const handleSave = async () => {
        if (!formData) return;
        setIsSaving(true);
        try {
            await onSave({ [formData.key]: formData });
            setSelectedMovieKey('');
        } catch (err) {
            console.error("Save failed:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.title.localeCompare(b.title));

    return (
        <div className="space-y-6 pb-20">
            {!formData ? (
                <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
                    <div className="p-6 bg-gray-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h3 className="font-black text-gray-300 uppercase text-[10px] tracking-widest">Master Catalog</h3>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <input type="text" placeholder="Filter..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input !py-1.5 text-xs w-full sm:w-48" />
                            <button onClick={() => setSelectedMovieKey(`newmovie${Date.now()}`)} className="bg-green-600 hover:bg-green-700 text-white font-black py-1.5 px-4 rounded text-[10px] uppercase tracking-widest">New Movie</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50 text-[10px] uppercase tracking-widest text-gray-500">
                                <tr>
                                    <th className="p-4">Title</th>
                                    <th className="p-4">Access Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredMovies.map(movie => (
                                    <tr key={movie.key} className="hover:bg-gray-700/30">
                                        <td className="p-4 flex items-center gap-3">
                                            <img src={movie.poster} className="w-8 h-12 object-cover rounded" />
                                            <div>
                                                <span className="font-bold text-white uppercase text-xs block">{movie.title}</span>
                                                <span className="text-[9px] text-gray-500 uppercase tracking-widest">Dir. {movie.director}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-2">
                                                {movie.isForSale ? (
                                                    <span className="bg-green-600/20 text-green-400 border border-green-500/30 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest">
                                                        Rental Enabled (${movie.salePrice})
                                                    </span>
                                                ) : (
                                                    <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest">
                                                        Free Access
                                                    </span>
                                                )}
                                                {movie.isUnlisted && <span className="bg-gray-700 text-[8px] px-1.5 py-0.5 rounded font-black text-white uppercase">Unlisted</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => onSetNowStreaming(movie.key)}
                                                    className="text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg border border-red-500/30 transition-all"
                                                >
                                                    Feature
                                                </button>
                                                <button onClick={() => setSelectedMovieKey(movie.key)} className="text-blue-400 font-bold text-[10px] uppercase tracking-widest hover:text-blue-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">Edit</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700 space-y-12 shadow-2xl animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-6">
                        <div>
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{formData.title || 'New Movie'}</h3>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Movie ID: {formData.key}</p>
                        </div>
                        <button onClick={() => setSelectedMovieKey('')} className="bg-gray-700 hover:bg-gray-600 text-white font-black px-6 py-2 rounded-xl uppercase text-xs tracking-widest">Back to Catalog</button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-8">
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em]">01. Narrative Data</h4>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Film Title" className="form-input" />
                                <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} placeholder="Synopsis (HTML supported)" rows={6} className="form-input" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" name="director" value={formData.director} onChange={handleChange} placeholder="Director(s)" className="form-input" />
                                    <input type="text" name="producers" value={formData.producers} onChange={handleChange} placeholder="Producer(s)" className="form-input" />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em]">02. Asset Management</h4>
                                <div className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-4">
                                    <div>
                                        <label className="form-label">Full Movie URL</label>
                                        <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} placeholder="https://..." className="form-input mb-2" />
                                        <S3Uploader label="Or Upload Movie File" onUploadSuccess={(url) => setFormData({...formData, fullMovie: url})} />
                                    </div>
                                    <div>
                                        <label className="form-label">Portrait Poster</label>
                                        <input type="text" name="poster" value={formData.poster} onChange={handleChange} placeholder="Poster URL" className="form-input mb-2" />
                                        <S3Uploader label="Upload Poster" onUploadSuccess={(url) => setFormData({...formData, poster: url})} />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em]">03. Cast & Talents</h4>
                                    <button onClick={handleAddActor} className="text-[10px] font-black text-blue-400 hover:text-white uppercase tracking-widest">+ Add Member</button>
                                </div>
                                <div className="space-y-6">
                                    {formData.cast && formData.cast.map((actor, index) => (
                                        <div key={index} className="bg-black/40 p-6 rounded-2xl border border-white/10 space-y-4 relative group shadow-inner">
                                            <button onClick={() => handleRemoveActor(index)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors bg-white/5 p-1 rounded-lg">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="form-label">Actor Name</label>
                                                    <input type="text" value={actor.name} onChange={(e) => handleActorChange(index, 'name', e.target.value)} placeholder="Full Name" className="form-input" />
                                                </div>
                                                <div>
                                                    <label className="form-label">Profile Pic (Thumbnail)</label>
                                                    <input type="text" value={actor.photo} onChange={(e) => handleActorChange(index, 'photo', e.target.value)} placeholder="Photo URL" className="form-input" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="form-label">Professional Bio</label>
                                                <textarea value={actor.bio} onChange={(e) => handleActorChange(index, 'bio', e.target.value)} placeholder="Brief acting history..." rows={3} className="form-input" />
                                            </div>
                                            <div className="pt-2">
                                                <label className="form-label">High-Resolution Bio Photo</label>
                                                <div className="flex items-center gap-3">
                                                    <input type="text" value={actor.highResPhoto} onChange={(e) => handleActorChange(index, 'highResPhoto', e.target.value)} placeholder="High-Res URL" className="form-input flex-grow" />
                                                    <S3Uploader label="Upload" onUploadSuccess={(url) => handleActorChange(index, 'highResPhoto', url)} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!formData.cast || formData.cast.length === 0) && (
                                        <div className="py-12 border-2 border-dashed border-white/5 rounded-2xl text-center">
                                            <p className="text-gray-600 font-bold uppercase tracking-widest text-[10px]">No cast members added yet.</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        <div className="space-y-8">
                             <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em]">04. Distribution & Monetization</h4>
                                
                                <div className="bg-gradient-to-br from-green-600/10 to-transparent p-6 rounded-2xl border border-green-500/20 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase text-green-500 tracking-widest">Rental (24h PPV)</h4>
                                            <p className="text-[9px] text-gray-500 uppercase font-bold mt-1">Enable to put film behind paywall</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="isForSale" checked={formData.isForSale || false} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-green-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        </label>
                                    </div>
                                    {formData.isForSale && (
                                        <div className="animate-[fadeIn_0.3s_ease-out] space-y-4 pt-4 border-t border-white/5">
                                            <div>
                                                <label className="form-label">Rental Price (USD)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-black">$</span>
                                                    <input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange} className="form-input !pl-7 !bg-black/40" step="0.01" />
                                                </div>
                                                <p className="text-[9px] text-gray-500 mt-2 italic">Upon purchase, users receive 24 hours of streaming access.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 bg-black/20 p-6 rounded-2xl border border-white/5">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" name="isUnlisted" checked={formData.isUnlisted || false} onChange={handleChange} className="w-5 h-5 rounded border-gray-700 text-red-600" />
                                        <span className="text-[10px] font-black uppercase text-gray-400">Unlisted Mode</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" name="isSeries" checked={formData.isSeries || false} onChange={handleChange} className="w-5 h-5 rounded border-gray-700 text-purple-600" />
                                        <span className="text-[10px] font-black uppercase text-gray-400">Mark as Series</span>
                                    </label>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="form-label">Launch Date</label>
                                        <input type="datetime-local" name="releaseDateTime" value={formData.releaseDateTime ? new Date(formData.releaseDateTime).toISOString().slice(0, 16) : ''} onChange={handleChange} className="form-input" />
                                    </div>
                                    <div>
                                        <label className="form-label">Published At</label>
                                        <input type="datetime-local" name="publishedAt" value={formData.publishedAt ? new Date(formData.publishedAt).toISOString().slice(0, 16) : ''} onChange={handleChange} className="form-input" />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-700 flex flex-col sm:flex-row gap-4 justify-between">
                        <button onClick={() => onDeleteMovie(formData.key)} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black py-4 px-8 rounded-2xl uppercase tracking-widest text-xs transition-all border border-red-500/20">Delete Movie</button>
                        <button onClick={handleSave} disabled={isSaving} className="bg-white hover:bg-gray-200 text-black font-black py-4 px-16 rounded-2xl uppercase tracking-widest text-xs shadow-xl disabled:opacity-20 transform hover:scale-105 transition-all">
                            {isSaving ? 'Processing...' : 'Publish All Changes'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieEditor;