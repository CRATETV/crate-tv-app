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
                cast: movieToCreate.cast.split(',').map(name => ({ 
                    name: name.trim(), 
                    photo: '', 
                    bio: '', 
                    highResPhoto: '' 
                })),
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
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    // Cast Management
    const handleAddActor = () => {
        if (!formData) return;
        const newActor: Actor = { name: '', bio: '', photo: '', highResPhoto: '' };
        setFormData({ ...formData, cast: [...(formData.cast || []), newActor] });
    };

    const handleActorChange = (index: number, field: keyof Actor, value: string) => {
        if (!formData) return;
        const newCast = [...formData.cast];
        newCast[index] = { ...newCast[index], [field]: value };
        setFormData({ ...formData, cast: newCast });
    };

    const handleRemoveActor = (index: number) => {
        if (!formData) return;
        const newCast = formData.cast.filter((_, i) => i !== index);
        setFormData({ ...formData, cast: newCast });
    };

    // Episode Management
    const handleEpisodeAdd = () => {
        if (!formData) return;
        const newEp: Episode = { id: `ep_${Date.now()}`, title: 'New Episode', synopsis: '', url: '' };
        setFormData({ ...formData, episodes: [...(formData.episodes || []), newEp] });
    };

    const handleEpisodeChange = (index: number, field: keyof Episode, value: any) => {
        if (!formData || !formData.episodes) return;
        const newEpisodes = [...formData.episodes];
        newEpisodes[index] = { ...newEpisodes[index], [field]: value };
        setFormData({ ...formData, episodes: newEpisodes });
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
                                    <th className="p-4">Director</th>
                                    <th className="p-4">Tags</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredMovies.map(movie => (
                                    <tr key={movie.key} className="hover:bg-gray-700/30">
                                        <td className="p-4 flex items-center gap-3">
                                            <img src={movie.poster} className="w-8 h-12 object-cover rounded" />
                                            <span className="font-bold text-white uppercase text-xs">{movie.title}</span>
                                        </td>
                                        <td className="p-4 text-gray-400 text-xs">{movie.director}</td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                {movie.isUnlisted && <span className="bg-gray-700 text-[8px] px-1.5 py-0.5 rounded">UNLISTED</span>}
                                                {movie.isSeries && <span className="bg-purple-900 text-[8px] px-1.5 py-0.5 rounded">SERIES</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => setSelectedMovieKey(movie.key)} className="text-blue-400 font-bold text-xs uppercase hover:underline">Edit</button>
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
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{formData.title || 'New Movie'}</h3>
                        <button onClick={() => setSelectedMovieKey('')} className="bg-gray-700 hover:bg-gray-600 text-white font-black px-6 py-2 rounded-xl uppercase text-xs tracking-widest">Back to Catalog</button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* LEFT COLUMN: Narrative & Info */}
                        <div className="space-y-8">
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em]">01. Narrative Data</h4>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Film Title" className="form-input" />
                                <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} placeholder="Synopsis (HTML supported)" rows={6} className="form-input" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" name="director" value={formData.director} onChange={handleChange} placeholder="Director(s)" className="form-input" />
                                    <input type="text" name="producers" value={formData.producers} onChange={handleChange} placeholder="Producer(s)" className="form-input" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" name="durationInMinutes" value={formData.durationInMinutes} onChange={handleChange} placeholder="Runtime (Min)" className="form-input" />
                                    <div className="flex items-center gap-3 bg-black/20 p-4 rounded-xl border border-white/5">
                                        <input type="checkbox" name="hasCopyrightMusic" checked={formData.hasCopyrightMusic || false} onChange={handleChange} className="w-5 h-5 rounded border-gray-700 text-red-600" />
                                        <span className="text-[10px] font-black uppercase text-gray-500">Copyright Music?</span>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em]">02. Asset Management (URLs)</h4>
                                <div className="space-y-4 bg-black/20 p-6 rounded-2xl border border-white/5">
                                    <div>
                                        <label className="form-label">Full Movie URL</label>
                                        <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} placeholder="https://..." className="form-input mb-2" />
                                        <S3Uploader label="Or Upload Movie File" onUploadSuccess={(url) => setFormData({...formData, fullMovie: url})} />
                                    </div>
                                    <div>
                                        <label className="form-label">Trailer URL</label>
                                        <input type="text" name="trailer" value={formData.trailer} onChange={handleChange} placeholder="https://..." className="form-input mb-2" />
                                        <S3Uploader label="Or Upload Trailer" onUploadSuccess={(url) => setFormData({...formData, trailer: url})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="form-label">Portrait Poster</label>
                                            <input type="text" name="poster" value={formData.poster} onChange={handleChange} placeholder="Poster URL" className="form-input mb-2" />
                                            <S3Uploader label="Upload Poster" onUploadSuccess={(url) => setFormData({...formData, poster: url})} />
                                        </div>
                                        <div>
                                            <label className="form-label">Wide TV Poster</label>
                                            <input type="text" name="tvPoster" value={formData.tvPoster} onChange={handleChange} placeholder="Wide URL" className="form-input mb-2" />
                                            <S3Uploader label="Upload Wide" onUploadSuccess={(url) => setFormData({...formData, tvPoster: url})} />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* RIGHT COLUMN: Cast & Distribution */}
                        <div className="space-y-8">
                            <section className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em]">03. Cast Management</h4>
                                    <button onClick={handleAddActor} className="text-[9px] font-black uppercase bg-white/5 border border-white/10 px-3 py-1 rounded-md hover:bg-white/10 transition-colors">Add Actor</button>
                                </div>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {formData.cast?.map((actor, idx) => (
                                        <div key={idx} className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-3">
                                            <div className="flex justify-between items-center">
                                                <input type="text" value={actor.name} onChange={e => handleActorChange(idx, 'name', e.target.value)} placeholder="Actor Name" className="bg-transparent border-none text-white font-bold p-0 focus:ring-0 w-full" />
                                                <button onClick={() => handleRemoveActor(idx)} className="text-red-500 text-xs font-black uppercase tracking-widest hover:underline ml-4">Remove</button>
                                            </div>
                                            <textarea value={actor.bio} onChange={e => handleActorChange(idx, 'bio', e.target.value)} placeholder="Actor Bio..." rows={2} className="form-input !py-2 text-xs" />
                                            <div className="flex gap-2 items-center">
                                                <input type="text" value={actor.photo} onChange={e => handleActorChange(idx, 'photo', e.target.value)} placeholder="Photo URL" className="form-input !py-1 text-xs" />
                                                <S3Uploader label="Upload" onUploadSuccess={(url) => handleActorChange(idx, 'photo', url)} />
                                            </div>
                                        </div>
                                    ))}
                                    {(!formData.cast || formData.cast.length === 0) && <p className="text-center text-gray-600 text-xs py-10 italic">No cast members added yet.</p>}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em]">04. Distribution Logistics</h4>
                                <div className="grid grid-cols-2 gap-4 bg-black/20 p-6 rounded-2xl border border-white/5">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" name="isUnlisted" checked={formData.isUnlisted || false} onChange={handleChange} className="w-5 h-5 rounded border-gray-700 text-red-600" />
                                        <span className="text-[10px] font-black uppercase text-gray-400">Unlisted (Party Only)</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" name="isSeries" checked={formData.isSeries || false} onChange={handleChange} className="w-5 h-5 rounded border-gray-700 text-purple-600" />
                                        <span className="text-[10px] font-black uppercase text-gray-400">Mark as Series</span>
                                    </label>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="form-label">Launch Date (Coming Soon)</label>
                                        <input type="datetime-local" name="releaseDateTime" value={formData.releaseDateTime ? new Date(formData.releaseDateTime).toISOString().slice(0, 16) : ''} onChange={handleChange} className="form-input" />
                                    </div>
                                    <div>
                                        <label className="form-label">Go Live Date (12-Month Window)</label>
                                        <input type="datetime-local" name="publishedAt" value={formData.publishedAt ? new Date(formData.publishedAt).toISOString().slice(0, 16) : ''} onChange={handleChange} className="form-input" />
                                    </div>
                                </div>

                                {formData.isSeries && (
                                    <div className="space-y-4 pt-4 border-t border-gray-700">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-[10px] font-black uppercase text-purple-400 tracking-widest">Episode Browser</h4>
                                            <button onClick={handleEpisodeAdd} className="bg-purple-600 text-[9px] font-black px-3 py-1 rounded">Add Episode</button>
                                        </div>
                                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                            {formData.episodes?.map((ep, idx) => (
                                                <div key={ep.id} className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-2">
                                                    <input type="text" value={ep.title} onChange={e => handleEpisodeChange(idx, 'title', e.target.value)} placeholder="Episode Title" className="form-input !py-1 text-xs" />
                                                    <input type="text" value={ep.url} onChange={e => handleEpisodeChange(idx, 'url', e.target.value)} placeholder="Episode Stream URL" className="form-input !py-1 text-xs" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-700 flex flex-col sm:flex-row gap-4 justify-between">
                        <button onClick={() => onDeleteMovie(formData.key)} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black py-4 px-8 rounded-2xl uppercase tracking-widest text-xs transition-all border border-red-500/20">Delete Movie</button>
                        <button onClick={handleSave} disabled={isSaving} className="bg-white hover:bg-gray-200 text-black font-black py-4 px-16 rounded-2xl uppercase tracking-widest text-xs shadow-xl disabled:opacity-20 transform hover:scale-105 transition-all">
                            {isSaving ? 'Processing...' : 'Publish to Catalog'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieEditor;