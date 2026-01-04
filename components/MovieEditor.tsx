
import React, { useState, useEffect } from 'react';
import { Movie, Actor, MoviePipelineEntry, Episode } from '../types';
import S3Uploader from './S3Uploader';
import SocialKitModal from './SocialKitModal';

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
    isWatchPartyPaid: false,
    watchPartyPrice: 5.00,
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
    const [searchTerm, setSearchTerm] = useState('');
    const [showSocialKit, setShowSocialKit] = useState(false);
    
    const [newActor, setNewActor] = useState<Actor>({ name: '', photo: '', bio: '', highResPhoto: '' });
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
                isSupportEnabled: true,
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!formData) return;
        const target = e.target as HTMLInputElement;
        const { name, value, type } = target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? target.checked : (type === 'number' ? parseFloat(value) : value) });
    };

    const handleAddActor = () => {
        if (!formData || !newActor.name) return;
        setFormData({ ...formData, cast: [...(formData.cast || []), { ...newActor }] });
        setNewActor({ name: '', photo: '', bio: '', highResPhoto: '' });
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
                            <button onClick={() => setSelectedMovieKey(`movie_${Date.now()}`)} className="bg-red-600 text-white font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest">+ New Entry</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-white/5">
                                {filteredMovies.map(movie => (
                                    <tr key={movie.key} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                                    <img 
                                                        src={movie.poster || 'https://via.placeholder.com/100x150'} 
                                                        className="w-full h-full object-cover" 
                                                        alt="" 
                                                    />
                                                </div>
                                                <div>
                                                    <span className="font-black text-white uppercase text-lg tracking-tighter">{movie.title || 'Untitled'}</span>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-tighter">Dir. {movie.director}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        {movie.isSeries && <span className="text-[7px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase font-black tracking-widest">SERIES</span>}
                                                        {movie.isForSale && <span className="text-[7px] bg-green-600 text-white px-2 py-0.5 rounded-full uppercase font-black tracking-widest">PAYWALL</span>}
                                                        {movie.isWatchPartyPaid && <span className="text-[7px] bg-pink-600 text-white px-2 py-0.5 rounded-full uppercase font-black tracking-widest">WP TICKET</span>}
                                                        {movie.isSupportEnabled && <span className="text-[7px] bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase font-black tracking-widest">TIPS ACTIVE</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <button onClick={() => setSelectedMovieKey(movie.key)} className="text-white bg-white/5 hover:bg-red-600 font-black text-[9px] uppercase px-6 py-3 rounded-xl border border-white/5 transition-all">Edit Manifest</button>
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
                        <div className="flex gap-4">
                            {!formData.key.startsWith('movie_') && (
                                <button onClick={() => setShowSocialKit(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl uppercase text-[10px] font-black shadow-xl transition-all flex items-center gap-2">
                                    <span>✨</span> Synthesize Marketing Kit
                                </button>
                            )}
                            <button onClick={() => setSelectedMovieKey('')} className="bg-white/5 text-gray-400 px-6 py-3 rounded-xl uppercase text-[10px] font-black">Close</button>
                            <button onClick={handleSave} disabled={isSaving} className="bg-red-600 text-white px-8 py-3 rounded-xl uppercase text-[10px] font-black shadow-xl hover:bg-red-500 transition-all">{isSaving ? 'Syncing...' : 'Save Manifest'}</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div className="space-y-12">
                            {/* IDENTITY SECTION */}
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">01. Core Identity</h4>
                                <div className="space-y-4">
                                    <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Film/Series Title" className="form-input bg-black/40" />
                                    <input type="text" name="director" value={formData.director} onChange={handleChange} placeholder="Director(s)" className="form-input bg-black/40" />
                                    <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={4} placeholder="Full Treatment/Synopsis" className="form-input bg-black/40" />
                                </div>
                            </section>

                            {/* SOURCE SECTION */}
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">02. Media Sources</h4>
                                <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-4">
                                    <div>
                                        <label className="form-label">High-Bitrate Stream URL</label>
                                        <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} placeholder="Canonical Stream Link (MP4/HLS)" className="form-input bg-black/40" />
                                    </div>
                                    <S3Uploader label="Ingest New Master File" onUploadSuccess={(url) => setFormData({...formData, fullMovie: url})} />
                                    
                                    <div>
                                        <label className="form-label">Key Art (Poster) URL</label>
                                        <input type="text" name="poster" value={formData.poster} onChange={handleChange} placeholder="Poster URL" className="form-input bg-black/40" />
                                    </div>
                                    <S3Uploader label="Ingest New Key Art" onUploadSuccess={(url) => setFormData({...formData, poster: url})} />
                                </div>
                            </section>
                        </div>

                        <div className="space-y-12">
                            {/* CAST SECTION */}
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">03. Talent Manifest</h4>
                                <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input value={newActor.name} onChange={e => setNewActor({...newActor, name: e.target.value})} placeholder="Actor Name" className="form-input bg-black/40" />
                                        <input value={newActor.photo} onChange={e => setNewActor({...newActor, photo: e.target.value})} placeholder="Headshot URL" className="form-input bg-black/40" />
                                    </div>
                                    <textarea value={newActor.bio} onChange={e => setNewActor({...newActor, bio: e.target.value})} placeholder="Professional Bio" className="form-input bg-black/40" rows={3} />
                                    <div className="flex gap-2">
                                        <S3Uploader label="Ingest Headshot" onUploadSuccess={(url) => setNewActor({...newActor, photo: url, highResPhoto: url})} />
                                        <button onClick={handleAddActor} className="bg-red-600 text-white font-black px-6 py-2 rounded-xl text-[9px] uppercase tracking-widest self-end h-[46px]">Add Talent</button>
                                    </div>

                                    <div className="space-y-3 mt-8">
                                        {formData.cast?.map((actor, idx) => (
                                            <div key={idx} className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/5 group">
                                                <img src={actor.photo} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="" />
                                                <div className="flex-grow">
                                                    <p className="text-sm font-bold text-white uppercase">{actor.name}</p>
                                                    <p className="text-[9px] text-gray-600 line-clamp-1 italic">{actor.bio}</p>
                                                </div>
                                                <button onClick={() => {
                                                    const next = [...(formData.cast || [])];
                                                    next.splice(idx, 1);
                                                    setFormData({...formData, cast: next});
                                                }} className="text-red-500 text-[10px] font-black uppercase px-2 opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-6">
                        <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-black py-5 px-20 rounded-2xl uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-20 text-sm">
                            {isSaving ? 'Synchronizing Cluster...' : 'Push Global Manifest'}
                        </button>
                        <button 
                            onClick={() => { if(window.confirm("PURGE PROTOCOL: Irreversibly erase this record?")) onDeleteMovie(formData.key); }}
                            className="text-[10px] text-gray-700 font-black uppercase tracking-widest hover:text-red-600 transition-colors"
                        >
                            Purge Data Stream
                        </button>
                    </div>
                </div>
            )}
            
            {showSocialKit && formData && (
                <SocialKitModal 
                    title={formData.title} 
                    synopsis={formData.synopsis} 
                    director={formData.director} 
                    onClose={() => setShowSocialKit(false)} 
                />
            )}
        </div>
    );
};

export default MovieEditor;
