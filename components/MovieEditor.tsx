import React, { useState, useEffect } from 'react';
import { Movie, Actor, MoviePipelineEntry, Episode } from '../types';
import S3Uploader from './S3Uploader';
import SocialKitModal from './SocialKitModal';

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
    const [socialKitMovie, setSocialKitMovie] = useState<Movie | null>(null);

    useEffect(() => {
        if (movieToCreate) {
            const newKey = `newmovie${Date.now()}`;
            const newFormData: Movie = {
                ...emptyMovie,
                key: newKey,
                title: movieToCreate.title,
                synopsis: movieToCreate.synopsis,
                cast: movieToCreate.cast.split(',').map(name => ({ name: name.trim(), photo: '', bio: '', highResPhoto: '' })),
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

    const handleSelectMovie = (key: string) => {
        if (key === 'new') setSelectedMovieKey(`newmovie${Date.now()}`);
        else setSelectedMovieKey(key);
    };

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
                            <button onClick={() => handleSelectMovie('new')} className="bg-green-600 hover:bg-green-700 text-white font-black py-1.5 px-4 rounded text-[10px] uppercase tracking-widest">New</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50 text-[10px] uppercase tracking-widest text-gray-500">
                                <tr>
                                    <th className="p-4">Title</th>
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
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                {movie.isUnlisted && <span className="bg-gray-700 text-[8px] px-1.5 py-0.5 rounded">UNLISTED</span>}
                                                {movie.isSeries && <span className="bg-purple-900 text-[8px] px-1.5 py-0.5 rounded">SERIES</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleSelectMovie(movie.key)} className="text-blue-400 font-bold text-xs uppercase hover:underline">Edit</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700 space-y-8 shadow-2xl animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Editing: {formData.title || 'New Movie'}</h3>
                        <button onClick={() => setSelectedMovieKey('')} className="text-gray-500 hover:text-white uppercase font-black text-xs">Back</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="form-label">General Info</label>
                            <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Title" className="form-input" />
                            <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} placeholder="Synopsis" rows={4} className="form-input" />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label text-[8px]">Release Date (Hype Mode)</label>
                                    <input type="datetime-local" name="releaseDateTime" value={formData.releaseDateTime ? new Date(formData.releaseDateTime).toISOString().slice(0, 16) : ''} onChange={handleChange} className="form-input" />
                                </div>
                                <div>
                                    <label className="form-label text-[8px]">Published At (12-Month Timer)</label>
                                    <input type="datetime-local" name="publishedAt" value={formData.publishedAt ? new Date(formData.publishedAt).toISOString().slice(0, 16) : ''} onChange={handleChange} className="form-input" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="form-label">Platform Controls</label>
                            <div className="grid grid-cols-2 gap-4 bg-black/20 p-6 rounded-2xl border border-white/5">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" name="isUnlisted" checked={formData.isUnlisted || false} onChange={handleChange} />
                                    <span className="text-[10px] font-black uppercase text-gray-400">Unlisted (Party Only)</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" name="isSeries" checked={formData.isSeries || false} onChange={handleChange} />
                                    <span className="text-[10px] font-black uppercase text-gray-400">Mark as Series</span>
                                </label>
                            </div>
                            
                            {formData.isSeries && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="form-label !mb-0">Episode List</label>
                                        <button onClick={handleEpisodeAdd} className="bg-purple-600 text-[10px] font-black px-3 py-1 rounded">ADD EPISODE</button>
                                    </div>
                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                        {formData.episodes?.map((ep, idx) => (
                                            <div key={ep.id} className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-2">
                                                <input type="text" value={ep.title} onChange={e => handleEpisodeChange(idx, 'title', e.target.value)} placeholder="Ep Title" className="form-input !py-1 text-xs" />
                                                <input type="text" value={ep.url} onChange={e => handleEpisodeChange(idx, 'url', e.target.value)} placeholder="Ep Video URL" className="form-input !py-1 text-xs" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-700 flex gap-4">
                        <button onClick={handleSave} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-12 rounded-2xl uppercase tracking-widest text-xs shadow-xl disabled:opacity-20">
                            {isSaving ? 'Saving...' : 'Publish to Catalog'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieEditor;