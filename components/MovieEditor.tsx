import React, { useState, useEffect } from 'react';
import { Movie, Actor } from '../types';

interface MovieEditorProps {
    allMovies: Record<string, Movie>;
    onRefresh: () => void;
    onSave: (movieData: Record<string, Movie>) => Promise<void>;
    onDeleteMovie: (movieKey: string) => Promise<void>;
    onSetNowStreaming: (movieKey: string) => Promise<void>;
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
};

const MovieEditor: React.FC<MovieEditorProps> = ({ allMovies, onRefresh, onSave, onDeleteMovie, onSetNowStreaming }) => {
    const [selectedMovieKey, setSelectedMovieKey] = useState<string>('');
    const [formData, setFormData] = useState<Movie | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // This effect populates the form when a movie is selected from the dropdown
    // or when the `allMovies` prop is updated after a save.
    useEffect(() => {
        if (selectedMovieKey) {
            const movieData = allMovies[selectedMovieKey];
            if (movieData) {
                setFormData(movieData);
            } else if (selectedMovieKey.startsWith('newmovie')) {
                // It's a new movie that isn't in allMovies yet
                setFormData({ ...emptyMovie, key: selectedMovieKey });
            } else {
                // The selected movie no longer exists (e.g., was deleted)
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
            await onSave({ [formData.key]: formData });
        } catch (err) {
            // Error is handled by the parent component's toast
            console.error("Save failed:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!formData || !formData.key) return;
        const title = formData.title || 'this movie';
        if (!window.confirm(`Are you sure you want to permanently delete "${title}"? This will remove it from all categories and cannot be undone.`)) {
            return;
        }

        setIsDeleting(true);
        try {
            await onDeleteMovie(formData.key);
            // After successful deletion, clear the form
            setSelectedMovieKey('');
            setFormData(null);
        } catch (err) {
            console.error("Delete failed:", err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSetNowStreamingClick = async () => {
        if (!formData || !formData.key) return;
        if (!window.confirm(`Are you sure you want to set "${formData.title}" as the main "Now Streaming" feature? This will replace the current one.`)) {
            return;
        }
        await onSetNowStreaming(formData.key);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-red-400">Movie Editor</h2>
                <select onChange={(e) => handleSelectMovie(e.target.value)} className="form-input max-w-xs" value={selectedMovieKey}>
                    <option value="" disabled>Select a movie to edit...</option>
                    <option value="new">-- Create New Movie --</option>
                    {(Object.values(allMovies) as Movie[]).sort((a, b) => a.title.localeCompare(b.title)).map(movie => (
                        <option key={movie.key} value={movie.key}>{movie.title}</option>
                    ))}
                </select>
            </div>

            {formData && (
                <div className="space-y-6 bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="form-label">Key (ID)</label>
                            <input type="text" name="key" value={formData.key} readOnly className="form-input bg-gray-600 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="form-label">Title</label>
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
                        <div>
                            <label className="form-label">Full Movie URL</label>
                            <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} className="form-input" placeholder="https://cratetelevision.s3..." />
                        </div>
                        <div>
                            <label className="form-label">Web Poster URL (2:3)</label>
                            <input type="text" name="poster" value={formData.poster} onChange={handleChange} className="form-input" placeholder="https://cratetelevision.s3..." />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Cast</h3>
                        {formData.cast.map((actor: Actor, index: number) => (
                             <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 border-b border-gray-700">
                                <input type="text" value={actor.name} onChange={(e) => handleCastChange(index, 'name', e.target.value)} placeholder="Actor Name" className="form-input !py-1 text-sm" />
                                <input type="text" value={actor.bio} onChange={(e) => handleCastChange(index, 'bio', e.target.value)} placeholder="Bio" className="form-input !py-1 text-sm" />
                                <div>
                                    <input type="text" value={actor.photo} onChange={(e) => handleCastChange(index, 'photo', e.target.value)} placeholder="Photo URL" className="form-input !py-1 text-sm" />
                                    <button onClick={() => removeCastMember(index)} className="text-red-500 text-xs mt-1">Remove</button>
                                </div>
                            </div>
                        ))}
                        <button onClick={addCastMember} className="text-sm bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md mt-2">+ Add Actor</button>
                    </div>

                     <div className="pt-4 mt-4 border-t border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Metadata & Settings</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="form-label text-xs">Rating (0-10)</label>
                                <input type="number" name="rating" value={formData.rating || 0} onChange={handleChange} className="form-input" step="0.1" min="0" max="10" />
                            </div>
                            <div>
                                <label className="form-label text-xs">Duration (minutes)</label>
                                <input type="number" name="durationInMinutes" value={formData.durationInMinutes || 0} onChange={handleChange} className="form-input" />
                            </div>
                             <div>
                                <label className="form-label text-xs">Release Date/Time</label>
                                <input type="datetime-local" name="releaseDateTime" value={(formData.releaseDateTime || '').slice(0, 16)} onChange={handleChange} className="form-input" />
                            </div>
                             <div className="flex items-center pt-6">
                                <input type="checkbox" id="copyright" name="hasCopyrightMusic" checked={formData.hasCopyrightMusic || false} onChange={handleChange} className="h-4 w-4 bg-gray-600 border-gray-500 text-red-500 rounded" />
                                <label htmlFor="copyright" className="ml-2 text-sm text-gray-300">Has Copyright Music</label>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-6 mt-6 border-t border-gray-700 flex flex-wrap items-center justify-between gap-4">
                        <button onClick={handleSave} disabled={isSaving || isDeleting} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-5 rounded-md transition-colors disabled:bg-gray-600">
                            {isSaving ? 'Publishing...' : 'Save & Publish Movie'}
                        </button>
                        
                        {formData && !formData.key.startsWith('newmovie') && (
                             <button
                                type="button"
                                onClick={handleSetNowStreamingClick}
                                disabled={isSaving || isDeleting}
                                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-5 rounded-md transition-colors disabled:bg-gray-600 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Set as Now Streaming
                            </button>
                        )}
                        
                        {formData && !formData.key.startsWith('newmovie') && (
                            <button 
                                type="button"
                                onClick={handleDelete}
                                disabled={isSaving || isDeleting}
                                className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-600"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Movie'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieEditor;