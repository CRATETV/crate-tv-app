
import React, { useState, useEffect } from 'react';
import { Movie, AnalyticsData, Category, GrantApplication } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';
import PartnershipFinder from './PartnershipFinder';
import GrantWriter from './GrantWriter';

interface DiscoveryEngineProps {
    analytics: AnalyticsData | null;
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    onUpdateCategories: (newCats: Record<string, Category>) => Promise<void>;
}

const GrantLedger: React.FC = () => {
    const [grants, setGrants] = useState<GrantApplication[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newGrant, setNewGrant] = useState<Partial<GrantApplication>>({ organization: '', amount: 0, status: 'pending', notes: '' });

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const unsub = db.collection('grant_ledger').orderBy('dateApplied', 'desc').onSnapshot(snap => {
            const fetched: GrantApplication[] = [];
            snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as GrantApplication));
            setGrants(fetched);
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const db = getDbInstance();
        if (!db || !newGrant.organization) return;
        await db.collection('grant_ledger').add({
            ...newGrant,
            dateApplied: new Date(),
            amount: Number(newGrant.amount) * 100 // store in cents
        });
        setNewGrant({ organization: '', amount: 0, status: 'pending', notes: '' });
        setIsAdding(false);
    };

    const updateStatus = async (id: string, status: GrantApplication['status']) => {
        const db = getDbInstance();
        if (db) await db.collection('grant_ledger').doc(id).update({ status });
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex justify-between items-end border-b border-white/5 pb-6">
                <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Grant Ledger</h3>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Audit trail for daily growth applications</p>
                </div>
                <button onClick={() => setIsAdding(!isAdding)} className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all">
                    {isAdding ? 'Cancel' : '+ Log New Application'}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-white/5 border border-white/10 p-8 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeIn_0.3s_ease-out]">
                    <div className="space-y-4">
                        <input type="text" placeholder="Organization" value={newGrant.organization} onChange={e => setNewGrant({...newGrant, organization: e.target.value})} className="form-input bg-black/40 border-white/10" required />
                        <input type="number" placeholder="Target Amount ($)" value={newGrant.amount} onChange={e => setNewGrant({...newGrant, amount: parseFloat(e.target.value)})} className="form-input bg-black/40 border-white/10" />
                    </div>
                    <div className="space-y-4">
                         <textarea placeholder="Strategy/Notes..." value={newGrant.notes} onChange={e => setNewGrant({...newGrant, notes: e.target.value})} className="form-input bg-black/40 border-white/10 h-full" />
                    </div>
                    <button type="submit" className="md:col-span-2 bg-white text-black font-black py-4 rounded-xl uppercase text-xs tracking-widest shadow-2xl">Commit to Ledger</button>
                </form>
            )}

            <div className="grid grid-cols-1 gap-4">
                {grants.map(g => (
                    <div key={g.id} className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 group hover:bg-white/[0.04] transition-all">
                        <div className="flex-grow">
                            <div className="flex items-center gap-3">
                                <h4 className="text-lg font-black text-white uppercase tracking-tight">{g.organization}</h4>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${g.status === 'awarded' ? 'bg-green-500 text-black' : g.status === 'declined' ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-500'}`}>
                                    {g.status}
                                </span>
                            </div>
                            <p className="text-gray-400 text-xs mt-1 font-medium">{g.notes || 'No supplemental notes.'}</p>
                        </div>
                        <div className="flex items-center gap-6 flex-shrink-0">
                            <div className="text-right">
                                <p className="text-sm font-black text-white">${(g.amount / 100).toLocaleString()}</p>
                                <p className="text-[8px] text-gray-700 font-bold uppercase tracking-widest">Requested</p>
                            </div>
                            <div className="flex gap-2">
                                {g.status === 'pending' && (
                                    <>
                                        <button onClick={() => updateStatus(g.id, 'submitted')} className="p-2 hover:bg-blue-600 rounded-lg transition-colors border border-white/10">✔️</button>
                                        <button onClick={() => updateStatus(g.id, 'awarded')} className="p-2 hover:bg-green-600 rounded-lg transition-colors border border-white/10">💰</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DiscoveryEngine: React.FC<DiscoveryEngineProps> = ({ analytics, movies, categories, onUpdateCategories }) => {
    const [activeSection, setActiveSection] = useState<'insights' | 'partners' | 'grantwriter' | 'ledger'>('insights');

    return (
        <div className="space-y-12 pb-20 animate-[fadeIn_0.4s_ease-out]">
            <div className="flex flex-wrap gap-4 p-1 bg-white/5 rounded-2xl border border-white/5 w-max mx-auto">
                <button onClick={() => setActiveSection('insights')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'insights' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Platform Insights</button>
                <button onClick={() => setActiveSection('partners')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'partners' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Grant Research</button>
                <button onClick={() => setActiveSection('grantwriter')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'grantwriter' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>AI Assistant</button>
                <button onClick={() => setActiveSection('ledger')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'ledger' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Grant Ledger</button>
            </div>

            {activeSection === 'ledger' ? <GrantLedger /> : (
                <div className="animate-[fadeIn_0.5s_ease-out]">
                    {activeSection === 'insights' && (
                         <div className="bg-gradient-to-br from-indigo-900/40 via-gray-900 to-black p-10 rounded-[3rem] border border-indigo-500/20 shadow-2xl text-center">
                            <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic mb-4">Discovery Engine</h2>
                            <p className="text-xl text-gray-400 font-medium leading-relaxed mb-10 max-w-2xl mx-auto">Analyzing real-time audience sentiment and re-watch coefficients to predict global virality trends.</p>
                            <button className="bg-white text-black font-black px-12 py-5 rounded-2xl uppercase tracking-widest text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all">Scan Telemetry Records</button>
                         </div>
                    )}
                    {activeSection === 'partners' && <PartnershipFinder />}
                    {activeSection === 'grantwriter' && <GrantWriter />}
                </div>
            )}
        </div>
    );
};

export default DiscoveryEngine;
