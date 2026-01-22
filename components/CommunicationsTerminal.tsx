import React, { useState, useMemo, useEffect } from 'react';
import { Movie, EditorialStory, UserRecord } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';

interface CommunicationsTerminalProps {
    movies: Record<string, Movie>;
}

const TEMPLATES = [
    { id: 'zine_dispatch', label: '📰 Zine Dispatch', prompt: 'Summarize the selected Zine story into a prestigious, high-velocity email newsletter. Use 3-4 punchy paragraphs. Focus on the creative vision and industrial aesthetic.' },
    { id: 'festival_hype', label: '🎪 Festival Hype', prompt: 'Draft a high-energy alert about the upcoming Film Festival. Mention exclusive access for pass holders and live talkbacks.' },
    { id: 'reengagement', label: '🔒 Vault Reactivation', prompt: 'Draft a professional re-engagement email for inactive subscribers. Mention that the Crate Vault has been updated with new 4K masters.' }
];

const CommunicationsTerminal: React.FC<CommunicationsTerminalProps> = ({ movies }) => {
    const [stories, setStories] = useState<EditorialStory[]>([]);
    const [subscribers, setSubscribers] = useState<{ email: string }[]>([]);
    const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
    
    const [selectedStoryId, setSelectedStoryId] = useState('');
    const [subject, setSubject] = useState('');
    const [htmlBody, setHtmlBody] = useState('');
    const [audience, setAudience] = useState<'subscribers' | 'all' | 'creators'>('subscribers');
    const [status, setStatus] = useState<'idle' | 'drafting' | 'sending' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        
        db.collection('editorial_stories').orderBy('publishedAt', 'desc').limit(20).get().then(snap => {
            const fetched: EditorialStory[] = [];
            snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as EditorialStory));
            setStories(fetched);
            if (fetched.length > 0) setSelectedStoryId(fetched[0].id);
        });

        db.collection('zine_subscriptions').get().then(snap => {
            const fetched: { email: string }[] = [];
            snap.forEach(doc => fetched.push({ email: doc.id }));
            setSubscribers(fetched);
        });

        db.collection('users').get().then(snap => {
            const fetched: UserRecord[] = [];
            snap.forEach(doc => fetched.push({ uid: doc.id, ...doc.data() } as UserRecord));
            setAllUsers(fetched);
        });
    }, []);

    const targetCounts = useMemo(() => ({
        subscribers: subscribers.length,
        all: allUsers.length,
        creators: allUsers.filter(u => u.isActor || u.isFilmmaker).length
    }), [subscribers, allUsers]);

    const handleAIDraft = async (templateId: string) => {
        if (templateId === 'zine_dispatch' && !selectedStoryId) {
            alert("Select a story manifest to synthesize dispatch.");
            return;
        }

        setStatus('drafting');
        setMessage('');
        const template = TEMPLATES.find(t => t.id === templateId);
        const story = stories.find(s => s.id === selectedStoryId);
        const password = sessionStorage.getItem('adminPassword');

        try {
            const res = await fetch('/api/generate-email-copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password, 
                    templatePrompt: template?.prompt,
                    storyContext: story ? { title: story.title, subtitle: story.subtitle, sections: story.sections?.slice(0, 3) } : null
                }),
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
            setMessage(`Dispatch successful. Reach: ${count} nodes.`);
        } catch (err) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'System rejection.');
        }
    };

    return (
        <div className="space-y-10 animate-[fadeIn_0.4s_ease-out] pb-32">
            <div className="bg-[#020202] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-12 scale-150">
                    <h1 className="text-[15rem] font-black italic tracking-tighter">CRATE</h1>
                </div>
                
                <div className="relative z-10 space-y-12">
                    <div>
                        <h2 className="text-7xl font-black text-white uppercase tracking-tighter italic leading-none">DISPATCH</h2>
                        <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-2">Active target base: {targetCounts.all} global nodes / {targetCounts.subscribers} zine subscribers.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-gray-600 tracking-[0.3em]">Story Manifest Source</label>
                            <select value={selectedStoryId} onChange={e => setSelectedStoryId(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white p-5 rounded-2xl focus:border-red-600 outline-none shadow-inner">
                                {stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end gap-3">
                            {TEMPLATES.map(t => (
                                <button key={t.id} onClick={() => handleAIDraft(t.id)} disabled={status === 'drafting'} className="flex-1 bg-white/5 hover:bg-white text-gray-500 hover:text-black font-black py-4 rounded-2xl uppercase text-[9px] tracking-widest border border-white/10 transition-all disabled:opacity-30">
                                    {status === 'drafting' ? '...' : t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSend} className="grid grid-cols-1 lg:grid-cols-2 gap-10 border-t border-white/5 pt-12">
                        <div className="space-y-6">
                            <div>
                                <label className="form-label">Email Segment</label>
                                <div className="grid grid-cols-3 gap-2 p-1 bg-black rounded-2xl border border-white/5">
                                    {(['subscribers', 'creators', 'all'] as const).map(a => (
                                        <button key={a} type="button" onClick={() => setAudience(a)} className={`py-4 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${audience === a ? 'bg-red-600 text-white shadow-xl' : 'text-gray-500 hover:text-gray-400'}`}>
                                            {a} ({targetCounts[a]})
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Headline (Subject)</label>
                                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Cinematic headline..." className="form-input bg-black border-white/10 text-xl font-black italic" required />
                            </div>
                            <div>
                                <label className="form-label">Payload (Body HTML)</label>
                                <textarea value={htmlBody} onChange={e => setHtmlBody(e.target.value)} placeholder="Enter content..." className="form-input bg-black border-white/10 h-[300px] font-mono text-xs" required />
                            </div>
                            <button type="submit" disabled={status === 'sending' || !subject || !htmlBody} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-8 rounded-3xl uppercase tracking-[0.5em] text-sm shadow-xl transition-all">
                                {status === 'sending' ? 'TRANSMITTING...' : 'EXECUTE GLOBAL DISPATCH'}
                            </button>
                            {message && <p className={`text-center text-xs font-black uppercase tracking-widest ${status === 'error' ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
                        </div>

                        <div className="bg-[#050505] border border-white/10 rounded-[3rem] p-10 space-y-8 flex flex-col shadow-inner overflow-hidden">
                             <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Transmission Proof</span>
                             </div>
                             <div className="flex-grow overflow-y-auto pr-4 scrollbar-hide text-gray-400 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: htmlBody || '<p style="opacity: 0.2">Manifest content pending uplink draft...</p>' }} />
                             <div className="pt-6 border-t border-white/5 text-center">
                                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-24 invert opacity-20 mx-auto" alt="" />
                             </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CommunicationsTerminal;