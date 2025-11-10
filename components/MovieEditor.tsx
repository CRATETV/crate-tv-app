import React, { useState, useEffect } from 'react';
import { Movie, Actor } from '../types';

interface MovieEditorProps {
    allMovies: Record<string, Movie>;
    onRefresh: () => void;
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
};

const MovieEditor: React.FC<MovieEditorProps> = ({ allMovies, onRefresh }) => {
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSelectMovie = (key: string) => {
        if (key === 'new') {
            setSelectedMovie({ ...emptyMovie, key: `newmovie${Date.now()}` });
        } else {
            setSelectedMovie(allMovies[key]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!selectedMovie) return;
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
             const { checked } = e.target as HTMLInputElement;
             setSelectedMovie({ ...selectedMovie, [name]: checked });
        } else if (type === 'datetime-local') {
             setSelectedMovie({ ...selectedMovie, [name]: value ? new Date(value).toISOString() : '' });
        } else {
            setSelectedMovie({ ...selectedMovie, [name]: value });
        }
    };

    const handleCastChange = (index: number, field: keyof Actor, value: string) => {
        if (!selectedMovie) return;
        const newCast = [...selectedMovie.cast];
        newCast[index] = { ...newCast[index], [field]: value };
        setSelectedMovie({ ...selectedMovie, cast: newCast });
    };

    const addCastMember = () => {
        if (!selectedMovie) return;
        const newCastMember: Actor = { name: '', photo: '', bio: '', highResPhoto: '' };
        setSelectedMovie({ ...selectedMovie, cast: [...selectedMovie.cast, newCastMember] });
    };
    
    const removeCastMember = (index: number) => {
        if (!selectedMovie) return;
        const newCast = selectedMovie.cast.filter((_, i) => i !== index);
        setSelectedMovie({ ...selectedMovie, cast: newCast });
    };

    const handleSave = async () => {
        if (!selectedMovie) return;
        setIsSaving(true);
        setStatus('idle');

        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, type: 'movies', data: { [selectedMovie.key]: selectedMovie } }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to save.');
            
            setStatus('success');
            setMessage('Movie saved successfully!');
            onRefresh(); // Refresh data in parent
        } catch (err) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSaving(false);
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-red-400">Movie Editor</h2>
                <select onChange={(e) => handleSelectMovie(e.target.value)} className="form-input max-w-xs" defaultValue="">
                    <option value="" disabled>Select a movie to edit...</option>
                    <option value="new">-- Create New Movie --</option>
                    {/* FIX: Cast Object.values to Movie[] to provide a concrete type for sorting and mapping. */}
                    {(Object.values(allMovies) as Movie[]).sort((a, b) => a.title.localeCompare(b.title)).map(movie => (
                        <option key={movie.key} value={movie.key}>{movie.title}</option>
                    ))}
                </select>
            </div>

            {selectedMovie && (
                <div className="space-y-6 bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="form-label">Key (ID)</label>
                            <input type="text" name="key" value={selectedMovie.key} readOnly className="form-input bg-gray-600 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="form-label">Title</label>
                            <input type="text" name="title" value={selectedMovie.title} onChange={handleChange} className="form-input" />
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Synopsis (HTML allowed)</label>
                        <textarea name="synopsis" value={selectedMovie.synopsis} onChange={handleChange} rows={5} className="form-input" />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="form-label">Director(s)</label>
                            <input type="text" name="director" value={selectedMovie.director} onChange={handleChange} className="form-input" placeholder="Comma-separated" />
                        </div>
                        <div>
                            <label className="form-label">Producer(s)</label>
                            <input type="text" name="producers" value={selectedMovie.producers || ''} onChange={handleChange} className="form-input" placeholder="Comma-separated" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="form-label">Full Movie URL</label>
                            <input type="text" name="fullMovie" value={selectedMovie.fullMovie} onChange={handleChange} className="form-input" placeholder="https://cratetelevision.s3..." />
                        </div>
                        <div>
                            <label className="form-label">Web Poster URL (2:3)</label>
                            <input type="text" name="poster" value={selectedMovie.poster} onChange={handleChange} className="form-input" placeholder="https://cratetelevision.s3..." />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Cast</h3>
                        {selectedMovie.cast.map((actor, index) => (
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
                                <input type="number" name="rating" value={selectedMovie.rating || 0} onChange={handleChange} className="form-input" step="0.1" min="0" max="10" />
                            </div>
                            <div>
                                <label className="form-label text-xs">Duration (minutes)</label>
                                <input type="number" name="durationInMinutes" value={selectedMovie.durationInMinutes || 0} onChange={handleChange} className="form-input" />
                            </div>
                             <div>
                                <label className="form-label text-xs">Release Date/Time</label>
                                <input type="datetime-local" name="releaseDateTime" value={(selectedMovie.releaseDateTime || '').slice(0, 16)} onChange={handleChange} className="form-input" />
                            </div>
                             <div className="flex items-center pt-6">
                                <input type="checkbox" id="copyright" name="hasCopyrightMusic" checked={selectedMovie.hasCopyrightMusic || false} onChange={handleChange} className="h-4 w-4 bg-gray-600 border-gray-500 text-red-500 rounded" />
                                <label htmlFor="copyright" className="ml-2 text-sm text-gray-300">Has Copyright Music</label>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-6 mt-6 border-t border-gray-700 flex items-center gap-4">
                        <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-5 rounded-md transition-colors">
                            {isSaving ? 'Saving...' : 'Save Movie'}
                        </button>
                         {status === 'success' && <p className="text-green-500 text-sm">{message}</p>}
                         {status === 'error' && <p className="text-red-500 text-sm">{message}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieEditor;