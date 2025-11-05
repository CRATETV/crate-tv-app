import React, { useState, useEffect } from 'react';
import { Movie, Actor } from '../types';
import S3Uploader from './S3Uploader';

interface MovieEditorProps {
    allMovies: Movie[];
    categories: Record<string, any>;
    onSave: (movie: Movie) => Promise<void>;
    onDelete: (movieKey: string) => Promise<void>;
}

const emptyMovie: Movie = {
    key: '',
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
    mainPageExpiry: '',
    durationInMinutes: 0,
    hasCopyrightMusic: false,
};

const MovieEditor: React.FC<MovieEditorProps> = ({ allMovies, onSave, onDelete }) => {
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [filter, setFilter] = useState('');
    const [castString, setCastString] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (selectedMovie) {
            // Pretty-print the JSON for easier editing
            setCastString(JSON.stringify(selectedMovie.cast, null, 2));
        } else {
            setCastString('');
        }
    }, [selectedMovie]);

    const handleSelectMovie = (movie: Movie) => {
        setSelectedMovie({ ...movie });
        setIsNew(false);
    };

    const handleAddNew = () => {
        const uniqueKey = `newmovie${Date.now()}`;
        setSelectedMovie({ ...emptyMovie, key: uniqueKey });
        setIsNew(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!selectedMovie) return;
        const { name, value, type } = e.target;
        
        let processedValue: string | number | boolean = value;
        if (type === 'number') {
            processedValue = Number(value);
        } else if (name === 'hasCopyrightMusic') {
            processedValue = (e.target as HTMLInputElement).checked;
        }

        setSelectedMovie({ ...selectedMovie, [name]: processedValue });
    };
    
    const handleUrlUpdate = (field: keyof Movie, url: string) => {
      setSelectedMovie(m => m ? ({ ...m, [field]: url }) : null)
    };

    const handleSave = async () => {
        if (!selectedMovie) return;
        setIsSaving(true);
        try {
            const movieToSave = { ...selectedMovie };
            movieToSave.cast = JSON.parse(castString); // This can throw an error
            await onSave(movieToSave);
            alert('Movie saved successfully!');
            if (isNew) {
                // Clear form for next new movie
                handleAddNew();
            } else {
                setSelectedMovie(null);
            }
        } catch (error) {
            alert(`Error saving movie: ${error instanceof Error ? error.message : 'Invalid cast JSON.'}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (!selectedMovie || isNew) return;
        if (window.confirm(`Are you sure you want to delete "${selectedMovie.title}"? This action cannot be undone.`)) {
            await onDelete(selectedMovie.key);
            setSelectedMovie(null);
        }
    };

    const filteredMovies = allMovies.filter(movie => movie.title.toLowerCase().includes(filter.toLowerCase())).sort((a,b) => a.title.localeCompare(b.title));
    const formInputClasses = "form-input";
    const labelClasses = "block text-sm font-medium text-gray-300 mb-1";


    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Movie List Column */}
            <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-bold mb-4">Select a Movie</h3>
                <input type="text" placeholder="Filter movies..." value={filter} onChange={e => setFilter(e.target.value)} className={`${formInputClasses} mb-4`} />
                <button onClick={handleAddNew} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4">
                    + Add New Movie
                </button>
                <ul className="max-h-screen overflow-y-auto">
                    {filteredMovies.map(movie => (
                        <li key={movie.key} onClick={() => handleSelectMovie(movie)} className={`p-2 rounded cursor-pointer text-sm ${selectedMovie?.key === movie.key ? 'bg-red-600' : 'hover:bg-gray-700'}`}>
                            {movie.title}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Editor Form Column */}
            <div className="md:col-span-2 bg-gray-800 p-4 rounded-lg border border-gray-700">
                {selectedMovie ? (
                    <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
                        <h3 className="text-lg font-bold">{isNew ? 'Add New Movie' : `Editing: ${selectedMovie.title}`}</h3>
                        <div><label className={labelClasses}>Key</label><input type="text" name="key" value={selectedMovie.key} onChange={handleChange} disabled={!isNew} className={`${formInputClasses} disabled:bg-gray-600`} /></div>
                        <div><label className={labelClasses}>Title</label><input type="text" name="title" value={selectedMovie.title} onChange={handleChange} className={formInputClasses} required/></div>
                        <div><label className={labelClasses}>Synopsis (HTML supported)</label><textarea name="synopsis" value={selectedMovie.synopsis} onChange={handleChange} className={formInputClasses} rows={4} /></div>
                        <div><label className={labelClasses}>Director(s)</label><input type="text" name="director" value={selectedMovie.director} onChange={handleChange} className={formInputClasses} /></div>
                        <div><label className={labelClasses}>Producer(s)</label><input type="text" name="producers" value={selectedMovie.producers || ''} onChange={handleChange} className={formInputClasses} /></div>
                        <div><label className={labelClasses}>Cast (JSON format)</label><textarea value={castString} onChange={e => setCastString(e.target.value)} className={`${formInputClasses} font-mono`} rows={8} /></div>
                        <div><label className={labelClasses}>Duration (minutes)</label><input type="number" name="durationInMinutes" value={selectedMovie.durationInMinutes || ''} onChange={handleChange} className={formInputClasses} /></div>
                        <div><label className={labelClasses}>Release Date/Time (optional)</label><input type="datetime-local" name="releaseDateTime" value={selectedMovie.releaseDateTime || ''} onChange={handleChange} className={formInputClasses} /></div>
                        <div><label className={labelClasses}>Main Page Expiry (optional)</label><input type="datetime-local" name="mainPageExpiry" value={selectedMovie.mainPageExpiry || ''} onChange={handleChange} className={formInputClasses} /></div>

                        <div><label className={labelClasses}>Trailer URL</label><input type="text" name="trailer" value={selectedMovie.trailer} onChange={handleChange} className={formInputClasses} /><S3Uploader label="Or Upload Trailer" onUploadSuccess={url => handleUrlUpdate('trailer', url)} /></div>
                        <div><label className={labelClasses}>Full Movie URL</label><input type="text" name="fullMovie" value={selectedMovie.fullMovie} onChange={handleChange} className={formInputClasses} required /><S3Uploader label="Or Upload Movie" onUploadSuccess={url => handleUrlUpdate('fullMovie', url)} /></div>
                        <div><label className={labelClasses}>Poster URL</label><input type="text" name="poster" value={selectedMovie.poster} onChange={handleChange} className={formInputClasses} required /><S3Uploader label="Or Upload Poster" onUploadSuccess={url => handleUrlUpdate('poster', url)} /></div>
                        <div><label className={labelClasses}>TV Poster URL</label><input type="text" name="tvPoster" value={selectedMovie.tvPoster || ''} onChange={handleChange} className={formInputClasses} /><S3Uploader label="Or Upload TV Poster" onUploadSuccess={url => handleUrlUpdate('tvPoster', url)} /></div>
                        
                        <div className="flex items-center gap-2 pt-2"><input type="checkbox" name="hasCopyrightMusic" checked={selectedMovie.hasCopyrightMusic || false} onChange={handleChange} className="h-4 w-4" /><label className={labelClasses}>Has Copyright Music (disables donations)</label></div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Movie'}</button>
                            {!isNew && <button type="button" onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Delete Movie</button>}
                        </div>
                    </form>
                ) : (
                    <div className="text-center text-gray-400 h-full flex items-center justify-center">Select a movie to edit or add a new one.</div>
                )}
            </div>
        </div>
    );
};

export default MovieEditor;
