
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

    const handleCastChange = (index: number, field: keyof Actor, value: string) => {
        if (!formData) return;
        const newCast = [...formData.cast];
        newCast[index] = { ...newCast[index], [field]: value };
        setFormData({ ...formData, cast: newCast });
    };

    const addCastMember = () => {
        if (!formData) return;
        const newCastMember: Actor = { name: '', photo: '', bio: '', highResPhoto: '' };
        setFormData({ ...formData, cast: [...formData.cast, newCastMember] });
    };
    
    const removeCastMember = (index: number) => {
        if (!formData) return;
        const newCast = formData.cast.filter((_: Actor, i: number) => i !== index);
        setFormData({ ...formData, cast: newCast });
    };

    const handleSave = async () => {
        if (!formData) return;
        setIsSaving(true);
        try {
            await onSave({ [formData.key]: formData }, sourcePipelineId);
            setSourcePipelineId(null);
            setSelectedMovieKey(''); // Go back to list after save
        } catch (err) {
            console.error("Save failed:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (key: string, title: string) => {
        if (!window.confirm(`Are you sure you want to permanently delete "${title}"? This will remove it from all categories and cannot be undone.`)) {
            return;
        }

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
            setIsDeleting(false);
        }
    };

    const handleSetNowStreamingClick = async () => {
        if (!formData || !formData.key) return;
        if (!window.confirm(`Are you sure you want to set "${formData.title}" as the main "Now Streaming" feature?`)) {
            return;
        }
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
                        <h3 className="font-bold text-gray-300">Master Film List ({Object.keys(allMovies).length} Entries)</h3>
                        <div className="relative w-full sm:w-64">
                            <input 
                                type="text" 
                                placeholder="Search by title..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="form-input !py-1.5 !pl-9 text-sm"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50 text-xs uppercase tracking-widest text-gray-500">
                                <tr>
                                    <th className="p-4">Film</th>
                                    <th className="p-4">Director</th>
                                    <th className="p-4">ID / Key</th>
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
                                                {movie.isCratemas && <span className="text-[10px] bg-red-600/30 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 font-bold uppercase tracking-tighter">Cratemas</span>}
                                                {movie.awardName && <span className="text-[10px] bg-yellow-600/30 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/30 font-bold uppercase tracking-tighter">Award</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-400">{movie.director}</td>
                                        <td className="p-4 font-mono text-xs text-gray-500">{movie.key}</td>
                                        <td className="p-4 text-right space-x-2">
                                            <button 
                                                onClick={() => handleSelectMovie(movie.key)}
                                                className="text-blue-400 hover:text-blue-300 font-bold text-xs uppercase tracking-wider"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(movie.key, movie.title)}
                                                className="text-red-500 hover:text-red-400 font-bold text-xs uppercase tracking-wider"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredMovies.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-gray-500 italic">No films found matching your search.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 bg-gray-800 p-6 rounded-lg border border-gray-700 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                        <h3 className="text-xl font-bold text-white">
                            {formData.key.startsWith('newmovie') ? 'New Film Entry' : `Editing: ${formData.title}`}
                        </h3>
                        <button onClick={() => setSelectedMovieKey('')} className="text-gray-400 hover:text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            Back to List
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="form-label">Internal Key (ID)</label>
                            <input type="text" name="key" value={formData.key} readOnly className="form-input bg-gray-900 cursor-not-allowed text-gray-500" />
                        </div>
                        <div>
                            <label className="form-label">Film Title</label>
                            <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-input" />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Synopsis (HTML allowed)</label>
                        <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={5} className="form-input" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="form-label">Director(s)</label>
                            <input type="text" name="director" value={formData.director} onChange={handleChange} className="form-input" placeholder="Comma-separated" />
                        </div>
                        <div>
                            <label className="form-label">Producer(s)</label>
                            <input type="text" name="producers" value={formData.producers || ''} onChange={handleChange} className="form-input" placeholder="Comma-separated" />
                        </div>
                    </div>

                    <div className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Full Movie URL (Vimeo/S3)</label>
                                <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} className="form-input" />
                            </div>
                            <div className="pt-7">
                                <S3Uploader label="Or Upload New File" onUploadSuccess={(url) => setFormData({...formData, fullMovie: url})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Poster URL (2:3 Vertical)</label>
                                <input type="text" name="poster" value={formData.poster} onChange={handleChange} className="form-input" />
                            </div>
                             <div className="pt-7">
                                <S3Uploader label="Or Upload New Poster" onUploadSuccess={(url) => setFormData({...formData, poster: url, tvPoster: url})} />
                            </div>
                        </div>
                    </div>

                    {/* Laurel Award Section */}
                    <div className="p-4 bg-yellow-900/10 border border-yellow-500/20 rounded-lg">
                        <h3 className="text-lg font-bold text-yellow-500 mb-4 uppercase tracking-tighter">Festival Laurel Award (Auto-Overlay)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label text-xs">Award Name (e.g., Best Director)</label>
                                <input type="text" name="awardName" value={formData.awardName || ''} onChange={handleChange} className="form-input" placeholder="Best Director" />
                            </div>
                            <div>
                                <label className="form-label text-xs">Award Year</label>
                                <input type="text" name="awardYear" value={formData.awardYear || ''} onChange={handleChange} className="form-input" placeholder="2026" />
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2 italic">If set, a professional laurel will automatically appear on the film's poster across the entire platform.</p>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2 border-l-4 border-red-500 pl-3">Cast</h3>
                        {formData.cast.map((actor: Actor, index: number) => (
                             <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 bg-gray-900/30 rounded-lg mb-2 border border-gray-700/50">
                                <input type="text" value={actor.name} onChange={(e) => handleCastChange(index, 'name', e.target.value)} placeholder="Actor Name" className="form-input !py-1 text-sm" />
                                <input type="text" value={actor.bio} onChange={(e) => handleCastChange(index, 'bio', e.target.value)} placeholder="Bio" className="form-input !py-1 text-sm" />
                                <div className="flex items-center gap-2">
                                    <input type="text" value={actor.photo} onChange={(e) => handleCastChange(index, 'photo', e.target.value)} placeholder="Photo URL" className="form-input !py-1 text-sm flex-grow" />
                                    <button onClick={() => removeCastMember(index)} className="text-red-500 hover:text-red-400 p-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button onClick={addCastMember} className="text-xs bg-gray-700 hover:bg-gray-600 text-white font-bold py-1.5 px-4 rounded-md mt-2">+ Add Cast Member</button>
                    </div>

                    <div className="pt-6 border-t border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-300 mb-4 border-l-4 border-purple-500 pl-3">Technical Data</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="form-label text-xs">Rating (0-10)</label>
                                <input type="number" name="rating" value={formData.rating || 0} onChange={handleChange} className="form-input" step="0.1" min="0" max="10" />
                            </div>
                            <div>
                                <label className="form-label text-xs">Duration (mins)</label>
                                <input type="number" name="durationInMinutes" value={formData.durationInMinutes || 0} onChange={handleChange} className="form-input" />
                            </div>
                             <div>
                                <label className="form-label text-xs">Premiere Date</label>
                                <input type="datetime-local" name="releaseDateTime" value={(formData.releaseDateTime || '').slice(0, 16)} onChange={handleChange} className="form-input" />
                            </div>
                             <div className="flex items-center pt-6">
                                <input type="checkbox" id="copyright" name="hasCopyrightMusic" checked={formData.hasCopyrightMusic || false} onChange={handleChange} className="h-5 w-5 bg-gray-700 border-gray-600 text-red-600 rounded" />
                                <label htmlFor="copyright" className="ml-2 text-xs text-gray-400 font-bold uppercase tracking-widest">Copyright Music</label>
                            </div>
                        </div>
                        {/* Festive Cratemas Logic */}
                        <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center justify-between">
                            <div>
                                <h4 className="text-red-400 font-bold text-sm uppercase tracking-widest">Holiday Special</h4>
                                <p className="text-gray-400 text-xs mt-1">If enabled, this film will automatically appear in the "Cratemas" row with festive styling.</p>
                            </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" name="isCratemas" checked={formData.isCratemas || false} onChange={handleChange} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-red-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                        </div>
                    </div>
                    
                    <div className="pt-8 mt-6 border-t border-gray-700 flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleSave} 
                                disabled={isSaving || isDeleting} 
                                className="bg-purple-600 hover:bg-purple-700 text-white font-black py-3 px-8 rounded-lg transition-all transform hover:scale-105 disabled:bg-gray-600 shadow-xl"
                            >
                                {isSaving ? 'Publishing...' : 'Save & Publish Film'}
                            </button>
                            
                            {!formData.key.startsWith('newmovie') && (
                                <button
                                    type="button"
                                    onClick={handleSetNowStreamingClick}
                                    disabled={isSaving || isDeleting}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-black py-3 px-6 rounded-lg transition-all flex items-center gap-2 disabled:bg-gray-600"
                                >
                                    Set as "Now Streaming"
                                </button>
                            )}
                        </div>
                        
                        {!formData.key.startsWith('newmovie') && (
                            <button 
                                type="button"
                                onClick={() => handleDelete(formData.key, formData.title)}
                                disabled={isSaving || isDeleting}
                                className="text-red-500 hover:text-red-400 font-bold uppercase text-sm tracking-widest p-2"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Film Entry'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieEditor;
