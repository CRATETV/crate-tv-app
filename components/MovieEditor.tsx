import React, { useState, useEffect } from 'react';
import { Movie, Actor, MoviePipelineEntry, Episode } from '../types';
import S3Uploader from './S3Uploader';

interface MovieEditorProps {
    allMovies: Record<string, Movie>;
    onRefresh: () => void;
    onSave: (movieData: Record<string, Movie>) => Promise<void>;
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
    autoReleaseDate: '',
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
    movieToCreate, 
    onCreationDone 
}) => {
    const [selectedMovieKey, setSelectedMovieKey] = useState<string>('');
    const [formData, setFormData] = useState<Movie | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Series/Episode Helper State
    const [newEp, setNewEp] = useState<Episode>({ id: '', title: '', synopsis: '', url: '', duration: 0 });

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

    const handleAddEpisode = () => {
        if (!formData || !newEp.title || !newEp.url) return;
        const ep = { ...newEp, id: 'ep_' + Date.now() };
        setFormData({ ...formData, episodes: [...(formData.episodes || []), ep] });
        setNewEp({ id: '', title: '', synopsis: '', url: '', duration: 0 });
    };

    const handleSave = async () => {
        if (!formData) return;
        setIsSaving(true);
        try {
            await onSave({ [formData.key]: formData });
            setSelectedMovieKey('');
        } catch (err) {
            alert("Save failed.");
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
                        <h3 className="text-xl font-black text-white uppercase tracking-widest">Catalog Records</h3>
                        <div className="flex gap-3">
                            <input type="text" placeholder="Filter..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="form-input !py-3 text-xs bg-black/40 border-white/10" />
                            <button onClick={() => setSelectedMovieKey(`movie_${Date.now()}`)} className="bg-red-600 text-white font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest">+ New Master</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-white/5">
                                {filteredMovies.map(movie => (
                                    <tr key={movie.key} className="hover:bg-white/[0.01] transition-colors">
                                        <td className="px-8 py-6">
                                            <span className="font-bold text-white uppercase text-sm tracking-tight">{movie.title || 'Untitled'}</span>
                                            {movie.isSeries && <span className="ml-3 text-[8px] bg-purple-600 text-white px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Series</span>}
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
                        <button onClick={() => setSelectedMovieKey('')} className="bg-white/5 text-gray-400 px-6 py-3 rounded-xl uppercase text-[10px] font-black">Back to Catalog</button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div className="space-y-10">
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">01. Core Identity</h4>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Film/Series Title" className="form-input bg-black/40" />
                                <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={6} placeholder="Full Treatment/Synopsis" className="form-input bg-black/40" />
                                
                                <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 mt-6">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" name="isSeries" checked={formData.isSeries} onChange={handleChange} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500" />
                                        <span className="text-sm font-bold text-white uppercase tracking-widest">Toggle Series/Show Mode</span>
                                    </label>
                                    <p className="text-[10px] text-gray-500 mt-2">Enabling Series Mode unlocks the episode browser for this project.</p>
                                </div>
                            </section>

                            {formData.isSeries && (
                                <section className="space-y-4 animate-[fadeIn_0.4s_ease-out]">
                                    <h4 className="text-[10px] font-black uppercase text-purple-500 tracking-[0.4em]">02. Episode Browser</h4>
                                    <div className="bg-white/5 p-6 rounded-3xl border border-purple-500/20 space-y-4">
                                        <input value={newEp.title} onChange={e => setNewEp({...newEp, title: e.target.value})} placeholder="Episode Title" className="form-input bg-black/40" />
                                        <input value={newEp.url} onChange={e => setNewEp({...newEp, url: e.target.value})} placeholder="Stream URL (Direct MP4/Vimeo/YT)" className="form-input bg-black/40" />
                                        <button onClick={handleAddEpisode} className="w-full bg-purple-600 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest">Inject Episode</button>
                                        
                                        <div className="space-y-2 mt-6">
                                            {formData.episodes?.map((ep, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                                                    <span className="text-xs font-bold text-white uppercase truncate max-w-[150px]">{ep.title}</span>
                                                    <button onClick={() => {
                                                        const next = [...(formData.episodes || [])];
                                                        next.splice(idx, 1);
                                                        setFormData({...formData, episodes: next});
                                                    }} className="text-red-500 text-[10px] font-black uppercase">Remove</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="space-y-10">
                             <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">03. High-Bitrate Source</h4>
                                <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-4">
                                    <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} placeholder="Canonical Stream Link" className="form-input bg-black/40" />
                                    <S3Uploader label="Ingest New Master" onUploadSuccess={(url) => setFormData({...formData, fullMovie: url})} />
                                    <input type="text" name="poster" value={formData.poster} onChange={handleChange} placeholder="Poster URL" className="form-input bg-black/40" />
                                    <S3Uploader label="Ingest Key Art" onUploadSuccess={(url) => setFormData({...formData, poster: url})} />
                                </div>
                            </section>
                        </div>
                    </div>
                    <div className="pt-12 border-t border-white/5 flex justify-center">
                        <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-black py-5 px-20 rounded-2xl uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-20">
                            {isSaving ? 'Syncing...' : 'Commit Manifest'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieEditor;