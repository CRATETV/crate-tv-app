import React, { useState, useEffect } from 'react';
import { getDbInstance } from '../services/firebaseClient';
import { ActorProfile } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface Inquiry {
    id: string;
    actorName: string;
    senderName: string;
    senderEmail: string;
    message: string;
    timestamp: any;
    status: 'unread' | 'read' | 'archived';
}

const TalentInquiriesTab: React.FC = () => {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [actors, setActors] = useState<ActorProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState<'inbox' | 'directory'>('inbox');
    const [processingActor, setProcessingActor] = useState<string | null>(null);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        // Listener 1: Inquiries
        const unsubInquiries = db.collection('talent_inquiries')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                const fetched: Inquiry[] = [];
                snapshot.forEach(doc => {
                    fetched.push({ id: doc.id, ...doc.data() } as Inquiry);
                });
                setInquiries(fetched);
                if (activeSubTab === 'inbox') setIsLoading(false);
            });

        // Listener 2: Directory Actors
        const unsubActors = db.collection('actor_profiles')
            .onSnapshot(snapshot => {
                const fetched: ActorProfile[] = [];
                snapshot.forEach(doc => {
                    fetched.push(doc.data() as ActorProfile);
                });
                setActors(fetched.sort((a,b) => a.name.localeCompare(b.name)));
                if (activeSubTab === 'directory') setIsLoading(false);
            });

        return () => { unsubInquiries(); unsubActors(); };
    }, [activeSubTab]);

    const markAsRead = async (id: string) => {
        const db = getDbInstance();
        if (db) await db.collection('talent_inquiries').doc(id).update({ status: 'read' });
    };

    const archiveInquiry = async (id: string) => {
        if (!window.confirm("Archive this inquiry record?")) return;
        const db = getDbInstance();
        if (db) await db.collection('talent_inquiries').doc(id).update({ status: 'archived' });
    };

    const toggleReachability = async (slug: string, currentStatus: boolean) => {
        setProcessingActor(slug);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/toggle-actor-contactable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, status: !currentStatus, password }),
            });
            if (!res.ok) throw new Error("Sync failed");
        } catch (e) {
            alert("Error updating actor status.");
        } finally {
            setProcessingActor(null);
        }
    };

    if (isLoading) return <div className="h-64 flex items-center justify-center"><LoadingSpinner /></div>;

    const activeInquiries = inquiries.filter(i => i.status !== 'archived');

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Talent Logistics</h2>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Communications & Network Integrity</p>
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    <button 
                        onClick={() => setActiveSubTab('inbox')}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'inbox' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Inquiry Inbox
                    </button>
                    <button 
                        onClick={() => setActiveSubTab('directory')}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'directory' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Reachability Map
                    </button>
                </div>
            </div>

            {activeSubTab === 'inbox' ? (
                <div className="space-y-6">
                    {activeInquiries.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                            <p className="text-gray-600 font-bold uppercase tracking-[0.4em]">No Incoming Inquiries</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {activeInquiries.map(inquiry => (
                                <div key={inquiry.id} className={`p-6 rounded-2xl border transition-all ${inquiry.status === 'unread' ? 'bg-red-600/5 border-red-500/30' : 'bg-white/[0.02] border-white/5'}`}>
                                    <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-black text-white uppercase tracking-tight">{inquiry.senderName}</h3>
                                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">({inquiry.senderEmail})</span>
                                            </div>
                                            <p className="text-xs text-red-500 font-black uppercase mt-1 tracking-widest">Target: {inquiry.actorName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                                                {inquiry.timestamp?.seconds ? new Date(inquiry.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 mb-4">
                                        <p className="text-sm text-gray-300 italic leading-relaxed">"{inquiry.message}"</p>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        {inquiry.status === 'unread' && (
                                            <button onClick={() => markAsRead(inquiry.id)} className="bg-white/5 hover:bg-white/10 text-white font-black py-2 px-4 rounded-lg text-[9px] uppercase tracking-widest transition-all">Mark Read</button>
                                        )}
                                        <button onClick={() => archiveInquiry(inquiry.id)} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black py-2 px-4 rounded-lg text-[9px] uppercase tracking-widest transition-all">Archive Record</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-blue-600/5 border border-blue-500/20 p-6 rounded-2xl mb-8">
                        <p className="text-sm text-blue-400 leading-relaxed font-medium">Use this map to disable the "Contact" button for actors whose direct connection details are currently unknown or unverified. This protects the platform's professional integrity.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {actors.map(actor => (
                            <div key={actor.slug} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
                                <div className="flex items-center gap-4">
                                    <img src={actor.photo} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="" />
                                    <div>
                                        <p className="text-sm font-bold text-white truncate max-w-[140px] uppercase tracking-tight">{actor.name}</p>
                                        <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${actor.isContactable !== false ? 'text-green-500' : 'text-gray-600'}`}>
                                            {actor.isContactable !== false ? 'REACHABLE' : 'LOCKED'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => toggleReachability(actor.slug, actor.isContactable !== false)}
                                    disabled={processingActor === actor.slug}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${actor.isContactable !== false ? 'bg-red-600/10 border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white' : 'bg-green-600/10 border-green-500/20 text-green-500 hover:bg-green-600 hover:text-white'}`}
                                >
                                    {processingActor === actor.slug ? '...' : actor.isContactable !== false ? 'Disable' : 'Enable'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TalentInquiriesTab;