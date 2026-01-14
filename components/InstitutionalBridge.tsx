
import React, { useState, useEffect } from 'react';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';

interface PartnerNode {
    id: string;
    name: string;
    status: 'ACTIVE' | 'PENDING' | 'EXPIRED';
    memberId?: string;
    nextRenewal?: any;
    contactName?: string;
    contactEmail?: string;
    strategicGoal?: string;
}

const InstitutionalBridge: React.FC = () => {
    const [partners, setPartners] = useState<PartnerNode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [newPartner, setNewPartner] = useState<Partial<PartnerNode>>({
        name: 'PhillyCAM',
        status: 'ACTIVE',
        strategicGoal: 'Establish local-to-global distribution pipeline and co-apply for IPMF grant.'
    });

    const fetchPartners = async () => {
        const db = getDbInstance();
        if (!db) return;
        const snap = await db.collection('institutional_partners').get();
        const fetched: PartnerNode[] = [];
        snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as PartnerNode));
        setPartners(fetched);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    const handleAdd = async () => {
        setIsSaving(true);
        const db = getDbInstance();
        if (db) {
            await db.collection('institutional_partners').add(newPartner);
            setShowAdd(false);
            fetchPartners();
        }
        setIsSaving(false);
    };

    const deletePartner = async (id: string) => {
        if (!window.confirm("Sever bridge with this institution?")) return;
        const db = getDbInstance();
        if (db) {
            await db.collection('institutional_partners').doc(id).delete();
            fetchPartners();
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
                <div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Institutional Bridge</h2>
                    <p className="text-gray-500 text-sm mt-1 uppercase font-bold tracking-widest italic">Managing regional non-profit and academic nodes.</p>
                </div>
                <button 
                    onClick={() => setShowAdd(true)}
                    className="bg-white text-black font-black px-8 py-3 rounded-2xl uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-600 hover:text-white transition-all"
                >
                    + Register Partner Node
                </button>
            </div>

            {showAdd && (
                <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[3rem] space-y-6 shadow-2xl animate-[slideInUp_0.4s_ease-out]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="form-label">Institution Name</label>
                            <input value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} className="form-input bg-black/40" />
                        </div>
                        <div>
                            <label className="form-label">Membership Status</label>
                            <select value={newPartner.status} onChange={e => setNewPartner({...newPartner, status: e.target.value as any})} className="form-input bg-black/40">
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="PENDING">PENDING</option>
                                <option value="EXPIRED">EXPIRED</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="form-label">Strategic Objective</label>
                            <textarea value={newPartner.strategicGoal} onChange={e => setNewPartner({...newPartner, strategicGoal: e.target.value})} className="form-input bg-black/40" rows={2} />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setShowAdd(false)} className="px-6 py-3 text-gray-500 font-black uppercase text-[10px] tracking-widest">Cancel</button>
                        <button onClick={handleAdd} disabled={isSaving} className="bg-red-600 text-white font-black px-12 py-3 rounded-xl uppercase text-[10px] tracking-widest shadow-xl">{isSaving ? 'Establishing...' : 'Commit Node'}</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {partners.map(p => (
                    <div key={p.id} className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl flex flex-col justify-between group hover:border-indigo-500/30 transition-all relative overflow-hidden">
                        <div className="space-y-6">
                            <div className="flex justify-between items-start">
                                <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${p.status === 'ACTIVE' ? 'text-green-500' : 'text-red-500'}`}>{p.status} NODE</span>
                                <button onClick={() => deletePartner(p.id)} className="text-gray-800 hover:text-red-500 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                            <div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter italic text-white leading-none">{p.name}</h3>
                                <p className="text-indigo-500 text-[10px] font-black mt-2 uppercase tracking-widest">Strategic Partnership</p>
                            </div>
                            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl shadow-inner">
                                <p className="text-gray-400 text-sm leading-relaxed font-medium italic">"{p.strategicGoal}"</p>
                            </div>
                        </div>
                        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col gap-3">
                             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-700">
                                <span>Renewal Window</span>
                                <span className="text-white">January 2026</span>
                             </div>
                             <button 
                                onClick={() => { alert("Synthesis Mode: Generating Pitch Deck for " + p.name); }}
                                className="w-full bg-white text-black font-black py-4 rounded-xl uppercase tracking-widest text-[9px] shadow-xl hover:bg-indigo-600 hover:text-white transition-all"
                             >
                                Synthesize Institutional Pitch
                             </button>
                        </div>
                    </div>
                ))}
            </div>

            {partners.length === 0 && !showAdd && (
                <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[4rem] opacity-20">
                    <p className="text-gray-500 font-black uppercase tracking-[0.5em]">No active institutional nodes</p>
                </div>
            )}
        </div>
    );
};

export default InstitutionalBridge;
