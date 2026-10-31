
import { toast } from './Toast';
import React, { useState, useEffect, useMemo } from 'react';
import { Movie, Actor, MoviePipelineEntry, Category, FestivalDay } from '../types';
import { Pill, type AccentName } from './admin/ui';
import { filmStatus, groupCounts, GROUP_LABELS, type FilmGroup, type Tone } from '../api/_lib/filmStatus';
import S3Uploader from './S3Uploader';
import FilmUploadConvert from './admin/FilmUploadConvert';
import AdminFilmDeepDive from './AdminFilmDeepDive';
import RemoveFilmsModal from './admin/RemoveFilmsModal';
import PremiereChecklist from './admin/PremiereChecklist';

interface MovieEditorProps {
    allMovies: Record<string, Movie>;
    /** For the "is it live, and why not" status on each film. */
    categories?: Record<string, Category>;
    festivalData?: FestivalDay[];
    /** Opens the list on this filter (the Overview tiles set it). */
    initialFilter?: FilmGroup | 'all';
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
    trailerStart: undefined,
    fullMovie: '',
    rokuStreamUrl: '',
    poster: '',
    tvPoster: '',
    likes: 0,
    rating: 0,
    releaseDateTime: '',
    publishedAt: new Date().toISOString(), // Mandatory for automatic row promotion
    autoReleaseDate: '',
    mainPageExpiry: '',
    isUnlisted: false,
    availableUntil: '',
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
    isLiveStream: false,
    liveStreamEmbed: '',
    zineUrl: ''
};

const ActorEditorModal: React.FC<{ actor: Actor, onSave: (updated: Actor) => void, onClose: () => void }> = ({ actor, onSave, onClose }) => {
    const [editActor, setEditActor] = useState<Actor>({ ...actor });

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#111] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Edit Actor Profile</h3>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">{editActor.name}</p>
                    </div>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <label className="form-label">Professional Biography</label>
                        <textarea 
                            value={editActor.bio} 
                            onChange={e => setEditActor({...editActor, bio: e.target.value})}
                            className="form-input bg-black/40 border-white/10 h-40 text-sm leading-relaxed"
                            placeholder="Write the actor's bio here..."
                        />
                    </div>
                    <div className="space-y-4">
                        <label className="form-label">Headshot URL (AWS S3)</label>
                        <input 
                            type="text" 
                            value={editActor.photo} 
                            onChange={e => setEditActor({...editActor, photo: e.target.value, highResPhoto: e.target.value})}
                            className="form-input bg-black/40 border-white/10 text-xs font-mono"
                        />
                        <S3Uploader label="Upload New Headshot" onUploadSuccess={(url) => setEditActor({...editActor, photo: url, highResPhoto: url})} />
                    </div>
                </div>
                <div className="p-8 border-t border-white/5 flex gap-4 bg-black/40">
                    <button onClick={onClose} className="flex-1 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Discard</button>
                    <button onClick={() => onSave(editActor)} className="flex-[2] bg-white text-black font-black py-4 rounded-xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-gray-200 transition-all">Save Profile</button>
                </div>
            </div>
        </div>
    );
};

const TONE_ACCENT: Record<Tone, AccentName> = { green: 'green', amber: 'amber', sky: 'sky', gray: 'gray', violet: 'violet' };

