import React, { useState, useEffect } from 'react';
import { Movie, Actor, MoviePipelineEntry } from '../types';
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
    
    // Social Kit State
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
                <h2 className="text-2xl font-bold text-red-400 uppercase tracking-tighter">Movie Management</h2>
                <button 
                    onClick={() => handleSelectMovie('new')} 
                    className="bg-green-600 hover:bg-green-700 text-white font-black py-2.5 px-8 rounded-lg text-[10px] uppercase tracking-widest transition-all transform hover:scale-105"
                >
                    + Create New Entry
                </button>
            </div>

            {!formData ? (
                <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-700 bg-gray-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h3 className="font-black text-gray-300 uppercase text-[10px] tracking-[0.3em]">Master Film List</h3>
                        <div className="relative w-full sm:w-64">
                            <input 
                                type="text" 
                                placeholder="Search catalog..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="form-input !py-1.5 !pl-9 text-xs"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50 text-[10px] uppercase tracking-[0.2em] text-gray-500">
                                <tr>
                                    <th className="p-4">Film & Director</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredMovies.map(movie => (
                                    <tr key={movie.key} className="hover:bg-gray-700/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-4">
                                                <img src={movie.poster} alt="" className="w-10 h-14 object-cover rounded shadow-lg bg-gray-900" />
                                                <div>
                                                    <p className="font-black text-white uppercase tracking-tighter leading-tight">{movie.title}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-0.5">{movie.director}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end items-center gap-3">
                                                <button 
                                                    onClick={() => setSocialKitMovie(movie)}
                                                    className="p-2 bg-white/5 hover:bg-indigo-600 text-gray-400 hover:text-white rounded-lg border border-white/5 transition-all group"
                                                    title="Generate Social Kit"
                                                >
                                                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button onClick={() => handleSelectMovie(movie.key)} className="bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white font-black py-1.5 px-4 rounded text-[10px] uppercase tracking-widest transition-all">Edit</button>
                                                <button onClick={() => handleDelete(movie.key, movie.title)} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black py-1.5 px-4 rounded text-[10px] uppercase tracking-widest transition-all">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 bg-gray-800 p-8 rounded-2xl border border-gray-700 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-6">
                        <div>
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{formData.title || 'New Entry'}</h3>
                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.4em] mt-1">Film Record Editing Module</p>
                        </div>
                        <button onClick={() => setSelectedMovieKey('')} className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" /></svg>
                            Cancel & Exit
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

                    <div className="p-8 bg-indigo-900/10 border border-indigo-500/20 rounded-3xl">
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-indigo-400 uppercase tracking-tighter">Laurel Accreditation</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="form-label">Award Category</label>
                                    <input type="text" name="awardName" value={formData.awardName || ''} onChange={handleChange} className="form-input" placeholder="e.g. Official Selection" />
                                </div>
                                <div>
                                    <label className="form-label">Award Year</label>
                                    <input type="text" name="awardYear" value={formData.awardYear || ''} onChange={handleChange} className="form-input" placeholder="2026" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 flex items-center justify-between gap-6 border-t border-gray-700">
                        <div className="flex items-center gap-4">
                            <button onClick={handleSave} disabled={isSaving} className="bg-red-600 hover:bg-red-500 text-white font-black py-4 px-12 rounded-xl transition-all shadow-xl shadow-red-900/40 text-xs uppercase tracking-widest">
                                {isSaving ? 'Publishing...' : 'Save & Publish Catalog'}
                            </button>
                            <button onClick={handleSetNowStreamingClick} className="bg-white/5 hover:bg-white/10 text-gray-300 font-black py-4 px-8 rounded-xl transition-all border border-white/10 text-xs uppercase tracking-widest">
                                Feature on Feed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {socialKitMovie && (
                <SocialKitModal 
                    title={socialKitMovie.title}
                    synopsis={socialKitMovie.synopsis}
                    director={socialKitMovie.director}
                    onClose={() => setSocialKitMovie(null)}
                />
            )}
        </div>
    );
};

export default MovieEditor;