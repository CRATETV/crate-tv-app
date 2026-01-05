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
    isEpisode: false,
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

    const canSynthesize = formData && formData.title && formData.synopsis && formData.director;

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
                                                        {movie.isEpisode && <span className="text-[7px] bg-amber-600 text-white px-2 py-0.5 rounded-full uppercase font-black tracking-widest">EPISODE</span>}
                                                        {movie.isSeries && <span className="text-[7px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase font-black tracking-widest">SERIES</span>}
                                                        {movie.isForSale && <span className="text-[7px] bg-green-600 text-white px-2 py-0.5 rounded-full uppercase font-black tracking-widest">PAYWALL</span>}
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
                            {canSynthesize && (
                                <button onClick={() => setShowSocialKit(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl uppercase text-[10px] font-black shadow-xl transition-all flex items-center gap-2">
                                    <span>✨</span> Marketing Kit
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
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 cursor-pointer">
                                            <input type="checkbox" name="isSeries" checked={formData.isSeries} onChange={handleChange} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-red-600 focus:ring-red-500" />
                                            <span className="text-xs font-black uppercase text-gray-300">Is Series</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 cursor-pointer">
                                            <input type="checkbox" name="isEpisode" checked={formData.isEpisode} onChange={handleChange} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-amber-600 focus:ring-amber-500" />
                                            <span className="text-xs font-black uppercase text-gray-300">Is Episode</span>
                                        </label>
                                    </div>
                                </div>
                            </section>

                            {/* REVENUE SECTION */}
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">02. Monetization Rules</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <label className="flex items-center gap-4 cursor-pointer group">
                                        <div className="relative">
                                            <input type="checkbox" name="isSupportEnabled" checked={formData.isSupportEnabled} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:bg-emerald-600 transition-all"></div>
                                            <div className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all peer-checked:translate-x-7"></div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white uppercase tracking-tight">Allow Community Donations</p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Enables the "Support Filmmaker" button</p>
                                        </div>
                                    </label>
                                    
                                    <label className="flex items-center gap-4 cursor-pointer group">
                                        <div className="relative">
                                            <input type="checkbox" name="isForSale" checked={formData.isForSale} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
                                            <div className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all peer-checked:translate-x-7"></div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white uppercase tracking-tight">VOD Paywall Activation</p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Requires paid rental for access</p>
                                        </div>
                                    </label>
                                    
                                    {formData.isForSale && (
                                        <div className="animate-[fadeIn_0.3s_ease-out] pl-4 border-l-2 border-blue-600 space-y-4">
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black">$</span>
                                                <input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange} className="form-input !pl-8 bg-black/40" placeholder="5.00" step="0.50" />
                                            </div>
                                            <div className="bg-blue-900/10 p-4 rounded-xl border border-blue-800/30">
                                                <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em]">Automated Release Protocol</p>
                                                <input type="datetime-local" name="autoReleaseDate" value={formData.autoReleaseDate?.slice(0, 16)} onChange={handleChange} className="form-input !py-2 text-[10px] mt-2 bg-black/40" />
                                                <p className="text-[7px] text-gray-600 mt-2 font-bold uppercase">Paywall will automatically lift on this date</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        <div className="space-y-12">
                             {/* MEDIA SECTION */}
                             <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">03. Source Media</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="space-y-4">
                                        <label className="form-label">High-Bitrate Master Stream</label>
                                        <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} className="form-input bg-black/40" placeholder="https://..." />
                                        <S3Uploader label="Ingest New Master" onUploadSuccess={(url) => setFormData({...formData, fullMovie: url})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="form-label">Key Art (Poster)</label>
                                            <div className="aspect-[2/3] bg-black rounded-xl border border-white/10 overflow-hidden mb-2">
                                                <img src={formData.poster} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <S3Uploader label="Upload Poster" onUploadSuccess={(url) => setFormData({...formData, poster: url, tvPoster: url})} />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="form-label">Teaser/Trailer</label>
                                            <input type="text" name="trailer" value={formData.trailer} onChange={handleChange} className="form-input bg-black/40" placeholder="Trailer Link" />
                                            <S3Uploader label="Upload Trailer" onUploadSuccess={(url) => setFormData({...formData, trailer: url})} />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-6">
                        <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-black py-6 px-24 rounded-[2rem] uppercase tracking-[0.3em] shadow-[0_30px_60px_rgba(239,68,68,0.3)] transition-all transform active:scale-95 disabled:opacity-20 text-sm">
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
                    poster={formData.poster}
                    onClose={() => setShowSocialKit(false)} 
                />
            )}
        </div>
    );
};

export default MovieEditor;