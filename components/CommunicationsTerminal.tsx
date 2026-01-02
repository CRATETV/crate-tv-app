
import React, { useState, useMemo } from 'react';
import { AnalyticsData, CrateFestConfig, Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface CommunicationsTerminalProps {
    analytics: AnalyticsData | null;
    festivalConfig: CrateFestConfig | null;
    movies: Record<string, Movie>;
}

const TEMPLATES = [
    { id: 'festival_launch', label: '🎡 Festival Launch', prompt: 'Announcing Crate Fest! Focus on exclusive blocks and all-access passes.' },
    { id: 'new_premiere', label: '🎬 Film Premiere', prompt: 'Announcing a new official selection now streaming in the catalog.' },
    { id: 'watchlist_reminder', label: '🔔 Watchlist Sync', prompt: 'Remind users to check their watchlist and support filmmakers directly.' },
    { id: 'creator_handshake', label: '🤝 Creator Welcome', prompt: 'A warm welcome to new filmmakers joining the Crate TV Infrastructure.' }
];

const CommunicationsTerminal: React.FC<CommunicationsTerminalProps> = ({ analytics, festivalConfig, movies }) => {
    const [subject, setSubject] = useState('');
    const [htmlBody, setHtmlBody] = useState('');
    const [audience, setAudience] = useState<'all' | 'actors' | 'filmmakers'>('all');
    const [status, setStatus] = useState<'idle' | 'drafting' | 'sending' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleAIDraft = async (templateId: string) => {
        setStatus('drafting');
        setMessage('');
        
        const template = TEMPLATES.find(t => t.id === templateId);
        const password = sessionStorage.getItem('adminPassword');

        try {
            const res = await fetch('/api/generate-email-copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password, 
                    templatePrompt: template?.prompt,
                    festivalTitle: festivalConfig?.title,
                    festivalDates: `${festivalConfig?.startDate} to ${festivalConfig?.endDate}`,
                    // FIX: Explicitly cast Object.values(movies) to Movie[] to resolve 'm.title' property access on 'unknown' type.
                    recentMovies: (Object.values(movies) as Movie[]).slice(0, 3).map(m => m.title).join(', ')
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Drafting failed.');
            
            setSubject(data.subject);
            setHtmlBody(data.htmlBody);
            setStatus('idle');
        } catch (err) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'AI drafting unavailable.');
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !htmlBody.trim()) return;
        
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
            setMessage(`Broadcast successful to ${audience} segment.`);
            setSubject('');
            setHtmlBody('');
        } catch (err) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'System rejection.');
        }
    };

    return (
        <div className="space-y-10 animate-[fadeIn_0.4s_ease-out]">
            <div className="bg-gradient-to-br from-red-900/40 via-gray-900 to-black p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic mb-4">Strategic Dispatcher</h2>
                    <p className="text-gray-400 font-medium max-w-2xl mb-10 leading-relaxed">Synthesize cinematic notifications and dispatch them across the global audience cluster. Use AI drafting to ensure high-engagement narratives.</p>
                    
                    <div className="flex flex-wrap gap-3">
                        {TEMPLATES.map(t => (
                            <button 
                                key={t.id}
                                onClick={() => handleAIDraft(t.id)}
                                disabled={status === 'drafting'}
                                className="bg-white/5 hover:bg-white text-gray-500 hover:text-black border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                {status === 'drafting' ? '...' : t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Writing Terminal */}
                <form onSubmit={handleSend} className="bg-[#0f0f0f] border border-white/5 p-8 md:p-12 rounded-[2.5rem] space-y-8">
                    <div className="space-y-6">
                        <div>
                            <label className="form-label">Audience Segment</label>
                            <div className="flex gap-2">
                                {(['all', 'actors', 'filmmakers'] as const).map(a => (
                                    <button 
                                        key={a}
                                        type="button"
                                        onClick={() => setAudience(a)}
                                        className={`flex-1 py-3 rounded-xl border font-black uppercase text-[9px] tracking-widest transition-all ${audience === a ? 'bg-red-600 border-red-500 text-white' : 'bg-black border-white/5 text-gray-600 hover:text-white'}`}
                                    >
                                        {a}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="form-label">Transmission Subject</label>
                            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Cinematic Headline..." className="form-input bg-black/40 border-white/10" required />
                        </div>

                        <div>
                            <label className="form-label">Message Payload (HTML)</label>
                            <textarea value={htmlBody} onChange={e => setHtmlBody(e.target.value)} placeholder="Email body structure..." className="form-input bg-black/40 border-white/10 h-80 font-mono text-xs" required />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                        <button 
                            type="submit" 
                            disabled={status === 'sending' || status === 'drafting'}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-xs shadow-2xl transition-all active:scale-95 disabled:opacity-30"
                        >
                            {status === 'sending' ? 'Dispatching Stream...' : 'Initialize Global Broadcast'}
                        </button>
                        {message && <p className={`mt-4 text-center text-[10px] font-black uppercase tracking-widest ${status === 'error' ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
                    </div>
                </form>

                {/* Preview Terminal */}
                <div className="space-y-6 flex flex-col h-full">
                    <div className="flex-grow bg-white text-black p-12 rounded-[2.5rem] shadow-inner overflow-y-auto relative">
                        <div className="absolute top-4 left-4 bg-gray-100 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-gray-400">Live Preview Container</div>
                        {htmlBody ? (
                            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: htmlBody }} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-20 space-y-4">
                                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                <p className="text-xl font-black uppercase tracking-tighter">Awaiting Dispatch Data</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Dispatcher Logistics</h4>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <p className="text-[8px] font-black text-gray-700 uppercase">Estimated Reach</p>
                                 <p className="text-sm font-bold text-white uppercase">{analytics?.totalUsers || 0} Nodes</p>
                             </div>
                             <div>
                                 <p className="text-[8px] font-black text-gray-700 uppercase">Latency Priority</p>
                                 <p className="text-sm font-bold text-white uppercase">Critical / 1</p>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunicationsTerminal;
