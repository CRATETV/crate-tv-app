import React, { useState, useEffect } from 'react';
import { Movie, Actor } from '../types';
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
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setMovies(allMovies);
    }, [allMovies]);

    const handleSelectMovie = (movie: Movie) => {
        setSelectedMovie(JSON.parse(JSON.stringify(movie))); // Deep copy to avoid direct mutation
        setIsNew(false);
    };

    const handleCreateNew = () => {
        const newMovie = { ...emptyMovie, key: `newmovie${Date.now()}` };
        setSelectedMovie(newMovie);
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

    const handleCastMemberChange = (index: number, field: keyof Actor, value: string) => {
        if (!selectedMovie) return;
        const updatedCast = [...selectedMovie.cast];
        const actorToUpdate = { ...updatedCast[index] };
        (actorToUpdate as any)[field] = value;
        updatedCast[index] = actorToUpdate;
        setSelectedMovie({ ...selectedMovie, cast: updatedCast });
    };
    
    const addCastMember = () => {
        if (!selectedMovie) return;
        const newCastMember: Actor = { name: '', photo: '', bio: '', highResPhoto: '' };
        setSelectedMovie({ ...selectedMovie, cast: [...selectedMovie.cast, newCastMember] });
    };

    const removeCastMember = (index: number) => {
        if (!selectedMovie) return;
        setSelectedMovie({
            ...selectedMovie,
            cast: selectedMovie.cast.filter((_, i) => i !== index),
        });
    };
    
    const handleUrlUpdate = (field: keyof Movie, url: string) => {
        if (selectedMovie) {
            setSelectedMovie({ ...selectedMovie, [field]: url });
        }
    };
    
    const handleSave = async () => {
        if (!selectedMovie) return;
        setIsSaving(true);
        try {
            await onSave(selectedMovie, isNew);
            if (isNew) {
                setIsNew(false);
            }
            alert('Movie saved successfully! Publish your changes to make them live.');
        } catch (error) {
            alert("Error saving movie. Please check all fields.");
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
                <ul className="overflow-y-auto space-y-2">
                    {filteredMovies.map(movie => (
                        <li 
                            key={movie.key}
                            onClick={() => handleSelectMovie(movie)}
                            className={`p-2 rounded-md cursor-pointer flex items-center gap-3 ${selectedMovie?.key === movie.key ? 'bg-red-600 text-white' : 'hover:bg-gray-700'}`}
                        >
                            <img src={movie.poster} alt={movie.title} className="w-10 h-14 object-cover rounded-sm flex-shrink-0" />
                            <span className="text-sm">{movie.title}</span>
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
                        
                        {/* New Cast Editor */}
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold border-b border-gray-700 pb-2">Cast Members</h4>
                            {selectedMovie.cast.map((actor, index) => (
                                <div key={index} className="bg-gray-800/50 p-3 rounded-md border border-gray-600 space-y-2 relative">
                                    <button type="button" onClick={() => removeCastMember(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-400">&times;</button>
                                    <input type="text" placeholder="Actor Name" value={actor.name} onChange={e => handleCastMemberChange(index, 'name', e.target.value)} className="form-input text-sm" />
                                    <input type="text" placeholder="Photo URL" value={actor.photo} onChange={e => handleCastMemberChange(index, 'photo', e.target.value)} className="form-input text-sm" />
                                    <textarea placeholder="Bio" value={actor.bio} onChange={e => handleCastMemberChange(index, 'bio', e.target.value)} className="form-input text-sm" rows={2}></textarea>
                                    <input type="text" placeholder="High-Res Photo URL" value={actor.highResPhoto} onChange={e => handleCastMemberChange(index, 'highResPhoto', e.target.value)} className="form-input text-sm" />
                                </div>
                            ))}
                            <button type="button" onClick={addCastMember} className="text-sm bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md">+ Add Actor</button>
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