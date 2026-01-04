
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnalyticsData, CrateFestConfig, Movie, StudioMessage } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import { useFestival } from '../contexts/FestivalContext';
import LoadingSpinner from './LoadingSpinner';

interface ExtendedMessage extends StudioMessage {
    source?: string;
}

interface StudioMailProps {
    analytics: AnalyticsData | null;
    festivalConfig: CrateFestConfig | null;
    movies: Record<string, Movie>;
}

const StudioMail: React.FC<StudioMailProps> = ({ analytics, festivalConfig, movies }) => {
    const { settings } = useFestival();
    const [messages, setMessages] = useState<ExtendedMessage[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<ExtendedMessage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDrafting, setIsDrafting] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [copyStatus, setCopyStatus] = useState(false);
    
    // Composer State
    const [replyText, setReplyText] = useState('');
    const [recipient, setRecipient] = useState('');
    const [subject, setSubject] = useState('');
    const [isNewCompose, setIsNewCompose] = useState(false);

    const authorizedIdentity = settings.businessEmail || "studio@cratetv.net";
    const isSignatureActive = !!settings.emailSignature;

    const handleCopyLink = () => {
        navigator.clipboard.writeText("https://cratetv.net/contact");
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
    };

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const fetchMessages = async () => {
            setIsLoading(true);
            try {
                const [contacts, inquiries, pipeline] = await Promise.all([
                    db.collection('security_events').where('type', 'in', ['CONTACT_SENT', 'SUBMISSION_RECEIVED']).orderBy('timestamp', 'desc').limit(30).get(),
                    db.collection('talent_inquiries').orderBy('timestamp', 'desc').limit(20).get(),
                    db.collection('movie_pipeline').orderBy('submissionDate', 'desc').limit(20).get()
                ]);

                const allMsgs: ExtendedMessage[] = [];

                contacts.forEach(doc => {
                    const data = doc.data();
                    if (data.type === 'CONTACT_SENT') {
                        allMsgs.push({
                            id: doc.id,
                            senderName: data.details?.name || 'User',
                            senderEmail: data.details?.email || 'unknown@cratetv.net',
                            subject: 'General Inquiry Transmission',
                            content: data.details?.message || 'Check system logs for payload.',
                            timestamp: data.timestamp,
                            type: 'CONTACT',
                            status: 'OPEN',
                            source: 'WEB_FORM'
                        });
                    }
                });

                inquiries.forEach(doc => {
                    const data = doc.data();
                    allMsgs.push({
                        id: doc.id,
                        senderName: data.senderName,
                        senderEmail: data.senderEmail,
                        subject: `Talent Inquiry: ${data.actorName}`,
                        content: data.message,
                        timestamp: data.timestamp,
                        type: 'INQUIRY',
                        status: data.status?.toUpperCase() || 'OPEN',
                        source: 'ACTOR_DIRECTORY'
                    });
                });

                pipeline.forEach(doc => {
                    const data = doc.data();
                    allMsgs.push({
                        id: doc.id,
                        senderName: data.director,
                        senderEmail: data.submitterEmail,
                        subject: `Submission: ${data.title}`,
                        content: `FILM SUBMISSION DETAILS:\nTitle: ${data.title}\nDirector: ${data.director}\nLink: ${data.movieUrl}\n\nSynopsis: ${data.synopsis}`,
                        timestamp: data.submissionDate,
                        type: 'SUBMISSION',
                        status: data.status?.toUpperCase() || 'OPEN',
                        source: data.source || 'SUBMIT_FORM'
                    });
                });

                setMessages(allMsgs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
            } catch (e) {
                console.error("Inbox aggregation failed", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMessages();
    }, []);

    const handleSelectMessage = (msg: ExtendedMessage) => {
        setIsNewCompose(false);
        setSelectedMessage(msg);
        setRecipient(msg.senderEmail);
        setSubject(`Re: ${msg.subject}`);
        setReplyText('');
    };

    const handleDraftWithAI = async () => {
        if (!selectedMessage && !isNewCompose) return;
        setIsDrafting(true);
        const password = sessionStorage.getItem('adminPassword');

        try {
            const res = await fetch('/api/draft-studio-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password, 
                    context: selectedMessage ? selectedMessage.content : 'General studio update',
                    senderName: selectedMessage?.senderName,
                    type: selectedMessage?.type || 'GENERAL'
                }),
            });
            const data = await res.json();
            setReplyText(data.draft);
        } catch (e) {
            alert("AI Drafting failed.");
        } finally {
            setIsDrafting(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        const password = sessionStorage.getItem('adminPassword');

        try {
            const res = await fetch('/api/send-individual-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password, 
                    email: recipient, 
                    subject, 
                    htmlBody: replyText.replace(/\n/g, '<br/>')
                }),
            });
            if (res.ok) {
                alert(`Transmission Dispatched via ${authorizedIdentity}.`);
                setReplyText('');
                if (isNewCompose) setIsNewCompose(false);
            } else {
                const err = await res.json();
                throw new Error(err.error);
            }
        } catch (e) {
            alert(`Transmission failed: ${e instanceof Error ? e.message : 'Unknown Error'}`);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-280px)] min-h-[650px] animate-[fadeIn_0.5s_ease-out]">
            
            {/* Top Routing Helper */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-grow bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Routing Link Active</p>
                            <p className="text-xs text-white">Authorized Brand Identity: <span className="text-red-500 font-bold">{authorizedIdentity}</span></p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleCopyLink}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copyStatus ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-500 border border-white/10 hover:bg-white hover:text-black'}`}
                        >
                            {copyStatus ? 'Link Copied' : 'Contact Dashboard Link'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-grow flex gap-6 overflow-hidden">
                
                {/* Inbox Sidebar */}
                <div className="w-96 flex flex-col bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Studio Dispatch</h3>
                            <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest mt-0.5">Aggregated Inbound Feed</p>
                        </div>
                        <button 
                            onClick={() => { setIsNewCompose(true); setSelectedMessage(null); setRecipient(''); setSubject(''); setReplyText(''); }}
                            className="p-2.5 bg-red-600/10 hover:bg-red-600 rounded-xl text-red-500 hover:text-white transition-all border border-red-600/20"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto scrollbar-hide">
                        {isLoading ? <div className="p-10 text-center"><LoadingSpinner /></div> : messages.length === 0 ? (
                            <div className="p-10 text-center opacity-20">
                                <p className="text-xs font-black uppercase tracking-widest">No Active Transmissions</p>
                            </div>
                        ) : (
                            messages.map(msg => (
                                <button 
                                    key={msg.id}
                                    onClick={() => handleSelectMessage(msg)}
                                    className={`w-full text-left p-6 border-b border-white/5 transition-all hover:bg-white/[0.02] group ${selectedMessage?.id === msg.id ? 'bg-red-600/5 !border-red-600/30' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex gap-1.5">
                                            <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded border ${msg.type === 'SUBMISSION' ? 'text-blue-500 border-blue-500/30 bg-blue-500/5' : msg.type === 'INQUIRY' ? 'text-purple-500 border-purple-500/30 bg-purple-500/5' : 'text-gray-500 border-white/10 bg-white/5'}`}>{msg.type}</span>
                                            {msg.source && <span className="text-[7px] font-black uppercase text-gray-700 bg-black px-1.5 py-0.5 rounded tracking-tighter">{msg.source.replace('_', ' ')}</span>}
                                        </div>
                                        <span className="text-[9px] text-gray-700 font-mono">{msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleDateString() : '---'}</span>
                                    </div>
                                    <h4 className={`text-sm font-black uppercase truncate group-hover:text-red-500 transition-colors ${selectedMessage?.id === msg.id ? 'text-red-500' : 'text-white'}`}>{msg.senderName}</h4>
                                    <p className="text-[10px] text-gray-500 truncate mt-1 font-medium">{msg.subject}</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Message Detail / Composer */}
                <div className="flex-grow bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden relative">
                    {!selectedMessage && !isNewCompose ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center opacity-20 space-y-4">
                            <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-32 invert" alt="" />
                            <p className="text-sm font-black uppercase tracking-[0.5em]">Studio Communications Hub</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full animate-[fadeIn_0.3s_ease-out]">
                            {/* Header */}
                            <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                                {isNewCompose ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2 block">Destination Address</label>
                                            <input 
                                                value={recipient} 
                                                onChange={e => setRecipient(e.target.value)} 
                                                placeholder="email@address.com" 
                                                className="w-full bg-transparent text-xl font-black uppercase tracking-tighter text-white focus:outline-none placeholder:text-gray-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2 block">Transmission Subject</label>
                                            <input 
                                                value={subject} 
                                                onChange={e => setSubject(e.target.value)} 
                                                placeholder="Subject Line..." 
                                                className="w-full bg-transparent text-sm font-bold text-gray-500 focus:outline-none placeholder:text-gray-800"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{selectedMessage?.senderName}</h2>
                                            <p className="text-sm text-gray-500 font-bold mt-2">{selectedMessage?.senderEmail}</p>
                                            <div className="flex items-center gap-3 mt-4">
                                                <span className="text-[10px] text-red-500 font-black uppercase tracking-widest">RE: {selectedMessage?.subject}</span>
                                                <div className="h-px w-8 bg-white/10"></div>
                                                <span className="text-[9px] text-gray-600 font-mono">ID: {selectedMessage?.id.substring(0,8)}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => { setSelectedMessage(null); setIsNewCompose(false); }} className="text-gray-600 hover:text-white transition-colors">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Content & Reply */}
                            <div className="flex-grow overflow-y-auto p-8 space-y-12 scrollbar-hide">
                                {selectedMessage && (
                                    <div className="bg-white/5 p-8 rounded-3xl border border-white/5 shadow-inner">
                                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">{selectedMessage.content}</p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-2">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Studio Response Payload</h4>
                                            <div className="h-1 w-1 rounded-full bg-red-600 animate-pulse"></div>
                                        </div>
                                        <button 
                                            onClick={handleDraftWithAI}
                                            disabled={isDrafting}
                                            className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2 uppercase tracking-widest bg-indigo-600/10 px-3 py-1.5 rounded-lg border border-indigo-500/20"
                                        >
                                            <span className="text-sm">✨</span>
                                            {isDrafting ? 'Synthesizing...' : 'Draft with Gemini'}
                                        </button>
                                    </div>
                                    <textarea 
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        placeholder="Compose studio correspondence..."
                                        className="w-full bg-black/40 border border-white/10 rounded-3xl p-8 text-gray-200 min-h-[300px] focus:border-red-600 transition-all focus:outline-none leading-relaxed font-medium"
                                    />
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-8 border-t border-white/5 bg-white/[0.01] flex flex-col sm:flex-row justify-between items-center gap-6">
                                <div className="flex flex-col gap-2">
                                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">SMTP_RELAY: Resend // VERCEL_INFRASTRUCTURE</p>
                                    <p className="text-[8px] text-gray-800 font-black uppercase tracking-widest">Authorized Identity: {authorizedIdentity}</p>
                                    {isSignatureActive && (
                                        <div className="flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-green-500"></span>
                                            <p className="text-[8px] text-green-700 font-black uppercase tracking-widest">Global Signature Applied</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => { setSelectedMessage(null); setIsNewCompose(false); }} className="px-6 py-4 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Discard Draft</button>
                                    <button 
                                        onClick={handleSend}
                                        disabled={isSending || !replyText || !recipient}
                                        className="bg-red-600 hover:bg-red-700 text-white font-black px-12 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-2xl shadow-red-900/40 transition-all active:scale-95 disabled:opacity-20 flex items-center gap-3"
                                    >
                                        {isSending ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                Transmitting...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                                Dispatch Message
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudioMail;
