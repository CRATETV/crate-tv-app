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
    key: `movie_${Date.now()}`,
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
    onRefresh,
    movieToCreate, 
    onCreationDone 
}) => {
    const [selectedMovieKey, setSelectedMovieKey] = useState<string>('');
    const [formData, setFormData] = useState<Movie | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [newActorName, setNewActorName] = useState('');
    const [newActorBio, setNewActorBio] = useState('');

    useEffect(() => {
        if (movieToCreate) {
            const newKey = `movie_${Date.now()}`;
            setFormData({
                ...emptyMovie,
                key: newKey,
                title: movieToCreate.title,
                synopsis: movieToCreate.synopsis,
                director: movieToCreate.director,
                fullMovie: movieToCreate.movieUrl,
                poster: movieToCreate.posterUrl,
                tvPoster: movieToCreate.posterUrl,
                cast: movieToCreate.cast ? movieToCreate.cast.split(',').map(name => ({
                    name: name.trim(),
                    bio: 'Biographical data pending.',
                    photo: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png',
                    highResPhoto: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png'
                })) : []
            });
            setSelectedMovieKey(newKey);
            onCreationDone?.();
        }
    }, [movieToCreate, onCreationDone]);

    useEffect(() => {
        if (selectedMovieKey) {
            const movieData = allMovies[selectedMovieKey];
            if (movieData) setFormData({ ...movieData });
            else if (selectedMovieKey.startsWith('movie_')) setFormData({ ...emptyMovie, key: selectedMovieKey });
        } else setFormData(null);
    }, [selectedMovieKey, allMovies]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!formData) return;
        const target = e.target as HTMLInputElement;
        const { name, value, type } = target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? target.checked : (type === 'number' ? parseFloat(value) : value) });
    };

    const handleAddActor = () => {
        if (!formData || !newActorName.trim()) return;
        const newActor: Actor = {
            name: newActorName.trim(),
            photo: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png',
            bio: newActorBio.trim() || 'Cast biography pending.',
            highResPhoto: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png'
        };
        setFormData({ ...formData, cast: [...formData.cast, newActor] });
        setNewActorName('');
        setNewActorBio('');
    };

    const handleSave = async () => {
        if (!formData) return;
        setIsSaving(true);
        try {
            await onSave({ [formData.key]: formData });
            setSelectedMovieKey('');
            onRefresh();
        } catch (err) {
            alert("Error: Save failed. Check network.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!formData) return;
        if (!window.confirm(`PERMANENT ACTION: Purge "${formData.title}" from global database? This will also remove it from all categories.`)) return;
        setIsSaving(true);
        try {
            await onDeleteMovie(formData.key);
            setSelectedMovieKey('');
            onRefresh();
        } catch (err) {
            alert("Delete failed.");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(m => (m.title || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    return (
        <div className="space-y-6 pb-20">
            {!formData ? (
                <div className="bg-[#0f0f0f] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-8 bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-white/5">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest">Studio Catalog</h3>
                        <div className="flex gap-3">
                            <input type="text" placeholder="Filter..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="form-input !py-3 text-xs bg-black/40 border-white/10" />
                            <button onClick={() => setSelectedMovieKey(`movie_${Date.now()}`)} className="bg-red-600 text-white font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest">+ Ingest</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-white/5">
                                {filteredMovies.map(movie => (
                                    <tr key={movie.key} className="hover:bg-white/[0.01] group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-14 bg-black rounded border border-white/10 overflow-hidden">
                                                    {movie.poster && <img src={movie.poster} className="w-full h-full object-cover" />}
                                                </div>
                                                <span className="font-bold text-white uppercase text-sm">{movie.title || 'Untitled'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button onClick={() => setSelectedMovieKey(movie.key)} className="text-white bg-white/5 font-black text-[9px] uppercase px-4 py-2 rounded-lg">Edit Manifest</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-[#0f0f0f] rounded-[2.5rem] border border-white/5 p-8 md:p-12 space-y-12 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex justify-between items-center border-b border-white/5 pb-10">
                        <h3 className="text-4xl font-black text-white uppercase tracking-tighter">{formData.title || 'Draft Master'}</h3>
                        <button onClick={() => setSelectedMovieKey('')} className="bg-white/5 text-gray-400 px-6 py-3 rounded-xl uppercase text-[10px] font-black">Catalog Root</button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div className="space-y-10">
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">01. Identity</h4>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Title" className="form-input bg-black/40" />
                                <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={6} placeholder="Synopsis" className="form-input bg-black/40" />
                                <input type="text" name="director" value={formData.director} onChange={handleChange} placeholder="Director" className="form-input bg-black/40" />
                            </section>
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">02. Media</h4>
                                <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-4">
                                    <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} placeholder="Film URL" className="form-input bg-black/40" />
                                    <S3Uploader label="Ingest High-Bitrate Master" onUploadSuccess={(url) => setFormData({...formData, fullMovie: url})} />
                                    <input type="text" name="poster" value={formData.poster} onChange={handleChange} placeholder="Poster URL" className="form-input bg-black/40" />
                                    <S3Uploader label="Ingest Poster" onUploadSuccess={(url) => setFormData({...formData, poster: url})} />
                                </div>
                            </section>
                        </div>
                        <div className="space-y-10">
                             <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">03. Cast Manifest</h4>
                                <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-4">
                                    <input type="text" value={newActorName} onChange={e => setNewActorName(e.target.value)} placeholder="Actor Name" className="form-input bg-black/40" />
                                    <textarea value={newActorBio} onChange={e => setNewActorBio(e.target.value)} placeholder="Actor Bio" className="form-input bg-black/40" rows={2} />
                                    <button onClick={handleAddActor} className="bg-white/10 w-full py-3 rounded-xl font-black text-[9px] uppercase">Add Performer to Credits</button>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {formData.cast.map((actor, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-black/60 rounded-xl border border-white/5">
                                                <div className="min-w-0 flex-grow">
                                                    <p className="text-sm font-bold text-white truncate">{actor.name}</p>
                                                    <p className="text-[10px] text-gray-500 truncate">{actor.bio}</p>
                                                </div>
                                                <button onClick={() => { const c = [...formData.cast]; c.splice(idx, 1); setFormData({...formData, cast: c}); }} className="text-gray-600 hover:text-red-500 ml-4 font-black text-[10px] uppercase">Remove</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                    <div className="pt-12 border-t border-white/5 flex justify-between">
                        <button onClick={handleDelete} className="text-gray-600 hover:text-red-500 font-black uppercase text-[10px]">Purge Global Manifest</button>
                        <button onClick={handleSave} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white font-black py-5 px-16 rounded-2xl uppercase tracking-widest shadow-2xl">
                            {isSaving ? 'Synchronizing...' : 'Commit Changes'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieEditor;