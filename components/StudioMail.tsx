
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnalyticsData, CrateFestConfig, Movie, StudioMessage } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';

interface StudioMailProps {
    analytics: AnalyticsData | null;
    festivalConfig: CrateFestConfig | null;
    movies: Record<string, Movie>;
}

const StudioMail: React.FC<StudioMailProps> = ({ analytics, festivalConfig, movies }) => {
    const [messages, setMessages] = useState<StudioMessage[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<StudioMessage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDrafting, setIsDrafting] = useState(false);
    const [isSending, setIsSending] = useState(false);
    
    // Composer State
    const [replyText, setReplyText] = useState('');
    const [recipient, setRecipient] = useState('');
    const [subject, setSubject] = useState('');
    const [isNewCompose, setIsNewCompose] = useState(false);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        // Aggregate incoming messages from 3 sources
        const fetchMessages = async () => {
            setIsLoading(true);
            try {
                const [contacts, inquiries, pipeline] = await Promise.all([
                    db.collection('security_events').where('type', '==', 'CONTACT_SENT').orderBy('timestamp', 'desc').limit(20).get(),
                    db.collection('talent_inquiries').orderBy('timestamp', 'desc').limit(20).get(),
                    db.collection('movie_pipeline').orderBy('submissionDate', 'desc').limit(20).get()
                ]);

                const allMsgs: StudioMessage[] = [];

                contacts.forEach(doc => {
                    const data = doc.data();
                    allMsgs.push({
                        id: doc.id,
                        senderName: data.details?.name || 'User',
                        senderEmail: data.details?.email || 'unknown@cratetv.net',
                        subject: 'Contact Form Transmission',
                        content: 'User submitted a contact request. Check system logs or primary inbox.',
                        timestamp: data.timestamp,
                        type: 'CONTACT',
                        status: 'OPEN'
                    });
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
                        status: data.status?.toUpperCase() || 'OPEN'
                    });
                });

                pipeline.forEach(doc => {
                    const data = doc.data();
                    allMsgs.push({
                        id: doc.id,
                        senderName: data.director,
                        senderEmail: data.submitterEmail,
                        subject: `Submission: ${data.title}`,
                        content: data.synopsis,
                        timestamp: data.submissionDate,
                        type: 'SUBMISSION',
                        status: data.status?.toUpperCase() || 'OPEN'
                    });
                });

                setMessages(allMsgs.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds));
            } catch (e) {
                console.error("Inbox aggregation failed", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMessages();
    }, []);

    const handleSelectMessage = (msg: StudioMessage) => {
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
                    htmlBody: `<div style="font-family: sans-serif; white-space: pre-wrap;">${replyText}</div>`
                }),
            });
            if (res.ok) {
                alert("Message Dispatched.");
                setReplyText('');
                if (isNewCompose) setIsNewCompose(false);
            }
        } catch (e) {
            alert("Transmission failed.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-280px)] min-h-[600px] animate-[fadeIn_0.5s_ease-out]">
            <div className="flex-grow flex gap-6 overflow-hidden">
                
                {/* Inbox Sidebar */}
                <div className="w-96 flex flex-col bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Inbound Feed</h3>
                        <button 
                            onClick={() => { setIsNewCompose(true); setSelectedMessage(null); setRecipient(''); setSubject(''); setReplyText(''); }}
                            className="p-2 hover:bg-white/5 rounded-full text-red-500 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto custom-scrollbar">
                        {isLoading ? <div className="p-10 text-center"><LoadingSpinner /></div> : (
                            messages.map(msg => (
                                <button 
                                    key={msg.id}
                                    onClick={() => handleSelectMessage(msg)}
                                    className={`w-full text-left p-6 border-b border-white/5 transition-all hover:bg-white/[0.02] group ${selectedMessage?.id === msg.id ? 'bg-red-600/5 !border-red-600/30' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${msg.type === 'SUBMISSION' ? 'text-blue-500 border-blue-500/30' : 'text-purple-500 border-purple-500/30'}`}>{msg.type}</span>
                                        <span className="text-[9px] text-gray-700 font-mono">{msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleDateString() : '---'}</span>
                                    </div>
                                    <h4 className={`text-sm font-black uppercase truncate group-hover:text-red-500 transition-colors ${selectedMessage?.id === msg.id ? 'text-red-500' : 'text-white'}`}>{msg.senderName}</h4>
                                    <p className="text-xs text-gray-500 truncate mt-1">{msg.subject}</p>
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
                                        <input 
                                            value={recipient} 
                                            onChange={e => setRecipient(e.target.value)} 
                                            placeholder="To: (email@address.com)" 
                                            className="w-full bg-transparent text-xl font-black uppercase tracking-tighter text-white focus:outline-none placeholder:text-gray-800"
                                        />
                                        <input 
                                            value={subject} 
                                            onChange={e => setSubject(e.target.value)} 
                                            placeholder="Subject..." 
                                            className="w-full bg-transparent text-sm font-bold text-gray-500 focus:outline-none placeholder:text-gray-800"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{selectedMessage?.senderName}</h2>
                                            <p className="text-sm text-gray-500 font-bold mt-2">{selectedMessage?.senderEmail}</p>
                                            <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-4">RE: {selectedMessage?.subject}</p>
                                        </div>
                                        <span className="text-[10px] font-mono text-gray-700 uppercase">Message-ID: {selectedMessage?.id}</span>
                                    </div>
                                )}
                            </div>

                            {/* Content & Reply */}
                            <div className="flex-grow overflow-y-auto p-8 space-y-12">
                                {selectedMessage && (
                                    <div className="bg-white/5 p-8 rounded-3xl border border-white/5">
                                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedMessage.content}</p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Studio Response Payload</h4>
                                        <button 
                                            onClick={handleDraftWithAI}
                                            disabled={isDrafting}
                                            className="text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2"
                                        >
                                            <span className="bg-indigo-600/20 p-1 rounded">✨</span>
                                            {isDrafting ? 'Synthesizing...' : 'Draft with Gemini'}
                                        </button>
                                    </div>
                                    <textarea 
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        placeholder="Compose studio correspondence..."
                                        className="w-full bg-black/40 border border-white/10 rounded-3xl p-8 text-gray-200 min-h-[300px] focus:border-red-600 transition-all focus:outline-none leading-relaxed"
                                    />
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-8 border-t border-white/5 bg-white/[0.01] flex justify-between items-center">
                                <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">SMTP_RELAY: Resend // VERCEL_INFRASTRUCTURE</p>
                                <div className="flex gap-4">
                                    <button onClick={() => { setSelectedMessage(null); setIsNewCompose(false); }} className="px-6 py-4 text-gray-500 font-black uppercase text-[10px] tracking-widest">Discard</button>
                                    <button 
                                        onClick={handleSend}
                                        disabled={isSending || !replyText || !recipient}
                                        className="bg-red-600 hover:bg-red-700 text-white font-black px-12 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-2xl transition-all active:scale-95 disabled:opacity-20"
                                    >
                                        {isSending ? 'Transmitting...' : 'Dispatch Message'}
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
