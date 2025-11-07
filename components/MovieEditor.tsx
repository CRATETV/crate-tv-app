import React, { useState, useEffect } from 'react';
import { Movie } from '../types';
import S3Uploader from './S3Uploader';

interface MovieEditorProps {
    allMovies: Movie[];
    categories: Record<string, any>;
    onSave: (movie: Movie, isNew: boolean) => Promise<void>;
    onDelete: (key: string) => Promise<void>;
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
    releaseDateTime: '',
    durationInMinutes: 0,
    rating: 0,
    hasCopyrightMusic: false,
    isWatchPartyEnabled: false,
    watchPartyStartTime: '',
    isForSale: false,
    salePrice: 0,
};

export const MovieEditor: React.FC<MovieEditorProps> = ({ allMovies, onSave, onDelete }) => {
    const [movies, setMovies] = useState<Movie[]>(allMovies);
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [filter, setFilter] = useState('');
    const [castJson, setCastJson] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setMovies(allMovies);
    }, [allMovies]);

    const handleSelectMovie = (movie: Movie) => {
        setSelectedMovie(JSON.parse(JSON.stringify(movie))); // Deep copy to avoid direct mutation
        setCastJson(JSON.stringify(movie.cast, null, 2));
        setIsNew(false);
    };

    const handleCreateNew = () => {
        const newMovie = { ...emptyMovie, key: `newmovie${Date.now()}` };
        setSelectedMovie(newMovie);
        setCastJson('[]');
        setIsNew(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!selectedMovie) return;
        const { name, value, type } = e.target;
        
        let processedValue: any = value;
        if (type === 'checkbox') {
            processedValue = (e.target as HTMLInputElement).checked;
        } else if (type === 'number') {
            processedValue = Number(value);
        }

        setSelectedMovie({ ...selectedMovie, [name]: processedValue });
    };
    
    const handleUrlUpdate = (field: keyof Movie, url: string) => {
        if (selectedMovie) {
            setSelectedMovie({ ...selectedMovie, [field]: url });
        }
    };
    
    const handleCastChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCastJson(e.target.value);
        try {
            const parsedCast = JSON.parse(e.target.value);
            if (Array.isArray(parsedCast) && selectedMovie) {
                setSelectedMovie({ ...selectedMovie, cast: parsedCast });
            }
        } catch (error) {
            // Ignore parse errors while typing
        }
    };
    
    const handleSave = async () => {
        if (!selectedMovie) return;
        setIsSaving(true);
        try {
            // Final validation of cast JSON
            const parsedCast = JSON.parse(castJson);
            const movieToSave = { ...selectedMovie, cast: parsedCast };
            await onSave(movieToSave, isNew);
            if (isNew) {
                // After saving a new movie, it's no longer "new"
                setIsNew(false);
            }
            alert('Movie saved successfully! Publish your changes to make them live.');
        } catch (error) {
            alert("Error parsing Cast JSON. Please ensure it is a valid JSON array of objects.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (!selectedMovie || isNew) return;
        if (window.confirm(`Are you sure you want to delete "${selectedMovie.title}"? This cannot be undone.`)) {
            setIsSaving(true);
            await onDelete(selectedMovie.key);
            setSelectedMovie(null);
            setIsSaving(false);
        }
    };
    
    const filteredMovies = movies.filter(m => m.title.toLowerCase().includes(filter.toLowerCase()));

    const formatISOForInput = (isoString?: string): string => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return '';
            return isoString.slice(0, 16);
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-gray-900/50 p-4 rounded-lg border border-gray-700 max-h-[80vh] flex flex-col">
                <div className="flex gap-2 mb-4">
                    <input 
                        type="text"
                        placeholder="Search movies..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="form-input flex-grow"
                    />
                    <button onClick={handleCreateNew} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md text-sm whitespace-nowrap">
                        + New
                    </button>
                </div>
                <ul className="overflow-y-auto">
                    {filteredMovies.map(movie => (
                        <li 
                            key={movie.key}
                            onClick={() => handleSelectMovie(movie)}
                            className={`p-2 rounded-md cursor-pointer text-sm ${selectedMovie?.key === movie.key ? 'bg-red-600 text-white' : 'hover:bg-gray-700'}`}
                        >
                            {movie.title}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="md:col-span-2 bg-gray-900/50 p-4 rounded-lg border border-gray-700 max-h-[80vh] overflow-y-auto">
                {selectedMovie ? (
                    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                        <h3 className="text-xl font-bold">{isNew ? 'Creating New Movie' : `Editing: ${selectedMovie.title}`}</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="form-label">Key</label><input type="text" name="key" value={selectedMovie.key} onChange={handleChange} className="form-input" disabled={!isNew} /></div>
                            <div><label className="form-label">Title</label><input type="text" name="title" value={selectedMovie.title} onChange={handleChange} className="form-input" /></div>
                        </div>
                        
                        <div><label className="form-label">Synopsis</label><textarea name="synopsis" value={selectedMovie.synopsis} onChange={handleChange} className="form-input" rows={4}></textarea></div>
                        
                        <div>
                            <label className="form-label">Cast (JSON Array)</label>
                            <textarea name="cast" value={castJson} onChange={handleCastChange} className="form-input font-mono text-xs" rows={8}></textarea>
                            <p className="text-xs text-gray-400 mt-1">Edit the JSON array directly. Each object must have name, photo, bio, highResPhoto properties.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="form-label">Director</label><input type="text" name="director" value={selectedMovie.director} onChange={handleChange} className="form-input" /></div>
                            <div><label className="form-label">Producers</label><input type="text" name="producers" value={selectedMovie.producers || ''} onChange={handleChange} className="form-input" /></div>
                        </div>

                        <div><label className="form-label">Poster URL</label><input type="text" name="poster" value={selectedMovie.poster} onChange={handleChange} className="form-input" /><S3Uploader label="Upload Poster" onUploadSuccess={(url) => handleUrlUpdate('poster', url)} /></div>
                        <div><label className="form-label">TV Poster URL</label><input type="text" name="tvPoster" value={selectedMovie.tvPoster} onChange={handleChange} className="form-input" /><S3Uploader label="Upload TV Poster" onUploadSuccess={(url) => handleUrlUpdate('tvPoster', url)} /></div>
                        <div><label className="form-label">Trailer URL</label><input type="text" name="trailer" value={selectedMovie.trailer} onChange={handleChange} className="form-input" /><S3Uploader label="Upload Trailer" onUploadSuccess={(url) => handleUrlUpdate('trailer', url)} /></div>
                        <div><label className="form-label">Full Movie URL</label><input type="text" name="fullMovie" value={selectedMovie.fullMovie} onChange={handleChange} className="form-input" /><S3Uploader label="Upload Full Movie" onUploadSuccess={(url) => handleUrlUpdate('fullMovie', url)} /></div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                             <div><label className="form-label">Duration (mins)</label><input type="number" name="durationInMinutes" value={selectedMovie.durationInMinutes || ''} onChange={handleChange} className="form-input" /></div>
                             <div><label className="form-label">Rating</label><input type="number" step="0.1" name="rating" value={selectedMovie.rating || ''} onChange={handleChange} className="form-input" /></div>
                             <div><label className="form-label">Release Date/Time</label><input type="datetime-local" name="releaseDateTime" value={formatISOForInput(selectedMovie.releaseDateTime)} onChange={handleChange} className="form-input" /></div>
                        </div>
                        
                         <div className="flex flex-wrap gap-6 pt-4">
                            <label className="flex items-center gap-2"><input type="checkbox" name="hasCopyrightMusic" checked={selectedMovie.hasCopyrightMusic || false} onChange={handleChange} /> Has Copyright Music</label>
                            <label className="flex items-center gap-2"><input type="checkbox" name="isWatchPartyEnabled" checked={selectedMovie.isWatchPartyEnabled || false} onChange={handleChange} /> Enable Watch Party</label>
                            <label className="flex items-center gap-2"><input type="checkbox" name="isForSale" checked={selectedMovie.isForSale || false} onChange={handleChange} /> Is For Sale (VOD)</label>
                        </div>
                        
                        {selectedMovie.isForSale && (
                             <div><label className="form-label">Sale Price ($)</label><input type="number" step="0.01" name="salePrice" value={selectedMovie.salePrice || ''} onChange={handleChange} className="form-input" /></div>
                        )}
                        
                        <div className="flex gap-4 pt-4 border-t border-gray-700">
                             <button type="button" onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-600">{isSaving ? 'Saving...' : 'Save Changes'}</button>
                             {!isNew && <button type="button" onClick={handleDelete} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-600">{isSaving ? '...' : 'Delete Movie'}</button>}
                        </div>

                    </form>
                ) : (
                    <div className="text-center text-gray-500 py-20">
                        <p>Select a movie on the left to edit, or create a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
