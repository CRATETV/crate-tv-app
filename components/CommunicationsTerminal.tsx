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
    { id: 'parcel', label: '📦 Cinematic Parcel', prompt: 'Draft a delivery notification email. Treat the new film like a high-end package arrival. Use phrases like "Now Delivered to your Sector" and "Package Contents: Master Cinematic File". dopamine-driven tone.' },
    { id: 'newsletter', label: '⚡ Dispatch Issue', prompt: 'Summarize the provided Zine story into a prestigious newsletter. Focus on the "Daily Chart" and "Authenticity". High-energy industrial tone.' },
    { id: 'reengagement', label: '🔒 Vault Reactivation', prompt: 'Draft a re-engagement email for a dormant node. Tone: "Power restored to your sector." Invite them back to resume their session.' },
    { id: 'festival_hype', label: '⚙️ Machine Hype', prompt: 'Create high-velocity hype for the festival blocks. Mention the 70/30 patronage loop.' }
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
            if (fetched.length > 0) setSelectedStoryId(fetched[0].id);
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

    const targetCounts = useMemo(() => {
        const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
        return {
            all: allUsers.length,
            actors: allUsers.filter(u => u.isActor).length,
            filmmakers: allUsers.filter(u => u.isFilmmaker).length,
            inactive: allUsers.filter(u => !u.lastSignIn || new Date(u.lastSignIn).getTime() < twoWeeksAgo).length
        };
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
            storyContext: story ? { 
                title: story.title, 
                subtitle: story.subtitle, 
                summary: story.sections?.filter(s => s.type === 'text' || s.type === 'header').map(s => s.content).join(' | ').slice(0, 1000) 
            } : null,
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
            setMessage(err instanceof Error ? err.message : 'Uplink failed.');
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const count = targetCounts[audience];
        if (!window.confirm(`BROADCAST PROTOCOL: Dispatch transmission to ${count} nodes in '${audience}' segment?`)) return;
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
        <div className="space-y-10 animate-[fadeIn_0.4s_ease-out] pb-32">
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
                        <div>
                            <div className="flex flex-col md:flex-row items-baseline gap-4">
                                <h2 className="text-7xl font-black text-white uppercase tracking-tighter italic leading-none">DISPATCH</h2>
                                <h3 className="text-xl font-bold uppercase tracking-[0.6em] text-gray-500">terminal</h3>
                            </div>
                            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-2">Active target base: {allUsers.length} nodes in current global user cluster.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-gray-600 tracking-[0.3em]">Context A: Film Focus</label>
                            <select value={selectedFilmKey} onChange={e => setSelectedFilmKey(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white p-5 rounded-2xl font-bold focus:border-red-600 outline-none shadow-inner">
                                <option value="">No Film Bound</option>
                                {(Object.values(movies) as Movie[]).sort((a,b) => a.title.localeCompare(b.title)).map(m => <option key={m.key} value={m.key}>{m.title}</option>)}
                            </select>
                        </div>
                        
                        {view === 'dispatch' ? (
                            <>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase text-gray-600 tracking-[0.3em]">Context B: Festival Block</label>
                                    <select value={selectedBlockId} onChange={e => setSelectedBlockId(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white p-5 rounded-2xl focus:border-red-600 outline-none">
                                        <option value="">No Block Selected</option>
                                        {blocks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase text-gray-600 tracking-[0.3em]">Context C: Zine Story</label>
                                    <select value={selectedStoryId} onChange={e => setSelectedStoryId(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white p-5 rounded-2xl focus:border-red-600 outline-none">
                                        <option value="">No Story Selected</option>
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
                                <button key={t.id} onClick={() => handleAIDraft(t.id)} disabled={status === 'drafting'} className={`font-black px-12 py-5 rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 ${t.id === 'parcel' ? 'bg-amber-600 text-white shadow-[0_15px_40px_rgba(245,158,11,0.3)]' : t.id === 'newsletter' ? 'bg-red-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}>
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

            {view === 'dispatch' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <form onSubmit={handleSend} className="bg-[#0a0a0a] border border-white/5 p-12 rounded-[4rem] space-y-12 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <svg className="w-24 h-24 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div className="space-y-10 relative z-10">
                            <div>
                                <label className="form-label">Email Segment Targeting</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-black rounded-2xl border border-white/5">
                                    {(['all', 'actors', 'filmmakers', 'inactive'] as const).map(a => (
                                        <button key={a} type="button" onClick={() => setAudience(a)} className={`py-4 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${audience === a ? 'bg-red-600 text-white shadow-xl' : 'text-gray-500 hover:text-gray-400'}`}>
                                            {a.charAt(0).toUpperCase() + a.slice(1)} ({targetCounts[a]})
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Transmission Headline (Subject)</label>
                                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Cinematic headline..." className="form-input bg-black border-white/10 text-2xl font-black italic tracking-tighter" required />
                            </div>
                            <div>
                                <label className="form-label">Dispatch Payload (Body HTML)</label>
                                <textarea value={htmlBody} onChange={e => setHtmlBody(e.target.value)} placeholder="Enter HTML content..." className="form-input bg-black border-white/10 h-[400px] font-mono text-[11px] leading-relaxed" required />
                            </div>
                        </div>
                        <button type="submit" disabled={status === 'sending' || !subject || !htmlBody} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-8 rounded-3xl uppercase tracking-[0.5em] text-sm shadow-[0_20px_60px_rgba(239,68,68,0.4)] disabled:opacity-30 active:scale-98 transition-all">
                            {status === 'sending' ? 'TRANSMITTING...' : 'EXECUTE GLOBAL DISPATCH'}
                        </button>
                        {message && <p className={`text-center text-xs font-black uppercase tracking-widest ${status === 'error' ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
                    </form>

                    <div className="flex flex-col h-full bg-[#0a0a0a] rounded-[4rem] shadow-inner overflow-hidden min-h-[700px] border-[20px] border-[#000] relative">
                        <div className="p-5 bg-black border-b border-white/5 flex justify-between items-center relative z-10">
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 italic">FINAL TRANSMISSION PROOF</span>
                             </div>
                        </div>
                        <div className="flex-grow overflow-y-auto p-1 bg-[#050505] relative z-0 flex items-center justify-center">
                            <div className="w-full max-w-[450px] bg-[#050505] border border-white/10 rounded-[32px] overflow-hidden p-10 space-y-8 shadow-2xl">
                                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-24 invert" alt="" />
                                <div className="border-l-4 border-red-600 pl-4">
                                     <p className="text-[8px] font-black text-red-500 uppercase tracking-widest">Official Dispatch</p>
                                     <h4 className="text-xl font-black text-white uppercase tracking-tighter leading-tight">{subject || 'AWAITING_HEADLINE'}</h4>
                                </div>
                                <div className="text-gray-400 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: htmlBody || '<p style="opacity: 0.1">Payload content pending uplink draft...</p>' }} />
                                <div className="pt-6 border-t border-white/5 text-center">
                                    <span className="text-[8px] text-gray-700 font-black uppercase tracking-widest">Global Independent Infrastructure</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === 'studio' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 bg-[#020202] rounded-[4rem] border-[16px] border-black aspect-video overflow-hidden shadow-[0_100px_200px_rgba(0,0,0,1)] relative flex flex-col items-center justify-center group">
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
                                    CONSTRUCTING KINETIC FRAMES
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-8 flex flex-col justify-center">
                        <div className="bg-white/[0.03] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                             <h4 className="text-[11px] font-black uppercase text-gray-500 tracking-[0.6em] mb-10">STUDIO LOGIC</h4>
                             <div className="space-y-8">
                                <p className="text-base text-gray-400 leading-relaxed font-medium italic">"Crate Studio uses Veo 3.1 to translate narrative DNA into industrial-scale visual energy."</p>
                             </div>
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