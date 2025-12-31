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
    const [isPurging, setIsPurging] = useState(false);
    const [isSpotlighting, setIsSpotlighting] = useState(false);
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
                publishedAt: new Date().toISOString(),
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

    const handleUpdateActorField = (index: number, field: keyof Actor, value: string) => {
        if (!formData) return;
        const updatedCast = [...formData.cast];
        updatedCast[index] = { ...updatedCast[index], [field]: value };
        setFormData({ ...formData, cast: updatedCast });
    };

    const handleSave = async () => {
        if (!formData) return;
        setIsSaving(true);
        try {
            await onSave({ [formData.key]: formData });
            setSelectedMovieKey('');
        } catch (err) {
            alert("Save failed. Connection error.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!formData) return;
        if (!window.confirm(`PERMANENT ACTION: Purge "${formData.title}"? This cannot be reversed.`)) return;
        setIsPurging(true);
        try {
            await onDeleteMovie(formData.key);
            setSelectedMovieKey('');
        } catch (err) {
            alert("Purge failed. Cloud cluster busy.");
        } finally {
            setIsPurging(false);
        }
    };

    const handleSpotlight = async () => {
        if (!formData) return;
        setIsSpotlighting(true);
        try {
            await onSetNowStreaming(formData.key);
            setSelectedMovieKey('');
        } catch (err) {
            alert("Spotlight update failed.");
        } finally {
            setIsSpotlighting(false);
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
                                    <tr key={movie.key} className="hover:bg-white/[0.01] group transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-14 bg-black rounded border border-white/10 overflow-hidden shadow-inner">
                                                    {movie.poster && <img src={movie.poster} className="w-full h-full object-cover" />}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-white uppercase text-sm tracking-tight">{movie.title || 'Untitled'}</span>
                                                    <p className="text-[9px] text-gray-600 font-black uppercase mt-1 tracking-widest">
                                                        Ingested: {movie.publishedAt ? new Date(movie.publishedAt).toLocaleDateString() : 'N/A'}
                                                        {movie.isForSale && <span className="ml-2 text-green-600">$ Paywall</span>}
                                                        {movie.isUnlisted && <span className="ml-2 text-amber-500">🔒 Watch Party Only</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button onClick={() => setSelectedMovieKey(movie.key)} className="text-white bg-white/5 hover:bg-white/10 font-black text-[9px] uppercase px-4 py-2 rounded-lg border border-white/5 transition-all">Edit Manifest</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-[#0f0f0f] rounded-[2.5rem] border border-white/5 p-8 md:p-12 space-y-12 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-10 gap-6">
                        <div>
                            <h3 className="text-4xl font-black text-white uppercase tracking-tighter">{formData.title || 'Draft Master'}</h3>
                            <p className="text-[10px] text-gray-600 font-black uppercase mt-2 tracking-[0.4em]">UUID: {formData.key}</p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <button 
                                onClick={handleSpotlight}
                                disabled={isSpotlighting}
                                className="bg-red-600/10 border border-red-500/30 text-red-500 px-6 py-3 rounded-xl uppercase text-[10px] font-black hover:bg-red-600 hover:text-white transition-all shadow-lg disabled:opacity-50"
                            >
                                {isSpotlighting ? 'Syncing...' : 'Set as Spotlight'}
                            </button>
                            <button onClick={() => setSelectedMovieKey('')} className="bg-white/5 text-gray-400 px-6 py-3 rounded-xl uppercase text-[10px] font-black">Catalog Root</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div className="space-y-10">
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">01. Identity</h4>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Title" className="form-input bg-black/40" />
                                <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={6} placeholder="Synopsis" className="form-input bg-black/40" />
                                <input type="text" name="director" value={formData.director} onChange={handleChange} placeholder="Director" className="form-input bg-black/40" />
                                <div className="pt-4">
                                     <label className="form-label">Premiere Release Date (Sets "Coming Soon")</label>
                                     <input type="datetime-local" name="releaseDateTime" value={formData.releaseDateTime ? new Date(new Date(formData.releaseDateTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={(e) => setFormData({...formData, releaseDateTime: e.target.value ? new Date(e.target.value).toISOString() : ''})} className="form-input bg-white/20 text-white font-black" />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">02. Visibility & License</h4>
                                <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-6">
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-3 cursor-pointer group border-b border-white/5 pb-4">
                                            <input type="checkbox" name="isUnlisted" checked={formData.isUnlisted} onChange={handleChange} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-amber-500 focus:ring-amber-500" />
                                            <div>
                                                <span className="text-sm font-bold text-amber-500 uppercase tracking-widest group-hover:text-amber-400 transition-colors">Watch Party Only (Unlisted)</span>
                                                <p className="text-[8px] text-gray-600 font-bold uppercase tracking-wider mt-1">Film will be hidden from catalog and search. Available only via direct link.</p>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="checkbox" name="isForSale" checked={formData.isForSale} onChange={handleChange} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-red-600 focus:ring-red-500" />
                                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Lock behind Paywall (Rental)</span>
                                        </label>
                                        {formData.isForSale && (
                                            <div className="pt-2 animate-[fadeIn_0.2s_ease-out]">
                                                <label className="form-label">Rental Price (USD)</label>
                                                <input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange} step="0.01" className="form-input bg-black/40" />
                                            </div>
                                        )}
                                        <label className="flex items-center gap-3 cursor-pointer group pt-4 border-t border-white/5">
                                            <input type="checkbox" name="isSupportEnabled" checked={formData.isSupportEnabled !== false} onChange={handleChange} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-green-600 focus:ring-green-500" />
                                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Enable Community Support (Donations)</span>
                                        </label>
                                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-wider ml-8">Disable if the film contains licensed music or has restricted royalty terms.</p>
                                    </div>
                                    <div className="pt-4 border-t border-white/5">
                                        <label className="form-label">Exhibition Start (Tracking)</label>
                                        <input type="date" value={formData.publishedAt?.split('T')[0] || ''} onChange={(e) => setFormData({...formData, publishedAt: e.target.value ? new Date(e.target.value).toISOString() : ''})} className="form-input bg-white/20 text-white font-black" />
                                    </div>
                                </div>
                            </section>
                        </div>
                        <div className="space-y-10">
                             <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">03. Master Files</h4>
                                <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-4">
                                    <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} placeholder="Film URL" className="form-input bg-black/40" />
                                    <S3Uploader label="Ingest Film Master" onUploadSuccess={(url) => setFormData({...formData, fullMovie: url})} />
                                    <input type="text" name="trailer" value={formData.trailer} onChange={handleChange} placeholder="Trailer URL" className="form-input bg-black/40" />
                                    <S3Uploader label="Ingest Trailer" onUploadSuccess={(url) => setFormData({...formData, trailer: url})} />
                                    <input type="text" name="poster" value={formData.poster} onChange={handleChange} placeholder="Poster URL" className="form-input bg-black/40" />
                                    <S3Uploader label="Ingest Poster" onUploadSuccess={(url) => setFormData({...formData, poster: url})} />
                                </div>
                            </section>
                             <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">04. Cast Manifest</h4>
                                <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-6">
                                    <div className="grid grid-cols-1 gap-4 border-b border-white/5 pb-6">
                                        <input type="text" value={newActorName} onChange={e => setNewActorName(e.target.value)} placeholder="Performer Name" className="form-input bg-black/40" />
                                        <textarea value={newActorBio} onChange={e => setNewActorBio(e.target.value)} placeholder="Biography" className="form-input bg-black/40" rows={2} />
                                        <button onClick={handleAddActor} className="bg-white/10 w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all">Add Performer</button>
                                    </div>
                                    
                                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                        {formData.cast.map((actor, idx) => (
                                            <div key={idx} className="bg-black/60 p-5 rounded-2xl border border-white/5 space-y-4 relative group">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-black text-white uppercase tracking-tight">{actor.name}</span>
                                                    <button onClick={() => { const c = [...formData.cast]; c.splice(idx, 1); setFormData({...formData, cast: c}); }} className="text-gray-600 hover:text-red-500 font-black text-[10px] uppercase">Remove</button>
                                                </div>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <textarea 
                                                        value={actor.bio} 
                                                        onChange={(e) => handleUpdateActorField(idx, 'bio', e.target.value)}
                                                        className="w-full bg-white/5 border-none rounded-lg p-3 text-xs text-gray-400 focus:ring-1 focus:ring-red-500/50 resize-none h-20"
                                                        placeholder="Biography..."
                                                    />
                                                    <div>
                                                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Photo URL (High Resolution)</label>
                                                        <input 
                                                            type="text" 
                                                            value={actor.photo} 
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                const updatedCast = [...formData.cast];
                                                                updatedCast[idx] = { ...updatedCast[idx], photo: val, highResPhoto: val };
                                                                setFormData({ ...formData, cast: updatedCast });
                                                            }}
                                                            className="w-full bg-white/5 border-none rounded-lg p-2 text-[10px] text-gray-300"
                                                            placeholder="Enter high-res image link..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                    <div className="pt-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
                        <button 
                            onClick={handleDelete} 
                            disabled={isPurging}
                            className="text-gray-600 hover:text-red-500 font-black uppercase text-[10px] tracking-widest transition-colors disabled:opacity-20"
                        >
                            {isPurging ? 'Purging Global Record...' : 'Purge Global Manifest'}
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-black py-5 px-20 rounded-2xl uppercase tracking-[0.2em] shadow-2xl shadow-red-900/40 transition-all active:scale-95 disabled:opacity-20">
                            {isSaving ? 'Synchronizing Cluster...' : 'Commit Changes'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieEditor;