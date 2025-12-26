
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
    durationInMinutes: 0,
    hasCopyrightMusic: false,
    isWatchPartyEnabled: false,
    watchPartyStartTime: '',
    isForSale: false,
    salePrice: 0,
    mainPageExpiry: '',
    isCratemas: false,
    awardName: '',
    awardYear: '',
    customLaurelUrl: '',
};

const MovieEditor: React.FC<MovieEditorProps> = ({ 
    allMovies, 
    onRefresh, 
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
    const [sourcePipelineId, setSourcePipelineId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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
            setSourcePipelineId(movieToCreate.id);
            onCreationDone?.();
        }
    }, [movieToCreate, onCreationDone]);

    useEffect(() => {
        if (selectedMovieKey) {
            const movieData = allMovies[selectedMovieKey];
            if (movieData) {
                setFormData({ ...movieData });
            } else if (selectedMovieKey.startsWith('newmovie')) {
                if (!formData || formData.key !== selectedMovieKey) {
                    setFormData({ ...emptyMovie, key: selectedMovieKey });
                }
            } else {
                setSelectedMovieKey('');
                setFormData(null);
            }
        } else {
            setFormData(null);
        }
    }, [selectedMovieKey, allMovies]);

    const handleSelectMovie = (key: string) => {
        if (key === 'new') {
            setSelectedMovieKey(`newmovie${Date.now()}`);
        } else {
            setSelectedMovieKey(key);
        }
        setSourcePipelineId(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!formData) return;
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
             const { checked } = e.target as HTMLInputElement;
             setFormData({ ...formData, [name]: checked });
        } else if (type === 'datetime-local') {
             setFormData({ ...formData, [name]: value ? new Date(value).toISOString() : '' });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSave = async () => {
        if (!formData) return;
        setIsSaving(true);
        try {
            await onSave({ [formData.key]: formData }, sourcePipelineId);
            setSourcePipelineId(null);
            setSelectedMovieKey('');
        } catch (err) {
            console.error("Save failed:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (key: string, title: string) => {
        if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
        setIsDeleting(true);
        try {
            await onDeleteMovie(key);
            if (selectedMovieKey === key) {
                setSelectedMovieKey('');
                setFormData(null);
            }
        } catch (err) {
            console.error("Delete failed:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetNowStreamingClick = async () => {
        if (!formData || !formData.key) return;
        if (!window.confirm(`Set "${formData.title}" as the main feature?`)) return;
        await onSetNowStreaming(formData.key);
    };

    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.title.localeCompare(b.title));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-red-400">Movie Management</h2>
                <button 
                    onClick={() => handleSelectMovie('new')} 
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition-all transform hover:scale-105"
                >
                    + Create New Movie
                </button>
            </div>

            {!formData ? (
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h3 className="font-bold text-gray-300">Master Film List</h3>
                        <div className="relative w-full sm:w-64">
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="form-input !py-1.5 !pl-9 text-sm"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50 text-xs uppercase tracking-widest text-gray-500">
                                <tr>
                                    <th className="p-4">Film</th>
                                    <th className="p-4">Director</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredMovies.map(movie => (
                                    <tr key={movie.key} className="hover:bg-gray-700/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img src={movie.poster} alt="" className="w-8 h-12 object-cover rounded bg-gray-900" />
                                                <span className="font-bold text-white">{movie.title}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-400">{movie.director}</td>
                                        <td className="p-4 text-right space-x-2">
                                            <button onClick={() => handleSelectMovie(movie.key)} className="text-blue-400 hover:text-blue-300 font-bold text-xs uppercase">Edit</button>
                                            <button onClick={() => handleDelete(movie.key, movie.title)} className="text-red-500 hover:text-red-400 font-bold text-xs uppercase">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 bg-gray-800 p-6 rounded-lg border border-gray-700 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                        <h3 className="text-xl font-bold text-white">{formData.title || 'New Film Entry'}</h3>
                        <button onClick={() => setSelectedMovieKey('')} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" /></svg>
                            Back to List
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="form-label">Film Title</label>
                            <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-input" />
                        </div>
                        <div>
                            <label className="form-label">Director(s)</label>
                            <input type="text" name="director" value={formData.director} onChange={handleChange} className="form-input" placeholder="Comma-separated" />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Synopsis (HTML allowed)</label>
                        <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={5} className="form-input" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-purple-900/10 border border-purple-500/20 rounded-xl">
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-purple-400 uppercase tracking-tighter">Laurel Metadata</h3>
                            <div>
                                <label className="form-label text-xs">Award Category (e.g., Official Selection)</label>
                                <input type="text" name="awardName" value={formData.awardName || ''} onChange={handleChange} className="form-input" placeholder="Official Selection" />
                            </div>
                            <div>
                                <label className="form-label text-xs">Award Year</label>
                                <input type="text" name="awardYear" value={formData.awardYear || ''} onChange={handleChange} className="form-input" placeholder="2026" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-purple-400 uppercase tracking-tighter">Direct Image Link</h3>
                            <p className="text-xs text-gray-400">If you have a professional laurel file hosted on S3, paste the URL below to bypass the SVG generator.</p>
                            <input type="text" name="customLaurelUrl" value={formData.customLaurelUrl || ''} onChange={handleChange} className="form-input" placeholder="https://...laurel.png" />
                        </div>
                    </div>

                    <div className="pt-8 flex items-center justify-between gap-6 border-t border-gray-700">
                        <div className="flex items-center gap-4">
                            <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white font-black py-3 px-8 rounded-lg transition-all shadow-xl">
                                {isSaving ? 'Publishing...' : 'Save & Publish Film'}
                            </button>
                            <button onClick={handleSetNowStreamingClick} className="bg-yellow-500 hover:bg-yellow-600 text-black font-black py-3 px-6 rounded-lg transition-all">Set as Feature</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieEditor;