const MovieEditor: React.FC<MovieEditorProps> = ({
    allMovies,
    categories,
    festivalData,
    initialFilter = 'all',
    onRefresh,
    onSave, 
    onDeleteMovie, 
    onSetNowStreaming,
    movieToCreate, 
    onCreationDone 
}) => {
    const [selectedMovieKey, setSelectedMovieKey] = useState<string>('');
    const [formData, setFormData] = useState<Movie | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSpotlighting, setIsSpotlighting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newActorName, setNewActorName] = useState('');
    const [editingActorIdx, setEditingActorIdx] = useState<number | null>(null);
    
    const [isProbing, setIsProbing] = useState(false);
    const [probeResult, setProbeResult] = useState<any>(null);
    const [deepDiveMovie, setDeepDiveMovie] = useState<Movie | null>(null);
    // "Remove selected" (Oct 2026): tick films, then remove them together.
    const [selectMode, setSelectMode] = useState(false);
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [removeKeys, setRemoveKeys] = useState<string[] | null>(null);
    // Status per film (live / hidden and why / premiere / festival) and the filter chips.
    const [openCheck, setOpenCheck] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilmGroup | 'all'>(initialFilter);
    useEffect(() => { setFilter(initialFilter); }, [initialFilter]);
    const statuses = useMemo(() => {
        const now = Date.now();
        const out: Record<string, ReturnType<typeof filmStatus>> = {};
        for (const m of Object.values(allMovies) as Movie[]) {
            if (m?.key) out[m.key] = filmStatus(m.key, m as any, categories, festivalData as any, now);
        }
        return out;
    }, [allMovies, categories, festivalData]);
    const counts = useMemo(() => groupCounts(Object.values(statuses)), [statuses]);
    const togglePick = (key: string) => setPicked(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

    useEffect(() => {
        if (movieToCreate) {
            const newKey = `movie_${Date.now()}`;
            setFormData({
                ...emptyMovie,
                key: newKey,
                title: movieToCreate.title,
                synopsis: movieToCreate.synopsis || '',
                director: movieToCreate.director,
                fullMovie: movieToCreate.fullMovie || movieToCreate.movieUrl || '',
                poster: movieToCreate.poster || movieToCreate.posterUrl || '',
                tvPoster: movieToCreate.poster || movieToCreate.posterUrl || '',
                isSupportEnabled: true,
                publishedAt: new Date().toISOString(),
                cast: movieToCreate.cast ? movieToCreate.cast.split(',').map(name => ({
                    name: name.trim(),
                    bio: 'Biographical data pending.',
                    photo: 'https://d3jhtrl1gnrh4b.cloudfront.net/photos+/Defaultpic.png',
                    highResPhoto: 'https://d3jhtrl1gnrh4b.cloudfront.net/photos+/Defaultpic.png'
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
            setProbeResult(null);
        } else setFormData(null);
    }, [selectedMovieKey, allMovies]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!formData) return;
        const target = e.target as HTMLInputElement;
        const { name, value, type } = target;
        
        // datetime-local gives us local time — convert to proper ISO string
        if (type === 'datetime-local') {
            const isoValue = value ? new Date(value).toISOString() : '';
            setFormData({ ...formData, [name]: isoValue });
            return;
        }
        
        setFormData({ ...formData, [name]: type === 'checkbox' ? target.checked : (type === 'number' ? parseFloat(value) : value) });
    };

    const handleAddActor = () => {
        if (!formData || !newActorName.trim()) return;
        const actor: Actor = {
            name: newActorName.trim(),
            photo: 'https://d3jhtrl1gnrh4b.cloudfront.net/photos+/Defaultpic.png',
            bio: 'Biographical data pending.',
            highResPhoto: 'https://d3jhtrl1gnrh4b.cloudfront.net/photos+/Defaultpic.png'
        };
        setFormData({ ...formData, cast: [...formData.cast, actor] });
        setNewActorName('');
    };

    const handleUpdateActor = (idx: number, updatedActor: Actor) => {
        if (!formData) return;
        const nextCast = [...formData.cast];
        nextCast[idx] = updatedActor;
        setFormData({ ...formData, cast: nextCast });
        setEditingActorIdx(null);
    };

    const handleRemoveActor = (index: number) => {
        if (!formData) return;
        const nextCast = [...formData.cast];
        nextCast.splice(index, 1);
        setFormData({ ...formData, cast: nextCast });
    };

    const handleRunProbe = async (url: string) => {
        if (!url) return;
        setIsProbing(true);
        setProbeResult(null);
        try {
            const res = await fetch('/api/probe-roku-compatibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    url, 
                    password: sessionStorage.getItem('adminPassword') 
                })
            });
            const data = await res.json();
            setProbeResult(data);
        } catch (e) {
            alert("Probe Failed. Check CORS settings.");
        } finally {
            setIsProbing(false);
        }
    };

    const handleSave = async () => {
        if (!formData) return;
        setIsSaving(true);
        try {
            await onSave({ [formData.key]: formData });

            // ── INSTANT BANNER: only schedule if enabled AND has a real future start time
            {
                const hasFutureTime = formData.watchPartyStartTime &&
                    new Date(formData.watchPartyStartTime).getTime() > Date.now();
                const shouldSchedule = formData.isWatchPartyEnabled && hasFutureTime;
                fetch('/api/schedule-watch-party', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        password: sessionStorage.getItem('adminPassword'),
                        movieKey: formData.key,
                        movieTitle: formData.title,
                        watchPartyStartTime: shouldSchedule ? formData.watchPartyStartTime : null,
                        isWatchPartyEnabled: shouldSchedule,
                        isWatchPartyPaid: formData.isWatchPartyPaid,
                        watchPartyPrice: formData.watchPartyPrice,
                        poster: formData.poster,
                    })
                }).catch(() => {});
            }

            setSelectedMovieKey('');
        } catch (err) {
            toast.error("Save failed. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetSpotlight = async () => {
        if (!formData) return;
        setIsSpotlighting(true);
        try {
            await onSetNowStreaming(formData.key);
            toast.success(`"${formData.title}" is now the Spotlight.`);
        } catch (err) {
            toast.error("Spotlight update failed.");
        } finally {
            setIsSpotlighting(false);
        }
    };

    const handleDelete = async () => {
        if (!formData || isDeleting) return;
        if (!window.confirm(`PURGE RECORD: Irreversibly erase "${formData.title}" from the global catalog AND permanently delete its video file from storage — this cannot be undone. Continue?`)) return;
        
        setIsDeleting(true);
        try {
            await onDeleteMovie(formData.key);
            setSelectedMovieKey('');
            setFormData(null);
        } catch (err) {
            toast.error("Delete failed. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(m => (m.title || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .filter(m => filter === 'all' || !statuses[m.key] || statuses[m.key].groups.includes(filter))
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    const isSavedRecord = formData && allMovies[formData.key] !== undefined;

    return (
        <div className="space-y-6 pb-20">
            {!formData ? (
                <div className="bg-[#0f0f0f] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-8 bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Catalog Records</h3>
                            <span className="bg-red-600/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{Object.keys(allMovies).length} Films Total</span>
                        </div>
                        <div className="flex flex-wrap gap-3 justify-end">
                            <input type="text" placeholder="Filter..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="form-input !py-3 text-xs bg-black/40 border-white/10" />
                            {selectMode ? (
                                <>
                                    <button onClick={() => setPicked(new Set([...picked, ...filteredMovies.map(m => m.key)]))} className="bg-white/5 text-white font-black py-3 px-4 rounded-xl text-[10px] uppercase tracking-widest border border-white/10">Select all shown</button>
                                    <button disabled={picked.size === 0} onClick={() => setRemoveKeys([...picked])} className="bg-red-600 disabled:opacity-30 text-white font-black py-3 px-4 rounded-xl text-[10px] uppercase tracking-widest">Remove selected ({picked.size})</button>
                                    <button onClick={() => { setSelectMode(false); setPicked(new Set()); }} className="bg-white/5 text-gray-400 font-black py-3 px-4 rounded-xl text-[10px] uppercase tracking-widest">Cancel</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setSelectMode(true)} className="bg-white/5 text-gray-300 hover:text-white font-black py-3 px-4 rounded-xl text-[10px] uppercase tracking-widest border border-white/10">Select to remove</button>
                                    <button onClick={() => setSelectedMovieKey(`movie_${Date.now()}`)} className="bg-red-600 text-white font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest">+ New Entry</button>
                                </>
                            )}
                        </div>
                    </div>
                    {/* At a glance: tap a chip to see just those films. */}
                    <div className="px-8 py-4 border-b border-white/5 flex flex-wrap gap-2">
                        {([['all', 'All films', Object.keys(allMovies).length], ...(Object.keys(GROUP_LABELS) as FilmGroup[]).map(g => [g, GROUP_LABELS[g], counts[g]] as const)] as const).map(([id, label, n]) => (
                            <button
                                key={id}
                                onClick={() => setFilter(id as FilmGroup | 'all')}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${filter === id ? 'bg-white text-black border-white' : 'bg-white/[0.04] text-[#C9C9D1] border-white/10 hover:bg-white/10'}`}
                            >
                                {label} <span className={filter === id ? 'text-black/60' : 'text-[#8A8A96]'}>{n}</span>
                            </button>
                        ))}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-white/5">
                                {filteredMovies.length === 0 && (
                                    <tr><td className="px-8 py-10 text-center text-sm text-[#8A8A96]">No films here.</td></tr>
                                )}
                                {filteredMovies.map(movie => (
                                    <tr key={movie.key} onClick={selectMode ? () => togglePick(movie.key) : undefined} className={`hover:bg-white/[0.01] transition-colors group ${selectMode ? 'cursor-pointer' : ''} ${picked.has(movie.key) ? 'bg-red-600/[0.08]' : ''}`}>
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-6">
                                                {selectMode && <input type="checkbox" aria-label={`Select ${movie.title}`} checked={picked.has(movie.key)} onChange={() => togglePick(movie.key)} onClick={e => e.stopPropagation()} className="w-5 h-5 accent-red-600 flex-shrink-0" />}
                                                <div className="w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 shadow-2xl">
                                                    <img src={movie.poster || 'https://d3jhtrl1gnrh4b.cloudfront.net/photos+/Defaultpic.png'} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div>
                                                    <span className="font-black text-white uppercase text-lg tracking-tighter">{movie.title || 'Untitled'}</span>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-tighter">Dir. {movie.director}</p>
                                                    {statuses[movie.key] && (
                                                        <div className="mt-2.5 space-y-1.5 max-w-xl">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <Pill accent={TONE_ACCENT[statuses[movie.key].tone]} solid>{statuses[movie.key].headline}</Pill>
                                                                {statuses[movie.key].tags.map(t => <Pill key={t.label} accent={TONE_ACCENT[t.tone]}>{t.label}</Pill>)}
                                                            </div>
                                                            <p className="text-xs text-[#8A8A96] leading-snug normal-case font-normal">{statuses[movie.key].detail}</p>
                                                            {movie.isWatchPartyEnabled && !selectMode && (
                                                                <div className="normal-case font-normal">
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); setOpenCheck(openCheck === movie.key ? null : movie.key); }}
                                                                        aria-expanded={openCheck === movie.key}
                                                                        className="text-xs font-bold text-sky-300 hover:text-white underline underline-offset-4"
                                                                    >
                                                                        {openCheck === movie.key ? 'Hide premiere checklist' : 'Premiere checklist'}
                                                                    </button>
                                                                    {openCheck === movie.key && <div className="mt-3 p-4 rounded-2xl bg-black/30 border border-white/10"><PremiereChecklist movie={movie} compact /></div>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <div className={`flex items-center justify-end gap-3 ${selectMode ? 'invisible' : ''}`}>
                                                <button 
                                                    onClick={() => setDeepDiveMovie(movie)}
                                                    className="text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white font-black text-[9px] uppercase px-6 py-3 rounded-xl border border-red-500/20 transition-all"
                                                >
                                                    Deep Dive
                                                </button>
                                                <button onClick={() => setSelectedMovieKey(movie.key)} className="text-white bg-white/5 hover:bg-red-600 font-black text-[9px] uppercase px-6 py-3 rounded-xl border border-white/5 transition-all">Edit Manifest</button>
                                            </div>
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
                            <div className="flex items-center gap-4">
                                <h3 className="text-4xl font-black text-white uppercase tracking-tighter">{formData.title || 'Draft Master'}</h3>
                                {isSavedRecord && (
                                    <button 
                                        onClick={handleSetSpotlight}
                                        disabled={isSpotlighting}
                                        className="bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-xl"
                                    >
                                        {isSpotlighting ? 'Spotlighting...' : 'Promote to Global Spotlight'}
                                    </button>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.4em] mt-2">UUID: {formData.key}</p>
                        </div>
                        <div className="flex gap-4">
                            {isSavedRecord && (
                                <button onClick={handleDelete} disabled={isDeleting} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-6 py-3 rounded-xl uppercase text-[10px] font-black border border-red-500/20 transition-all">
                                    {isDeleting ? 'Purging...' : 'Purge Record'}
                                </button>
                            )}
                            <button onClick={() => setSelectedMovieKey('')} className="bg-white/5 text-gray-400 px-6 py-3 rounded-xl uppercase text-[10px] font-black">Close</button>
                            <button onClick={handleSave} disabled={isSaving} className="bg-white text-black px-8 py-3 rounded-xl uppercase text-[10px] font-black shadow-xl hover:bg-gray-200 transition-all">{isSaving ? 'Syncing...' : 'Push Global Manifest'}</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div className="space-y-12">
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">01. Master Metadata</h4>
                                <div className="space-y-4">
                                    <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Film/Series Title" className="form-input bg-black/40" />
                                    <input type="text" name="director" value={formData.director} onChange={handleChange} placeholder="Director(s)" className="form-input bg-black/40" />
                                    <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={4} placeholder="Synopsis Treatment" className="form-input bg-black/40" />

                                    <div className="space-y-2">
                                        <label className="form-label">Release Date &amp; Time</label>
                                        <input
                                            type="datetime-local"
                                            name="releaseDateTime"
                                            value={formData.releaseDateTime ? (() => {
                                                const d = new Date(formData.releaseDateTime);
                                                const offset = d.getTimezoneOffset() * 60000;
                                                return new Date(d.getTime() - offset).toISOString().slice(0, 16);
                                            })() : ''}
                                            onChange={handleChange}
                                            className="form-input bg-black/40"
                                        />
                                        <p className="text-[9px] text-gray-600 uppercase font-bold">Set a future date to power the "Coming Soon" badge and light up the countdown on The Unpack. Leave blank for films that are already out.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="form-label">Editorial / Zine URL</label>
                                        <input 
                                            type="text" 
                                            name="zineUrl" 
                                            value={formData.zineUrl || ''} 
                                            onChange={handleChange} 
                                            placeholder="https://cratetv.net/zine/..." 
                                            className="form-input bg-black/40 text-xs font-mono" 
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-white uppercase tracking-widest">Episodic Series</p>
                                            <p className="text-[9px] text-gray-500 uppercase">Enable episodic navigation for this film</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="isSeries" checked={formData.isSeries} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-red-600 transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                        </label>
                                    </div>

                                    {/* ── EPISODE MANAGER ── */}
                                    {formData.isSeries && (
                                        <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-red-400">Episodes ({formData.episodes?.length || 0})</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newEp = { id: `ep_${Date.now()}`, title: `Episode ${(formData.episodes?.length || 0) + 1}`, synopsis: '', url: '', duration: 0 };
                                                        setFormData({ ...formData, episodes: [...(formData.episodes || []), newEp] });
                                                    }}
                                                    className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-black text-[9px] uppercase tracking-widest px-4 py-2 rounded-lg transition-all"
                                                >
                                                    + Add Episode
                                                </button>
                                            </div>
                                            <div className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-2">
                                                <label className="form-label">Skip intro (every episode)</label>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span className="text-xs text-gray-400">Intro starts at</span>
                                                    <input type="number" min="0" value={formData.introStart || ''} onChange={e => setFormData({ ...formData, introStart: parseInt(e.target.value) || 0 })} placeholder="0" className="form-input bg-black/40 w-24" aria-label="Intro starts at, seconds" />
                                                    <span className="text-xs text-gray-400">and ends at</span>
                                                    <input type="number" min="0" value={formData.introEnd || ''} onChange={e => setFormData({ ...formData, introEnd: parseInt(e.target.value) || 0 })} placeholder="e.g. 45" className="form-input bg-black/40 w-24" aria-label="Intro ends at, seconds" />
                                                    <span className="text-xs text-gray-400">seconds</span>
                                                </div>
                                                <p className="text-[9px] text-gray-600 uppercase font-bold">Leave "ends at" empty for no Skip intro button. An episode below can set its own times if its intro is different.</p>
                                            </div>
                                            {(formData.episodes || []).length === 0 && (
                                                <p className="text-[10px] text-gray-600 italic text-center py-4 border border-dashed border-white/5 rounded-xl">No episodes yet — click Add Episode to get started.</p>
                                            )}
                                            {(formData.episodes || []).map((ep, idx) => (
                                                <div key={ep.id} className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Episode {idx + 1}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, episodes: formData.episodes?.filter((_, i) => i !== idx) })}
                                                            className="text-gray-700 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="form-label">Episode Title</label>
                                                        <input
                                                            type="text"
                                                            value={ep.title}
                                                            onChange={e => {
                                                                const updated = [...(formData.episodes || [])];
                                                                updated[idx] = { ...updated[idx], title: e.target.value };
                                                                setFormData({ ...formData, episodes: updated });
                                                            }}
                                                            placeholder="e.g. Episode 1 — The Beginning"
                                                            className="form-input bg-black/40"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="form-label">Video URL (S3 / Vimeo / YouTube)</label>
                                                        <input
                                                            type="text"
                                                            value={ep.url}
                                                            onChange={e => {
                                                                const updated = [...(formData.episodes || [])];
                                                                updated[idx] = { ...updated[idx], url: e.target.value };
                                                                setFormData({ ...formData, episodes: updated });
                                                            }}
                                                            placeholder="https://..."
                                                            className="form-input bg-black/40 text-xs font-mono"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="form-label">Episode Synopsis (optional)</label>
                                                        <textarea
                                                            value={ep.synopsis}
                                                            onChange={e => {
                                                                const updated = [...(formData.episodes || [])];
                                                                updated[idx] = { ...updated[idx], synopsis: e.target.value };
                                                                setFormData({ ...formData, episodes: updated });
                                                            }}
                                                            rows={2}
                                                            placeholder="Brief description of this episode..."
                                                            className="form-input bg-black/40"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="form-label">This episode's intro (seconds, optional)</label>
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <span className="text-xs text-gray-400">starts at</span>
                                                            <input type="number" min="0" value={ep.introStart || ''} onChange={e => { const updated = [...(formData.episodes || [])]; updated[idx] = { ...updated[idx], introStart: parseInt(e.target.value) || 0 }; setFormData({ ...formData, episodes: updated }); }} placeholder="0" className="form-input bg-black/40 w-24" aria-label={`Episode ${idx + 1} intro starts at, seconds`} />
                                                            <span className="text-xs text-gray-400">ends at</span>
                                                            <input type="number" min="0" value={ep.introEnd || ''} onChange={e => { const updated = [...(formData.episodes || [])]; updated[idx] = { ...updated[idx], introEnd: parseInt(e.target.value) || 0 }; setFormData({ ...formData, episodes: updated }); }} placeholder="series default" className="form-input bg-black/40 w-32" aria-label={`Episode ${idx + 1} intro ends at, seconds`} />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="form-label">Duration (minutes)</label>
                                                        <input
                                                            type="number"
                                                            value={ep.duration || ''}
                                                            onChange={e => {
                                                                const updated = [...(formData.episodes || [])];
                                                                updated[idx] = { ...updated[idx], duration: parseInt(e.target.value) || 0 };
                                                                setFormData({ ...formData, episodes: updated });
                                                            }}
                                                            placeholder="0"
                                                            className="form-input bg-black/40 w-32"
                                                            min="0"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-amber-400 tracking-[0.4em]">Director's Note (any film)</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-amber-500/10 space-y-5">
                                    <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Shows on this film's page and details window. It does not show on the PWFF festival page; that page uses the Festival / PWFF Profile below.</p>
                                    <div className="space-y-2">
                                        <label className="form-label">Director's Note</label>
                                        <textarea
                                            name="directorNote"
                                            value={formData.directorNote || ''}
                                            onChange={handleChange}
                                            rows={4}
                                            placeholder="Why did you make this film? What do you want audiences to feel?"
                                            className="form-input bg-black/40"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="form-label">Filmmaker Bio</label>
                                        <textarea
                                            name="filmmakerBio"
                                            value={formData.filmmakerBio || ''}
                                            onChange={handleChange}
                                            rows={3}
                                            placeholder="Short bio about the filmmaker..."
                                            className="form-input bg-black/40"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-purple-400 tracking-[0.4em]">02. Festival / PWFF Profile</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-purple-500/10 space-y-5">
                                    <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">These fields appear on the PWFF festival page at cratetv.net/pwff</p>
                                    <div className="space-y-2">
                                        <label className="form-label">Director's Note</label>
                                        <textarea
                                            name="festivalDirectorNote"
                                            value={formData.festivalDirectorNote || ''}
                                            onChange={handleChange}
                                            rows={4}
                                            placeholder="Why did you make this film? What do you want audiences to feel?"
                                            className="form-input bg-black/40"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="form-label">Filmmaker Bio</label>
                                        <textarea
                                            name="festivalFilmmakerBio"
                                            value={formData.festivalFilmmakerBio || ''}
                                            onChange={handleChange}
                                            rows={3}
                                            placeholder="Short bio about the filmmaker..."
                                            className="form-input bg-black/40"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="form-label">Filmmaker Photo URL</label>
                                        <input
                                            type="text"
                                            name="festivalFilmmakerPhoto"
                                            value={formData.festivalFilmmakerPhoto || ''}
                                            onChange={handleChange}
                                            placeholder="https://... (headshot)"
                                            className="form-input bg-black/40 text-xs font-mono"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="form-label">Pull Quote (for hype section)</label>
                                            <input
                                                type="text"
                                                name="festivalQuote"
                                                value={formData.festivalQuote || ''}
                                                onChange={handleChange}
                                                placeholder="A memorable line from the director..."
                                                className="form-input bg-black/40"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="form-label">Festival Awards / Laurels</label>
                                            <input
                                                type="text"
                                                name="festivalAwards"
                                                value={formData.festivalAwards || ''}
                                                onChange={handleChange}
                                                placeholder="e.g. Best Short — SXSW 2024"
                                                className="form-input bg-black/40"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">03. Verified Cast Manifest</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={newActorName} 
                                            onChange={e => setNewActorName(e.target.value)} 
                                            placeholder="Actor name..." 
                                            className="form-input bg-black/40 flex-grow"
                                            onKeyDown={e => e.key === 'Enter' && handleAddActor()}
                                        />
                                        <button 
                                            onClick={handleAddActor}
                                            className="bg-white text-black font-black px-6 rounded-xl uppercase text-[10px] tracking-widest"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {formData.cast.map((actor, idx) => (
                                            <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between group/actor">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                                                        <img src={actor.photo} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-xs font-black text-white uppercase truncate block">{actor.name}</span>
                                                        <p className="text-[8px] text-gray-500 uppercase truncate">Bio: {actor.bio ? 'Synced' : 'Missing'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => setEditingActorIdx(idx)}
                                                        className="text-white/40 hover:text-white transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleRemoveActor(idx)} className="text-red-500 font-black hover:text-red-400">×</button>
                                                </div>
                                            </div>
                                        ))}
                                        {formData.cast.length === 0 && <p className="col-span-2 text-[9px] text-gray-700 uppercase font-black italic text-center py-4">No actors assigned</p>}
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="space-y-12">
                             <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">03. High-Bitrate Assets</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="space-y-4">
                                        <label className="form-label">Primary Master URL (AWS S3)</label>
                                        <div className="flex gap-2">
                                            <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} className="form-input bg-black/40 flex-grow text-xs font-mono" placeholder="https://..." />
                                            <button 
                                                onClick={() => handleRunProbe(formData.fullMovie)}
                                                disabled={isProbing || !formData.fullMovie}
                                                className="bg-red-600 text-white font-black px-6 rounded-2xl uppercase text-[10px] tracking-widest disabled:opacity-30"
                                            >
                                                {isProbing ? '...' : 'Probe'}
                                            </button>
                                        </div>
                                        <FilmUploadConvert
                                            movieKey={formData.key}
                                            title={formData.title || formData.key}
                                            onReady={(url, minutes) => setFormData(prev => prev ? { ...prev, fullMovie: url, ...(minutes ? { durationInMinutes: minutes } : {}) } : prev)}
                                        />
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_cyan]"></span>
                                            <label className="form-label !text-cyan-500">Roku Optimized Override (HLS/MP4)</label>
                                        </div>
                                        <input 
                                            type="text" 
                                            name="rokuStreamUrl" 
                                            value={formData.rokuStreamUrl || ''} 
                                            onChange={handleChange} 
                                            className="form-input bg-black/60 border-cyan-500/20 text-xs font-mono text-cyan-400" 
                                            placeholder="Optional: Hardware-specific link" 
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <label className="form-label">Poster URL (2:3)</label>
                                            <input type="text" name="poster" value={formData.poster} onChange={handleChange} className="form-input bg-black/40 text-[10px] font-mono" />
                                            <S3Uploader label="Ingest Art" onUploadSuccess={(url) => setFormData({...formData, poster: url, tvPoster: url})} />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="form-label">Teaser/Teaser (URL)</label>
                                            <input type="text" name="trailer" value={formData.trailer} onChange={handleChange} className="form-input bg-black/40 text-[10px] font-mono" />
                                            <S3Uploader label="Ingest Teaser" onUploadSuccess={(url) => setFormData({...formData, trailer: url})} />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="form-label">Preview Start Point</label>
                                            <p className="text-[10px] text-gray-600">Drag the slider to pick the best 30 second preview clip from the film. Viewers see this when they hover on the movie card.</p>
                                            {formData.fullMovie && !formData.fullMovie.includes('vimeo') && !formData.fullMovie.includes('youtube') ? (
                                                <div className="space-y-3">
                                                    <div className="relative">
                                                        <video
                                                            id="trailer-scrubber"
                                                            src={formData.fullMovie}
                                                            muted
                                                            playsInline
                                                            className="w-full rounded-xl bg-black aspect-video object-cover"
                                                            onLoadedMetadata={e => {
                                                                const v = e.currentTarget;
                                                                const slider = document.getElementById('trailer-start-slider') as HTMLInputElement;
                                                                if (slider) slider.max = String(Math.floor(v.duration));
                                                                const start = formData.trailerStart ?? Math.floor(v.duration * 0.3);
                                                                v.currentTime = start;
                                                                if (slider) slider.value = String(start);
                                                            }}
                                                            onEnded={() => {
                                                                // If video ends naturally before 60s timer — show warning
                                                                const badge = document.getElementById('preview-badge');
                                                                if (badge && badge.dataset.testing === 'true') {
                                                                    badge.textContent = '⚠ Ended early — trailer too short from this point';
                                                                    badge.className = 'absolute top-2 left-2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500 text-black';
                                                                    badge.dataset.testing = 'false';
                                                                }
                                                            }}
                                                        />
                                                        <div
                                                            id="preview-badge"
                                                            data-testing="false"
                                                            className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-black/60 text-gray-400 hidden"
                                                        />
                                                    </div>
                                                    <input
                                                        id="trailer-start-slider"
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        step="1"
                                                        value={formData.trailerStart ?? 0}
                                                        onChange={e => {
                                                            const val = parseInt(e.target.value);
                                                            setFormData({...formData, trailerStart: val});
                                                            const v = document.getElementById('trailer-scrubber') as HTMLVideoElement;
                                                            if (v) { v.pause(); v.currentTime = val; }
                                                            // Reset badge
                                                            const badge = document.getElementById('preview-badge');
                                                            if (badge) { badge.className = 'absolute top-2 left-2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-black/60 text-gray-400 hidden'; badge.dataset.testing = 'false'; }
                                                        }}
                                                        className="w-full accent-red-600 cursor-pointer"
                                                    />
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] text-gray-500 font-mono">
                                                            Start: {formData.trailerStart != null ? `${Math.floor((formData.trailerStart ?? 0) / 60)}:${String((formData.trailerStart ?? 0) % 60).padStart(2,'0')}` : 'Auto (30%)'}
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const v = document.getElementById('trailer-scrubber') as HTMLVideoElement;
                                                                    const badge = document.getElementById('preview-badge');
                                                                    if (!v || !badge) return;

                                                                    // Reset badge
                                                                    badge.textContent = '▶ Playing 30s preview...';
                                                                    badge.className = 'absolute top-2 left-2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-red-600 text-white';
                                                                    badge.dataset.testing = 'true';

                                                                    const startAt = formData.trailerStart ?? Math.floor(v.duration * 0.3);
                                                                    v.currentTime = startAt;
                                                                    v.play();

                                                                    // Stop after exactly 30s
                                                                    setTimeout(() => {
                                                                        if (badge.dataset.testing === 'true') {
                                                                            v.pause();
                                                                            badge.textContent = '✓ Stopped at 30s — looks good!';
                                                                            badge.className = 'absolute top-2 left-2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-green-600 text-white';
                                                                            badge.dataset.testing = 'false';
                                                                        }
                                                                    }, 30000);
                                                                }}
                                                                className="text-[10px] font-black text-red-500 hover:text-white uppercase tracking-widest transition-colors border border-red-600/30 hover:border-red-500 px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20"
                                                            >
                                                                ▶ Test 30s Preview
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({...formData, trailerStart: undefined})}
                                                                className="text-[10px] text-gray-600 hover:text-red-500 uppercase tracking-widest transition-colors"
                                                            >
                                                                Reset to Auto
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-gray-700 italic">Upload the film file above to set the preview start point. Vimeo and YouTube links are not supported for scrubbing.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">04. Access & Monetization</h4>
                                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-6">
                                    {/* Listed / Unlisted */}
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-gray-300">Film Visibility</p>
                                            <p className="text-[9px] text-gray-600 uppercase">{formData.isUnlisted ? 'Unlisted — hidden from catalog' : 'Listed — visible in catalog'}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="isUnlisted" checked={!!formData.isUnlisted} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-green-600 rounded-full peer peer-checked:bg-gray-700 transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                        </label>
                                    </div>
                                    {/* Hide automatically after a date (premiere weekends etc.) */}
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-300 block">Hide automatically after</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="datetime-local"
                                                name="availableUntil"
                                                value={formData.availableUntil ? (() => {
                                                    const d = new Date(formData.availableUntil);
                                                    if (isNaN(d.getTime())) return '';
                                                    const offset = d.getTimezoneOffset() * 60000;
                                                    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
                                                })() : ''}
                                                onChange={handleChange}
                                                className="form-input bg-black/40 flex-1"
                                            />
                                            {formData.availableUntil && (
                                                <button type="button" onClick={() => setFormData({ ...formData, availableUntil: '' })} className="text-[10px] font-black uppercase text-gray-400 hover:text-white px-3 rounded-xl border border-white/10">Clear</button>
                                            )}
                                        </div>
                                        <p className="text-[9px] text-gray-500 uppercase font-bold">
                                            {formData.availableUntil
                                                ? (new Date(formData.availableUntil).getTime() <= Date.now()
                                                    ? 'This time has passed: the film is hidden and not for sale. To bring it back, clear the date and switch visibility back on.'
                                                    : 'At this time CRATE hides the film everywhere (site and Roku) and stops new sales. Leave empty to keep it up.')
                                                : 'Empty = stays up. Set a time (your local time) and CRATE hides it by itself, e.g. Sunday night after a premiere weekend.'}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                                <span className="text-[10px] font-black uppercase text-gray-300">VOD Paywall</span>
                                                <input type="checkbox" name="isForSale" checked={formData.isForSale} onChange={handleChange} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-red-600 focus:ring-red-500" />
                                            </div>
                                            {formData.isForSale && (
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                                    <input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange} className="form-input !pl-8 bg-black/40" step="0.01" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                                <span className="text-[10px] font-black uppercase text-gray-300">Creator Support</span>
                                                <input type="checkbox" name="isSupportEnabled" checked={formData.isSupportEnabled} onChange={handleChange} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-emerald-600 focus:ring-emerald-500" />
                                            </div>
                                            <p className="text-[8px] text-gray-600 uppercase px-2 font-bold">Enables community tips/donations</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">05. Watch Party</h4>
                                <div className="bg-red-900/5 border border-red-500/20 p-8 rounded-3xl space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-white uppercase tracking-widest">Enable Watch Party</p>
                                            <p className="text-[9px] text-gray-500 uppercase">Turns on the banner countdown and lobby for this film</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="isWatchPartyEnabled" checked={formData.isWatchPartyEnabled} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-red-600 transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                        </label>
                                    </div>
                                    {formData.isWatchPartyEnabled && (
                                        <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                                            <div className="space-y-2">
                                                <label className="form-label">Scheduled Start Date &amp; Time</label>
                                                <input
                                                    type="datetime-local"
                                                    name="watchPartyStartTime"
                                                    value={formData.watchPartyStartTime ? (() => {
                                                        const d = new Date(formData.watchPartyStartTime);
                                                        const offset = d.getTimezoneOffset() * 60000;
                                                        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
                                                    })() : ''}
                                                    onChange={handleChange}
                                                    className="form-input bg-black/40 border-red-500/30"
                                                />
                                                <p className="text-[9px] text-gray-600 uppercase font-bold">Time is in your local timezone. Set this → banner countdown appears on the site immediately.</p>
                                            </div>

                                            {/* Opening night intro video */}
                                            <div>
                                                <label className="form-label">Opening Night Intro Video <span className="text-gray-700 font-normal normal-case tracking-normal">(optional — plays before the film starts)</span></label>
                                                <input
                                                    type="text"
                                                    name="watchPartyIntroVideoUrl"
                                                    value={formData.watchPartyIntroVideoUrl || ''}
                                                    onChange={handleChange}
                                                    placeholder="S3 URL of intro video..."
                                                    className="form-input bg-black/40 border-red-500/30 font-mono text-xs"
                                                />
                                                <p className="text-[9px] text-gray-600 uppercase font-bold mt-1">Upload your festival intro video to S3, paste the URL here. It plays automatically for everyone before the film begins.</p>
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-black text-white uppercase tracking-widest">Paid Watch Party</p>
                                                    <p className="text-[9px] text-gray-500 uppercase">Requires ticket purchase to enter lobby</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" name="isWatchPartyPaid" checked={formData.isWatchPartyPaid} onChange={handleChange} className="sr-only peer" />
                                                    <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-red-600 transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                                </label>
                                            </div>
                                            {formData.isWatchPartyPaid && (
                                                <div className="relative">
                                                    <label className="form-label">Ticket Price</label>
                                                    <span className="absolute left-4 bottom-4 text-gray-500 font-bold">$</span>
                                                    <input type="number" name="watchPartyPrice" value={formData.watchPartyPrice} onChange={handleChange} className="form-input !pl-8 bg-black/40" step="0.01" min="0" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500">06. Live Broadcast Relay</h4>
                                <div className="bg-indigo-900/5 border border-indigo-500/20 p-8 rounded-3xl space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-white uppercase tracking-widest">Enable Live Mode</p>
                                            <p className="text-[9px] text-gray-500 uppercase">Use external URL for Watch Parties (Bypasses S3 file)</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="isLiveStream" checked={formData.isLiveStream} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                        </label>
                                    </div>
                                    
                                    {formData.isLiveStream && (
                                        <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                                            <label className="form-label">Live Relay URL (YouTube / Restream / Vimeo)</label>
                                            <input 
                                                type="text" 
                                                name="liveStreamEmbed" 
                                                value={formData.liveStreamEmbed} 
                                                onChange={handleChange} 
                                                className="form-input bg-black/40 border-indigo-500/30 text-xs font-mono" 
                                                placeholder="e.g. https://restream.io/player/..." 
                                            />
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-6">
                        <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-black py-6 px-24 rounded-[2rem] uppercase tracking-[0.3em] shadow-[0_30px_60px_rgba(239,68,68,0.3)] transition-all transform active:scale-95 disabled:opacity-20 text-sm">
                            {isSaving ? 'Synchronizing Cluster...' : 'Push Global Manifest'}
                        </button>
                    </div>
                </div>
            )}
            
            {editingActorIdx !== null && formData && (
                <ActorEditorModal 
                    actor={formData.cast[editingActorIdx]} 
                    onClose={() => setEditingActorIdx(null)}
                    onSave={(updated) => handleUpdateActor(editingActorIdx, updated)}
                />
            )}

            {removeKeys && (
                <RemoveFilmsModal keys={removeKeys} onClose={() => setRemoveKeys(null)} onRemoved={() => { setPicked(new Set()); setSelectMode(false); onRefresh(); }} />
            )}
            {deepDiveMovie && (
                <AdminFilmDeepDive 
                    movie={deepDiveMovie} 
                    onClose={() => setDeepDiveMovie(null)} 
                />
            )}
        </div>
    );
};

export default MovieEditor;
