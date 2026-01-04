
import React, { useState, useMemo, useEffect } from 'react';
import { AnalyticsData, CrateFestConfig, Movie, EditorialStory, FilmBlock, UserRecord } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';

interface CommunicationsTerminalProps {
    analytics: AnalyticsData | null;
    festivalConfig: CrateFestConfig | null;
    movies: Record<string, Movie>;
}

const TEMPLATES = [
    { id: 'reengagement', label: '🔒 Vault Reactivation', prompt: 'Crate Zine Re-engagement. Tone: "Power restored to your sector." Direct the dormant node to resume their cinematic session with 2-3 new high-priority films from the Daily Chart.' },
    { id: 'newsletter', label: '⚡ CRATE // THE ZINE', prompt: 'Crate Zine main dispatch (Issue Announcement). High-energy cinematic vibe. Use terms like "The Genesis Issue", "Toxic High-Voltage Cinema", and "The Daily Chart". Include a reference to checking the latest curated rankings.' },
    { id: 'festival_hype', label: '⚙️ Machine Hype', prompt: 'Festival block reveal. Create high-velocity hype for a specific set of films. Connect it to their potential to climb the Top 10 chart.' },
    { id: 'daily_reminder', label: '📟 Sync Update', prompt: 'Daily catalog reminder. Minimal, technical, and urgent. Link to the Top 10 Today.' }
];

const VIDEO_LAYOUTS = [
    { id: 'vault', label: 'Vault Kinetic', prompt: 'Mechanical gears turning, heavy vault door opening slowly, industrial steam, deep red glowing accents, cinematic metallic textures, dark atmosphere.' },
    { id: 'overdrive', label: 'Power Overdrive', prompt: 'Electrical arcs, high voltage sparks, flickering red laboratory lights, fast camera movements, glitchy digital energy.' },
    { id: 'aperture', label: 'Aperture Focus', prompt: 'Cinematic camera lens shutters opening and closing, macro shots of high-end optics, anamorphic blue lens flares, sophisticated dark studio lighting.' },
    { id: 'monolith', label: 'The Monolith', prompt: 'Brutalistic concrete architecture, massive scale, shadows moving across stone, slow dramatic pans, minimal and imposing atmosphere.' }
];

