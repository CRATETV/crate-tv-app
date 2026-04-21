import React, { useState } from 'react';
import { SiteSettings, RedCarpetClip } from '../types';

interface RedCarpetAdminProps {
    settings: SiteSettings;
    onSave: (updates: Partial<SiteSettings>) => Promise<void>;
    isSaving: boolean;
}

const RedCarpetAdmin: React.FC<RedCarpetAdminProps> = ({ settings, onSave, isSaving }) => {
    const [enabled, setEnabled] = useState(settings.pwffRedCarpetEnabled || false);
    const [startTime, setStartTime] = useState(settings.pwffRedCarpetStartTime || '');
    const [endTime, setEndTime] = useState(settings.pwffRedCarpetEndTime || '');
    const [host, setHost] = useState(settings.pwffRedCarpetHost || '');
    const [welcomeVideo, setWelcomeVideo] = useState(settings.pwffRedCarpetWelcomeVideo || '');
    const [filmTitle, setFilmTitle] = useState(settings.pwffRedCarpetFilmTitle || '');
    const [filmDirector, setFilmDirector] = useState(settings.pwffRedCarpetFilmDirector || '');
    const [clips, setClips] = useState<RedCarpetClip[]>(settings.pwffRedCarpetClips || []);
    const [saved, setSaved] = useState(false);

    const addClip = () => {
        setClips(prev => [...prev, {
            id: `clip_${Date.now()}`,
            filmmakerName: '',
            filmTitle: '',
            videoUrl: '',
            order: prev.length,
        }]);
    };

    const updateClip = (id: string, field: keyof RedCarpetClip, value: string | number) => {
        setClips(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const removeClip = (id: string) => {
        setClips(prev => prev.filter(c => c.id !== id));
    };

    const moveClip = (id: string, dir: 'up' | 'down') => {
        setClips(prev => {
            const idx = prev.findIndex(c => c.id === id);
            if (dir === 'up' && idx === 0) return prev;
            if (dir === 'down' && idx === prev.length - 1) return prev;
            const next = [...prev];
            const swap = dir === 'up' ? idx - 1 : idx + 1;
            [next[idx], next[swap]] = [next[swap], next[idx]];
            return next.map((c, i) => ({ ...c, order: i }));
        });
    };

    const handleSave = async () => {
        await onSave({
            pwffRedCarpetEnabled: enabled,
            pwffRedCarpetStartTime: startTime,
            pwffRedCarpetEndTime: endTime,
            pwffRedCarpetHost: host,
            pwffRedCarpetWelcomeVideo: welcomeVideo,
            pwffRedCarpetFilmTitle: filmTitle,
            pwffRedCarpetFilmDirector: filmDirector,
            pwffRedCarpetClips: clips,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const carpetUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/red-carpet`
        : '/red-carpet';

    return (
        <div className="space-y-8">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black uppercase tracking-widest italic text-white">Virtual Red Carpet</h3>
                    <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-widest">Opening night pre-show — 30 min before the film</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                        {enabled ? 'Active' : 'Off'}
                    </span>
                    <button
                        onClick={() => setEnabled(!enabled)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-red-600' : 'bg-gray-800'}`}
                    >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${enabled ? 'left-6' : 'left-0.5'}`} />
                    </button>
                </div>
            </div>

            {/* Carpet URL */}
            {enabled && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1">Red Carpet URL — share with ticket holders</p>
                        <p className="text-white font-mono text-sm">{carpetUrl}</p>
                    </div>
                    <button
                        onClick={() => navigator.clipboard?.writeText(carpetUrl)}
                        className="text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors border border-white/10 px-3 py-2 rounded-lg whitespace-nowrap"
                    >
                        Copy Link
                    </button>
                </div>
            )}

            {/* Timing */}
            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Carpet Timing</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Carpet Opens (30 min before)</label>
                        <input
                            type="datetime-local"
                            value={startTime ? startTime.slice(0, 16) : ''}
                            onChange={e => setStartTime(new Date(e.target.value).toISOString())}
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/40 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Film Begins (carpet closes)</label>
                        <input
                            type="datetime-local"
                            value={endTime ? endTime.slice(0, 16) : ''}
                            onChange={e => setEndTime(new Date(e.target.value).toISOString())}
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/40 transition-all"
                        />
                        <p className="text-[9px] text-gray-700 mt-1">At this time all viewers are sent directly into the watch party</p>
                    </div>
                </div>
            </div>

            {/* Opening night film */}
            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Opening Night Film</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Film Title</label>
                        <input
                            type="text"
                            value={filmTitle}
                            onChange={e => setFilmTitle(e.target.value)}
                            placeholder="e.g. You Don't Know My Name"
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/40 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Director</label>
                        <input
                            type="text"
                            value={filmDirector}
                            onChange={e => setFilmDirector(e.target.value)}
                            placeholder="e.g. Aliya Kamara"
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/40 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Host welcome */}
            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Host Welcome Clip</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Host Name</label>
                        <input
                            type="text"
                            value={host}
                            onChange={e => setHost(e.target.value)}
                            placeholder="e.g. Salome Denoon"
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/40 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Welcome Video S3 URL</label>
                        <input
                            type="text"
                            value={welcomeVideo}
                            onChange={e => setWelcomeVideo(e.target.value)}
                            placeholder="https://cratetelevision.s3.amazonaws.com/..."
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/40 transition-all"
                        />
                        <p className="text-[9px] text-gray-700 mt-1">Record a 60-90 second welcome, upload to S3, paste URL here</p>
                    </div>
                </div>
            </div>

            {/* Filmmaker clips */}
            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Filmmaker Intro Clips</p>
                        <p className="text-[9px] text-gray-700 mt-1">Each filmmaker records a 30-60 second intro about their film — upload to S3 and add here</p>
                    </div>
                    <button
                        onClick={addClip}
                        className="bg-red-600 hover:bg-red-700 text-white font-black px-4 py-2 rounded-xl text-[9px] uppercase tracking-widest transition-all active:scale-95"
                    >
                        + Add Filmmaker
                    </button>
                </div>

                {clips.length === 0 && (
                    <div className="text-center py-8 border border-dashed border-white/5 rounded-2xl">
                        <p className="text-gray-700 text-[10px] uppercase tracking-widest font-black">No filmmaker clips added yet</p>
                        <p className="text-gray-800 text-[9px] mt-1">Ask filmmakers to record a short intro and send you the file</p>
                    </div>
                )}

                <div className="space-y-4">
                    {clips.map((clip, i) => (
                        <div key={clip.id} className="bg-black border border-white/5 p-5 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">Clip {i + 1}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => moveClip(clip.id, 'up')} disabled={i === 0} className="text-gray-700 hover:text-white disabled:opacity-30 transition-colors text-xs px-1">↑</button>
                                    <button onClick={() => moveClip(clip.id, 'down')} disabled={i === clips.length - 1} className="text-gray-700 hover:text-white disabled:opacity-30 transition-colors text-xs px-1">↓</button>
                                    <button onClick={() => removeClip(clip.id)} className="text-red-600 hover:text-red-400 transition-colors text-[9px] font-black uppercase tracking-widest ml-2">Remove</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={clip.filmmakerName}
                                    onChange={e => updateClip(clip.id, 'filmmakerName', e.target.value)}
                                    placeholder="Filmmaker name"
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-xs focus:outline-none focus:border-red-500/30 transition-all"
                                />
                                <input
                                    type="text"
                                    value={clip.filmTitle}
                                    onChange={e => updateClip(clip.id, 'filmTitle', e.target.value)}
                                    placeholder="Film title"
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-xs focus:outline-none focus:border-red-500/30 transition-all"
                                />
                            </div>
                            <input
                                type="text"
                                value={clip.videoUrl}
                                onChange={e => updateClip(clip.id, 'videoUrl', e.target.value)}
                                placeholder="S3 video URL — https://cratetelevision.s3.amazonaws.com/..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-xs focus:outline-none focus:border-red-500/30 transition-all font-mono"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Save */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <p className="text-[10px] text-gray-700 italic">Changes go live immediately when saved</p>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`font-black py-4 px-12 rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg ${saved ? 'bg-green-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'} disabled:opacity-50`}
                >
                    {saved ? 'Saved' : isSaving ? 'Saving...' : 'Save Red Carpet'}
                </button>
            </div>
        </div>
    );
};

export default RedCarpetAdmin;
