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

    const handleSave = async () => {
        if (!formData) return;
        setIsSaving(true);
        try {
            await onSave({ [formData.key]: formData });
            setSelectedMovieKey('');
        } catch (err) {
            console.error("Save failed:", err);
            alert("Database update failed.");
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
                <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
                    <div className="p-6 bg-gray-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                            <h3 className="font-black text-gray-300 uppercase text-[10px] tracking-widest">Master Catalog Control</h3>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <input 
                                type="text" 
                                placeholder="Search by title, ID, or director..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="form-input !py-1.5 text-xs w-full sm:w-64" 
                            />
                            <button onClick={() => setSelectedMovieKey(`newmovie${Date.now()}`)} className="bg-green-600 hover:bg-green-700 text-white font-black py-1.5 px-4 rounded-xl text-[10px] uppercase tracking-widest transition-all">Add Film</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50 text-[10px] uppercase tracking-widest text-gray-500 border-b border-gray-700">
                                <tr>
                                    <th className="p-4">Film Metadata</th>
                                    <th className="p-4">Asset Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredMovies.map(movie => {
                                    const hasVideo = movie.fullMovie && movie.fullMovie.length > 10;
                                    const hasPoster = movie.poster && movie.poster.length > 10;
                                    const isHealthy = hasVideo && hasPoster;

                                    return (
                                        <tr key={movie.key} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-14 bg-black rounded overflow-hidden flex-shrink-0 border border-white/5">
                                                        {movie.poster ? (
                                                            <img src={movie.poster} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-700">NO IMG</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-white uppercase text-sm block tracking-tight">{movie.title || 'Untitled'}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[9px] text-gray-500 font-mono uppercase">ID: {movie.key}</span>
                                                            <span className="text-[9px] text-red-500 font-bold uppercase">Dir: {movie.director || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    {isHealthy ? (
                                                        <span className="bg-green-600/10 text-green-500 border border-green-500/20 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest">Verified Live</span>
                                                    ) : (
                                                        <span className="bg-red-600/10 text-red-500 border border-red-500/20 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest">Draft / Broken</span>
                                                    )}
                                                    <div className="flex gap-1.5">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${hasVideo ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]' : 'bg-gray-700'}`} title="Video Stream Ready"></div>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${hasPoster ? 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 'bg-gray-700'}`} title="Poster Asset Found"></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => onSetNowStreaming(movie.key)}
                                                        className="text-white bg-red-600/20 border border-red-600/30 font-black text-[9px] uppercase tracking-widest hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg transition-all"
                                                    >
                                                        Feature
                                                    </button>
                                                    <button 
                                                        onClick={() => setSelectedMovieKey(movie.key)} 
                                                        className="text-white bg-white/5 hover:bg-white/10 border border-white/10 font-black text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
                                                    >
                                                        Manage
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredMovies.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-12 text-center text-gray-500 text-xs font-bold uppercase tracking-widest italic">
                                            No titles matching your criteria found in the catalog.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700 space-y-12 shadow-2xl animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-6">
                        <div>
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{formData.title || 'New Movie'}</h3>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Database Reference: {formData.key}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedMovieKey('')} className="bg-gray-700 hover:bg-gray-600 text-white font-black px-6 py-2 rounded-xl uppercase text-xs tracking-widest transition-all">Back to Catalog</button>
                        </div>
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
                        </div>

                        <div className="space-y-8">
                             <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em]">03. Cast & Status</h4>
                                <div className="grid grid-cols-2 gap-4 bg-black/20 p-6 rounded-2xl border border-white/5">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" name="isUnlisted" checked={formData.isUnlisted || false} onChange={handleChange} className="w-5 h-5 rounded border-gray-700 text-red-600" />
                                        <span className="text-[10px] font-black uppercase text-gray-400">Unlisted Mode</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" name="isSeries" checked={formData.isSeries || false} onChange={handleChange} className="w-5 h-5 rounded border-gray-700 text-purple-600" />
                                        <span className="text-[10px] font-black uppercase text-gray-400">Series</span>
                                    </label>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="form-label">Release Date</label>
                                        <input type="datetime-local" name="releaseDateTime" value={formData.releaseDateTime ? new Date(formData.releaseDateTime).toISOString().slice(0, 16) : ''} onChange={handleChange} className="form-input" />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <button onClick={() => onDeleteMovie(formData.key)} className="w-full sm:w-auto bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black py-4 px-8 rounded-2xl uppercase tracking-widest text-xs transition-all border border-red-500/20">Delete Movie</button>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <button onClick={handleSave} disabled={isSaving} className="bg-white hover:bg-gray-200 text-black font-black py-4 px-16 rounded-2xl uppercase tracking-widest text-xs shadow-xl disabled:opacity-20 transform hover:scale-105 transition-all">
                                {isSaving ? 'Deploying...' : 'Save and Deploy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieEditor;