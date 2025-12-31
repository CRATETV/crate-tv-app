import React, { useState, useEffect } from 'react';
import { getDbInstance } from '../services/firebaseClient';
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
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const unsubscribe = db.collection('talent_inquiries')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                const fetched: Inquiry[] = [];
                snapshot.forEach(doc => {
                    fetched.push({ id: doc.id, ...doc.data() } as Inquiry);
                });
                setInquiries(fetched);
                setIsLoading(false);
            });

        return () => unsubscribe();
    }, []);

    const markAsRead = async (id: string) => {
        const db = getDbInstance();
        if (db) await db.collection('talent_inquiries').doc(id).update({ status: 'read' });
    };

    const archiveInquiry = async (id: string) => {
        if (!window.confirm("Archive this inquiry record?")) return;
        const db = getDbInstance();
        if (db) await db.collection('talent_inquiries').doc(id).update({ status: 'archived' });
    };

    if (isLoading) return <div className="h-64 flex items-center justify-center"><LoadingSpinner /></div>;

    const activeInquiries = inquiries.filter(i => i.status !== 'archived');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Professional Inquiries</h2>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{activeInquiries.length} Active Records</p>
            </div>

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
    );
};

export default TalentInquiriesTab;