import React, { useState, useMemo, useEffect } from 'react';
import { AnalyticsData, CrateFestConfig, Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface CommunicationsTerminalProps {
    analytics: AnalyticsData | null;
    festivalConfig: CrateFestConfig | null;
    movies: Record<string, Movie>;
}

const TEMPLATES = [
    { id: 'festival_launch', label: '🎡 Festival Launch', prompt: 'Announcing the launch of Crate Fest! Focus on excitement, exclusive blocks, and the value of the all-access pass.' },
    { id: 'marketplace_outreach', label: '🤝 Partner Outreach', prompt: 'Inviting a filmmaker from a marketplace like Filmhub. Highlight our 70/30 revenue split, our Roku presence, and the fact that we are filmmaker-owned. Be professional and elite.' },
    { id: 'daily_reminder', label: '⏰ Daily Schedule', prompt: 'Sending a daily lineup update. Highlight the specific films playing today and encourage users to join the watch parties.' },
    { id: 'filmmaker_spotlight', label: '🎬 Creator Shoutout', prompt: 'Highlighting our independent filmmakers. Focus on the community aspect and the 70/30 support model.' }
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

        // Assemble context for Gemini
        const movieTitles = (Object.values(movies) as Movie[])
            .filter(m => !m.isUnlisted)
            .slice(0, 5)
            .map(m => m.title)
            .join(', ');

        const context = {
            festivalTitle: festivalConfig?.title || 'Crate Fest',
            tagline: festivalConfig?.tagline,
            dates: festivalConfig ? `${festivalConfig.startDate} to ${festivalConfig.endDate}` : 'Coming Soon',
            passPrice: festivalConfig?.passPrice || 15.00,
            featuredFilms: movieTitles,
            templatePrompt: template?.prompt
        };

        try {
            const res = await fetch('/api/generate-email-copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password, 
                    ...context
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
        
        const confirmMsg = `DISPATCH PROTOCOL: Are you sure you want to broadcast this transmission to ALL users in the "${audience}" segment?`;
        if (!window.confirm(confirmMsg)) return;

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
            setMessage(`Strategic Broadcast successful. Reach: ~${analytics?.totalUsers || '??'} nodes.`);
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
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <svg className="w-32 h-32 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>

                <div className="relative z-10">
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic mb-4">Strategic Dispatcher</h2>
                    <p className="text-gray-400 font-medium max-w-2xl mb-10 leading-relaxed text-lg">Synthesize cinematic notifications and dispatch them across the global audience cluster. Use the Gemini core to draft narratives that convert passive viewers into patrons.</p>
                    
                    <div className="flex flex-wrap gap-3">
                        {TEMPLATES.map(t => (
                            <button 
                                key={t.id}
                                onClick={() => handleAIDraft(t.id)}
                                disabled={status === 'drafting'}
                                className="bg-white/5 hover:bg-white text-gray-400 hover:text-black border border-white/10 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30"
                            >
                                {status === 'drafting' ? 'Synthesizing...' : t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Writing Terminal */}
                <form onSubmit={handleSend} className="bg-[#0f0f0f] border border-white/5 p-8 md:p-12 rounded-[3rem] space-y-8 shadow-2xl">
                    <div className="space-y-6">
                        <div>
                            <label className="form-label">Target Audience Segment</label>
                            <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
                                {(['all', 'actors', 'filmmakers'] as const).map(a => (
                                    <button 
                                        key={a}
                                        type="button"
                                        onClick={() => setAudience(a)}
                                        className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${audience === a ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {a}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="form-label">Transmission Subject</label>
                            <input 
                                value={subject} 
                                onChange={e => setSubject(e.target.value)} 
                                placeholder="The subject line of the email..." 
                                className="form-input bg-black/40 border-white/10 text-xl font-black tracking-tight" 
                                required 
                            />
                        </div>

                        <div>
                            <label className="form-label">HTML Payload (Master Source)</label>
                            <textarea 
                                value={htmlBody} 
                                onChange={e => setHtmlBody(e.target.value)} 
                                placeholder="HTML Body Content..." 
                                className="form-input bg-black/40 border-white/10 h-[400px] font-mono text-xs leading-relaxed" 
                                required 
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                        <button 
                            type="submit" 
                            disabled={status === 'sending' || status === 'drafting' || !subject || !htmlBody}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-6 rounded-2xl uppercase tracking-[0.3em] text-sm shadow-2xl shadow-red-900/20 transition-all active:scale-95 disabled:opacity-30"
                        >
                            {status === 'sending' ? 'Dispatching Transmission...' : 'Initialize Global Broadcast'}
                        </button>
                        {message && (
                            <p className={`mt-6 text-center text-xs font-black uppercase tracking-widest ${status === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                                {message}
                            </p>
                        )}
                    </div>
                </form>

                {/* Preview Terminal */}
                <div className="flex flex-col h-full space-y-6">
                    <div className="flex-grow bg-white rounded-[3rem] shadow-inner overflow-hidden flex flex-col min-h-[600px] lg:min-h-0">
                        <div className="p-4 bg-gray-100 border-b flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recipient Preview Monitor</span>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            </div>
                        </div>
                        <div className="flex-grow overflow-y-auto p-12 bg-white text-black">
                            {htmlBody ? (
                                <div className="prose prose-sm max-w-none email-preview-container" dangerouslySetInnerHTML={{ __html: htmlBody }} />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 space-y-4">
                                    <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    <p className="text-xl font-black uppercase tracking-tighter">Awaiting Dispatch Data</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-white/5 border border-white/5 p-8 rounded-3xl">
                         <div className="flex justify-between items-start">
                             <div>
                                 <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-4">Dispatcher Logistics</h4>
                                 <div className="grid grid-cols-2 gap-10">
                                     <div>
                                         <p className="text-[8px] font-black text-gray-700 uppercase mb-1">Target Nodes</p>
                                         <p className="text-xl font-black text-white uppercase">{analytics?.totalUsers || 0} Registered</p>
                                     </div>
                                     <div>
                                         <p className="text-[8px] font-black text-gray-700 uppercase mb-1">Network Priority</p>
                                         <p className="text-xl font-black text-red-500 uppercase italic">High (Level 1)</p>
                                     </div>
                                 </div>
                             </div>
                             <div className="text-right">
                                 <p className="text-[8px] font-black text-gray-700 uppercase mb-1">Delivery System</p>
                                 <p className="text-sm font-bold text-gray-400">Resend // SMTP Secured</p>
                             </div>
                         </div>
                    </div>
                </div>
            </div>

            <style>{`
                .email-preview-container * {
                    all: revert;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                }
            `}</style>
        </div>
    );
};

export default CommunicationsTerminal;