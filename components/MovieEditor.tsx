import React, { useState, useEffect } from 'react';
import { Movie, Actor, Category } from '../types';
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
    isWatchPartyEnabled: false,
    watchPartyStartTime: '',
    isForSale: false,
    salePrice: 0,
};

const MovieEditor: React.FC<MovieEditorProps> = ({ allMovies, categories, onSave, onDelete }) => {
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [filter, setFilter] = useState('');
    const [castList, setCastList] = useState<Actor[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (selectedMovie) {
            setCastList(selectedMovie.cast || []);
        } else {
            setCastList([]);
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
        } else if (type === 'checkbox') {
             processedValue = (e.target as HTMLInputElement).checked;
        }

        setSelectedMovie({ ...selectedMovie, [name]: processedValue });
    };

    const handleCastChange = (index: number, field: keyof Actor, value: string) => {
        const newCast = [...castList];
        newCast[index] = { ...newCast[index], [field]: value };
        setCastList(newCast);
    };

    const addActor = () => {
        setCastList([...castList, { name: '', photo: '', bio: '', highResPhoto: '' }]);
    };

    const removeActor = (index: number) => {
        setCastList(castList.filter((_, i) => i !== index));
    };
    
    const handleUrlUpdate = (field: keyof Movie, url: string) => {
      setSelectedMovie(m => m ? ({ ...m, [field]: url }) : null)
    };

    const handleSave = async () => {
        if (!selectedMovie) return;
        setIsSaving(true);
        try {
            const movieToSave = { ...selectedMovie, cast: castList };
            await onSave(movieToSave);
            alert('Movie saved successfully!');
            if (isNew) {
                // After saving a new movie, reset the form for another new entry
                handleAddNew();
            } else {
                setSelectedMovie(null);
            }
        } catch (error) {
            alert(`Error saving movie: ${error instanceof Error ? error.message : 'An error occurred.'}`);
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
            <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-bold mb-4">Select a Movie</h3>
                <input type="text" placeholder="Filter movies..." value={filter} onChange={e => setFilter(e.target.value)} className={`${formInputClasses} mb-4`} />
                <button onClick={handleAddNew} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4">
                    + Add New Movie
                </button>
                <div className="max-h-screen overflow-y-auto grid grid-cols-3 gap-2">
                    {filteredMovies.map(movie => (
                        <div key={movie.key} onClick={() => handleSelectMovie(movie)} className={`relative aspect-[2/3] rounded cursor-pointer overflow-hidden border-2 ${selectedMovie?.key === movie.key ? 'border-red-500' : 'border-transparent hover:border-gray-500'}`}>
                            <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover bg-gray-600" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-1">
                                <span className="text-white text-xs font-bold leading-tight line-clamp-2">{movie.title}</span>
                             </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="md:col-span-2 bg-gray-800 p-4 rounded-lg border border-gray-700">
                {selectedMovie ? (
                    <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                        <h3 className="text-lg font-bold">{isNew ? 'Add New Movie' : `Editing: ${selectedMovie.title}`}</h3>
                        <div><label className={labelClasses}>Key</label><input type="text" name="key" value={selectedMovie.key} onChange={handleChange} disabled={!isNew} className={`${formInputClasses} disabled:bg-gray-600`} /></div>
                        <div><label className={labelClasses}>Title</label><input type="text" name="title" value={selectedMovie.title} onChange={handleChange} className={formInputClasses} required/></div>
                        <div><label className={labelClasses}>Synopsis (HTML supported)</label><textarea name="synopsis" value={selectedMovie.synopsis} onChange={handleChange} className={formInputClasses} rows={4} /></div>
                        <div><label className={labelClasses}>Director(s)</label><input type="text" name="director" value={selectedMovie.director} onChange={handleChange} className={formInputClasses} /></div>
                        <div><label className={labelClasses}>Producer(s)</label><input type="text" name="producers" value={selectedMovie.producers || ''} onChange={handleChange} className={formInputClasses} /></div>
                        
                        <div className="space-y-4 pt-4 border-t border-gray-700">
                            <h4 className="text-md font-semibold text-gray-200">Cast</h4>
                            {castList.map((actor, index) => (
                                <div key={index} className="bg-gray-700/50 p-3 rounded-lg border border-gray-600 space-y-2 relative">
                                    <button type="button" onClick={() => removeActor(index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-400">&times;</button>
                                    <input type="text" placeholder="Actor Name" value={actor.name} onChange={e => handleCastChange(index, 'name', e.target.value)} className={formInputClasses} />
                                    <textarea placeholder="Bio" value={actor.bio} onChange={e => handleCastChange(index, 'bio', e.target.value)} className={formInputClasses} rows={2} />
                                    <input type="text" placeholder="Photo URL (Square)" value={actor.photo} onChange={e => handleCastChange(index, 'photo', e.target.value)} className={formInputClasses} />
                                    <input type="text" placeholder="High-Res Photo URL" value={actor.highResPhoto} onChange={e => handleCastChange(index, 'highResPhoto', e.target.value)} className={formInputClasses} />
                                </div>
                            ))}
                            <button type="button" onClick={addActor} className="text-sm bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md">+ Add Actor</button>
                        </div>

                        <div><label className={labelClasses}>Duration (minutes)</label><input type="number" name="durationInMinutes" value={selectedMovie.durationInMinutes || ''} onChange={handleChange} className={formInputClasses} /></div>
                        <div><label className={labelClasses}>Release Date/Time (optional)</label><input type="datetime-local" name="releaseDateTime" value={selectedMovie.releaseDateTime || ''} onChange={handleChange} className={formInputClasses} /></div>
                        <div><label className={labelClasses}>Main Page Expiry (optional)</label><input type="datetime-local" name="mainPageExpiry" value={selectedMovie.mainPageExpiry || ''} onChange={handleChange} className={formInputClasses} /></div>

                        <div className="pt-4 border-t border-gray-700 space-y-4">
                            <h4 className="text-md font-semibold text-green-400">Monetization</h4>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" name="isForSale" checked={selectedMovie.isForSale || false} onChange={handleChange} className="h-4 w-4" />
                                <label className={labelClasses}>Enable for Individual Sale</label>
                            </div>
                            <p className="text-xs text-gray-400 -mt-3 ml-6">Used for VOD purchase or for setting a price on a Watch Party.</p>
                            <div>
                                <label className={labelClasses}>Sale Price (USD)</label>
                                <input type="number" name="salePrice" value={selectedMovie.salePrice || ''} onChange={handleChange} className={formInputClasses} disabled={!selectedMovie.isForSale} min="0.99" step="0.01" />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-700 space-y-4">
                            <h4 className="text-md font-semibold text-pink-400">Watch Party Settings</h4>
                            <div className="flex items-center gap-2"><input type="checkbox" name="isWatchPartyEnabled" checked={selectedMovie.isWatchPartyEnabled || false} onChange={handleChange} className="h-4 w-4" /><label className={labelClasses}>Enable Watch Party for this film</label></div>
                            <div><label className={labelClasses}>Watch Party Start Time</label><input type="datetime-local" name="watchPartyStartTime" value={selectedMovie.watchPartyStartTime || ''} onChange={handleChange} className={formInputClasses} disabled={!selectedMovie.isWatchPartyEnabled} /></div>
                        </div>

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