const CommunicationsTerminal: React.FC<CommunicationsTerminalProps> = ({ analytics, festivalConfig, movies }) => {
    const [view, setView] = useState<'dispatch' | 'studio'>('dispatch');
    const [stories, setStories] = useState<EditorialStory[]>([]);
    const [blocks, setBlocks] = useState<FilmBlock[]>([]);
    const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
    const [selectedFilmKey, setSelectedFilmKey] = useState('');
    const [selectedBlockId, setSelectedBlockId] = useState('');
    const [selectedStoryId, setSelectedStoryId] = useState('');
    
    // Dispatch State
    const [subject, setSubject] = useState('');
    const [htmlBody, setHtmlBody] = useState('');
    const [audience, setAudience] = useState<'all' | 'actors' | 'filmmakers' | 'inactive'>('all');
    const [status, setStatus] = useState<'idle' | 'drafting' | 'sending' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    // Video Studio State
    const [selectedVideoLayout, setSelectedVideoLayout] = useState('vault');
    const [videoStatus, setVideoStatus] = useState<'idle' | 'generating' | 'polling' | 'success' | 'error'>('idle');
    const [videoUrl, setVideoUrl] = useState('');
    const [hasApiKey, setHasApiKey] = useState(false);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        
        db.collection('editorial_stories').orderBy('publishedAt', 'desc').limit(10).get().then(snap => {
            const fetched: EditorialStory[] = [];
            snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as EditorialStory));
            setStories(fetched);
        });

        db.collection('festival').doc('schedule').collection('days').get().then(snap => {
            const fetched: FilmBlock[] = [];
            snap.forEach(doc => {
                const day = doc.data();
                if (day.blocks) fetched.push(...day.blocks);
            });
            setBlocks(fetched);
        });

        db.collection('users').get().then(snap => {
            const fetched: UserRecord[] = [];
            snap.forEach(doc => fetched.push({ uid: doc.id, ...doc.data() } as UserRecord));
            setAllUsers(fetched);
        });

        const checkKey = async () => {
            if ((window as any).aistudio) {
                const has = await (window as any).aistudio.hasSelectedApiKey();
                setHasApiKey(has);
            }
        };
        checkKey();
    }, []);

    const handleOpenKeySelector = async () => {
        if ((window as any).aistudio) {
            await (window as any).aistudio.openSelectKey();
            setHasApiKey(true);
        }
    };

    const inactiveCount = useMemo(() => {
        const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
        return allUsers.filter(u => {
            if (!u.lastSignIn) return true;
            return new Date(u.lastSignIn).getTime() < twoWeeksAgo;
        }).length;
    }, [allUsers]);

    const handleAIDraft = async (templateId: string) => {
        setStatus('drafting');
        setMessage('');
        const template = TEMPLATES.find(t => t.id === templateId);
        const password = sessionStorage.getItem('adminPassword');
        const film = selectedFilmKey ? movies[selectedFilmKey] : null;
        const story = selectedStoryId ? stories.find(s => s.id === selectedStoryId) : null;
        const block = selectedBlockId ? blocks.find(b => b.id === selectedBlockId) : null;

        const context = {
            festivalTitle: festivalConfig?.title || 'Crate Fest',
            templatePrompt: template?.prompt,
            isReengagement: templateId === 'reengagement',
            filmContext: film ? { title: film.title, director: film.director, synopsis: film.synopsis } : null,
            storyContext: story ? { title: story.title, subtitle: story.subtitle, content: story.content.slice(0, 500) } : null,
            blockContext: block ? { title: block.title, time: block.time, films: block.movieKeys.map(k => movies[k]?.title).filter(Boolean) } : null
        };

        try {
            const res = await fetch('/api/generate-email-copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, ...context }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Drafting failed.');
            setSubject(data.subject);
            setHtmlBody(data.htmlBody);
            setStatus('idle');
        } catch (err) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'Uplink failed.');
        }
    };

    const handleGenerateVideo = async () => {
        const film = movies[selectedFilmKey];
        if (!film) {
            alert("Bind film context to initialize Crate Studio synthesis.");
            return;
        }

        setVideoStatus('generating');
        const layout = VIDEO_LAYOUTS.find(l => l.id === selectedVideoLayout);
        
        try {
            const res = await fetch('/api/generate-hype-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password: sessionStorage.getItem('adminPassword'),
                    filmTitle: film.title,
                    synopsis: film.synopsis,
                    stylePrompt: layout?.prompt 
                }),
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Synthesis rejected.');

            setVideoStatus('polling');
            setVideoUrl(data.videoUrl);
            setVideoStatus('success');
        } catch (err) {
            setVideoStatus('error');
            setMessage(err instanceof Error ? err.message : 'Uplink to Veo Core failed.');
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const count = audience === 'inactive' ? inactiveCount : (analytics?.totalUsers || '??');
        if (!window.confirm(`BROADCAST PROTOCOL: Dispatch Zine Issue to ${count} nodes?`)) return;

        setStatus('sending');
        setMessage('');
        const password = sessionStorage.getItem('adminPassword');

        try {
            const response = await fetch('/api/send-bulk-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, htmlBody, password, audience }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Dispatch failed.');
            setStatus('success');
            setMessage(`Dispatch complete. Segment reach: ${count} nodes.`);
            setSubject('');
            setHtmlBody('');
        } catch (err) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'System rejection.');
        }
    };

    return (
        <div className="space-y-10 animate-[fadeIn_0.4s_ease-out]">
            {/* View Selector */}
            <div className="flex gap-4 p-1.5 bg-black border border-white/5 rounded-2xl w-max mx-auto shadow-2xl">
                <button onClick={() => setView('dispatch')} className={`px-12 py-3 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center gap-3 ${view === 'dispatch' ? 'bg-red-600 text-white' : 'text-gray-600 hover:text-gray-400'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    Dispatch
                </button>
                <button onClick={() => setView('studio')} className={`px-12 py-3 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center gap-3 ${view === 'studio' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-400'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Studio
                </button>
            </div>

            <div className="bg-[#020202] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-12 scale-150">
                    <h1 className="text-[15rem] font-black italic tracking-tighter">CRATE</h1>
                </div>
                
                <div className="relative z-10 space-y-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="flex flex-col md:flex-row items-baseline gap-4">
                            <h2 className="text-7xl font-black text-white uppercase tracking-tighter italic leading-none">CRATE</h2>
                            <h3 className="text-xl font-bold uppercase tracking-[0.6em] text-gray-500">zine</h3>
                        </div>
                        {view === 'studio' && (
                            <button 
                                onClick={handleOpenKeySelector}
                                className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-2xl ${hasApiKey ? 'bg-green-600/10 border-green-500/20 text-green-500' : 'bg-red-600 text-white animate-pulse'}`}
                            >
                                {hasApiKey ? '✓ Studio Link Active' : 'Establish Power Link'}
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-gray-600 tracking-[0.3em]">Issue Focus (Film)</label>
                            <select value={selectedFilmKey} onChange={e => setSelectedFilmKey(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white p-5 rounded-2xl font-bold focus:border-red-600 outline-none shadow-inner">
                                <option value="">No Film Bound</option>
                                {(Object.values(movies) as Movie[]).sort((a,b) => a.title.localeCompare(b.title)).map(m => <option key={m.key} value={m.key}>{m.title}</option>)}
                            </select>
                        </div>
                        
                        {view === 'dispatch' ? (
                            <>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase text-gray-600 tracking-[0.3em]">Festival Block</label>
                                    <select value={selectedBlockId} onChange={e => setSelectedBlockId(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white p-5 rounded-2xl focus:border-red-600 outline-none">
                                        <option value="">No Block Selected</option>
                                        {blocks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase text-gray-600 tracking-[0.3em]">Zine Issue Draft</label>
                                    <select value={selectedStoryId} onChange={e => setSelectedStoryId(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white p-5 rounded-2xl focus:border-red-600 outline-none">
                                        <option value="">No Draft Selected</option>
                                        {stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                    </select>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4 md:col-span-2">
                                <label className="text-[10px] font-black uppercase text-gray-600 tracking-[0.3em]">Mechanical Preset</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {VIDEO_LAYOUTS.map(l => (
                                        <button 
                                            key={l.id} 
                                            onClick={() => setSelectedVideoLayout(l.id)} 
                                            className={`py-4 px-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedVideoLayout === l.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.4)]' : 'bg-white/5 text-gray-600 border-white/5 hover:text-gray-400'}`}
                                        >
                                            {l.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-4 pt-10 border-t border-white/5">
                        {view === 'dispatch' ? (
                            TEMPLATES.map(t => (
                                <button key={t.id} onClick={() => handleAIDraft(t.id)} disabled={status === 'drafting'} className={`font-black px-12 py-5 rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 ${t.id === 'newsletter' ? 'bg-red-600 text-white shadow-[0_15px_40px_rgba(239,68,68,0.3)]' : 'bg-white text-black hover:bg-gray-200'}`}>
                                    {status === 'drafting' ? 'Analyzing Frequency...' : t.label}
                                </button>
                            ))
                        ) : (
                            <button 
                                onClick={handleGenerateVideo} 
                                disabled={videoStatus === 'generating' || videoStatus === 'polling' || !hasApiKey} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-20 py-6 rounded-2xl uppercase tracking-[0.2em] text-xs shadow-[0_30px_70px_rgba(239,68,68,0.4)] active:scale-95 disabled:opacity-20 flex items-center gap-4 group"
                            >
                                <svg className="w-5 h-5 group-hover:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                {videoStatus === 'generating' || videoStatus === 'polling' ? 'Accessing Studio Core...' : 'Initialize Visual Synthesis'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {view === 'dispatch' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <form onSubmit={handleSend} className="bg-[#0a0a0a] border border-white/5 p-12 rounded-[4rem] space-y-12 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <svg className="w-24 h-24 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div className="space-y-10 relative z-10">
                            <div>
                                <label className="form-label">Zine Dispatch Subject</label>
                                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Cinematic headline..." className="form-input bg-black border-white/10 text-2xl font-black italic tracking-tighter" required />
                            </div>
                            <div>
                                <label className="form-label">Zine Payload (HTML)</label>
                                <textarea value={htmlBody} onChange={e => setHtmlBody(e.target.value)} placeholder="HTML payload..." className="form-input bg-black border-white/10 h-[500px] font-mono text-[10px] leading-relaxed" required />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-black rounded-2xl border border-white/5">
                                {(['all', 'actors', 'filmmakers', 'inactive'] as const).map(a => (
                                    <button key={a} type="button" onClick={() => setAudience(a)} className={`py-4 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${audience === a ? 'bg-red-600 text-white shadow-xl' : 'text-gray-600 hover:text-gray-400'}`}>
                                        {a === 'inactive' ? `Inactive (${inactiveCount})` : a}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button type="submit" disabled={status === 'sending' || !subject || !htmlBody} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-8 rounded-3xl uppercase tracking-[0.5em] text-sm shadow-[0_20px_60px_rgba(239,68,68,0.4)] disabled:opacity-30 active:scale-98 transition-all">
                            {status === 'sending' ? 'TRANSMITTING...' : 'EXECUTE GLOBAL DISPATCH'}
                        </button>
                    </form>

                    <div className="flex flex-col h-full bg-white rounded-[4rem] shadow-inner overflow-hidden min-h-[700px] border-[20px] border-black relative">
                        <div className="p-5 bg-gray-100 border-b flex justify-between items-center relative z-10">
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">CRATE // ZINE FEED PREVIEW</span>
                             </div>
                        </div>
                        <div className="flex-grow overflow-y-auto p-16 bg-white relative z-0">
                            <div className="max-w-xl mx-auto space-y-10">
                                <div className="border-b border-gray-100 pb-10">
                                    <h1 className="text-6xl font-black italic text-black tracking-tighter">CRATE</h1>
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 mt-1">zine</p>
                                </div>
                                {htmlBody ? <div dangerouslySetInnerHTML={{ __html: htmlBody }} className="prose prose-sm max-w-none text-gray-800 leading-relaxed font-medium" /> : <div className="h-64 flex flex-col items-center justify-center opacity-10"><h1 className="text-[4rem] font-black italic tracking-tighter text-black">AWAITING</h1><p className="text-xs font-black uppercase tracking-tighter text-black">Uplink Draft</p></div>}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 bg-[#020202] rounded-[4rem] border-[16px] border-black aspect-video overflow-hidden shadow-[0_100px_200px_rgba(0,0,0,1)] relative flex flex-col items-center justify-center group">
                        
                        {/* Aperture Frame Overlays */}
                        <div className="absolute inset-0 pointer-events-none border-[1px] border-white/5 z-40"></div>
                        <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-red-600/30 m-8 z-40"></div>
                        <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-red-600/30 m-8 z-40"></div>

                        {videoUrl ? (
                            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover transition-opacity duration-1000" />
                        ) : (
                            <div className="text-center space-y-10 opacity-30 group-hover:opacity-50 transition-all duration-1000">
                                <div className="w-48 h-48 mx-auto rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center animate-[spin_20s_linear_infinite]">
                                    <svg className="w-20 h-20 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                </div>
                                <p className="text-2xl font-black uppercase tracking-[1em] mr-[-1em] text-white">STUDIO_IDLE</p>
                            </div>
                        )}
                        {videoStatus === 'generating' && (
                            <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center z-50 p-12">
                                <div className="w-24 h-24 relative mb-12">
                                     <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                                     <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                                <p className="text-indigo-500 font-black uppercase tracking-[0.5em] text-xs animate-pulse text-center leading-loose">
                                    BREACHING THE STUDIO...<br/>
                                    CONSTRUCTING KINETIC FRAMES
                                </p>
                                <div className="absolute bottom-16 w-64 h-1 bg-white/5 overflow-hidden rounded-full">
                                    <div className="h-full bg-indigo-600 w-1/3 animate-[loading_1.5s_infinite]"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-8 flex flex-col justify-center">
                        <div className="bg-white/[0.03] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
                             <h4 className="text-[11px] font-black uppercase text-gray-500 tracking-[0.6em] mb-10">STUDIO LOGIC</h4>
                             <div className="space-y-8">
                                <p className="text-base text-gray-400 leading-relaxed font-medium italic">"Crate Studio uses Veo 3.1 to translate narrative DNA into industrial-scale visual energy. Optimized for high-velocity social engagement."</p>
                                <div className="bg-black p-8 rounded-3xl border border-white/10 text-[10px] text-gray-600 space-y-4">
                                    <p className="font-black text-white uppercase tracking-[0.3em] border-b border-white/5 pb-4">Manifest // Studio V4</p>
                                    <ul className="space-y-4">
                                        <li className="flex justify-between items-center"><span className="uppercase">Core Engine</span> <span className="text-green-500 font-bold">VEO_3.1_FAST</span></li>
                                        <li className="flex justify-between items-center"><span className="uppercase">Resolution</span> <span className="text-white font-bold">1080P_MASTER</span></li>
                                        <li className="flex justify-between items-center"><span className="uppercase">Aesthetics</span> <span className="text-white font-bold">{selectedVideoLayout.toUpperCase()}</span></li>
                                    </ul>
                                </div>
                             </div>
                             {videoUrl && (
                                <a 
                                    href={videoUrl} 
                                    download 
                                    className="block w-full text-center mt-12 bg-white text-black font-black py-6 rounded-2xl uppercase text-xs tracking-[0.4em] shadow-[0_20px_50px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.05] active:scale-95"
                                >
                                    EXPORT MASTER
                                </a>
                             )}
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>
        </div>
    );
};

export default CommunicationsTerminal;
