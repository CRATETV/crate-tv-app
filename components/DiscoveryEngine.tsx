
import React, { useState, useEffect } from 'react';
import { Movie, AnalyticsData, Category, GrantApplication } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';
import PartnershipFinder from './PartnershipFinder';
import GrantWriter from './GrantWriter';
import LegalStrategist from './LegalStrategist';
import RightsAuditor from './RightsAuditor';
import FundStrategist from './FundStrategist';

interface DiscoveryEngineProps {
    analytics: AnalyticsData | null;
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    onUpdateCategories: (newCats: Record<string, Category>) => Promise<void>;
}

const GrantLedger: React.FC = () => {
    const [grants, setGrants] = useState<GrantApplication[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Grant Ledger</h3>
            <div className="grid grid-cols-1 gap-4">
                {grants.length > 0 ? grants.map(g => (
                    <div key={g.id} className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex justify-between items-center group">
                        <div>
                            <div className="flex items-center gap-3">
                                <h4 className="text-lg font-black text-white uppercase">{g.organization}</h4>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${g.status === 'awarded' ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-500'}`}>{g.status}</span>
                            </div>
                            <p className="text-gray-400 text-xs mt-1 italic">{g.notes}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-black text-white">${(g.amount / 100).toLocaleString()}</p>
                            <p className="text-[8px] text-gray-700 font-bold uppercase">Allocated</p>
                        </div>
                    </div>
                )) : (
                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                         <p className="text-gray-500 font-black uppercase tracking-widest">No active grant records</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const DiscoveryEngine: React.FC<DiscoveryEngineProps> = ({ analytics, movies, categories, onUpdateCategories }) => {
    const [activeSection, setActiveSection] = useState<'auditor' | 'strategist' | 'fund' | 'partners' | 'grantwriter' | 'ledger'>('auditor');

    return (
        <div className="space-y-12 pb-20 animate-[fadeIn_0.4s_ease-out]">
            <div className="flex flex-wrap gap-4 p-1.5 bg-black border border-white/5 rounded-2xl w-max mx-auto shadow-2xl">
                <button onClick={() => setActiveSection('auditor')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'auditor' ? 'bg-red-600 text-white' : 'text-gray-600 hover:text-white'}`}>Rights Auditor</button>
                <button onClick={() => setActiveSection('fund')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'fund' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Fund Strategist</button>
                <button onClick={() => setActiveSection('strategist')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'strategist' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>Legal Strategist</button>
                <button onClick={() => setActiveSection('partners')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'partners' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Grant Research</button>
                <button onClick={() => setActiveSection('grantwriter')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'grantwriter' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Grant Architect</button>
                <button onClick={() => setActiveSection('ledger')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'ledger' ? 'bg-gray-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Grant Ledger</button>
            </div>

            <div className="animate-[fadeIn_0.5s_ease-out]">
                {activeSection === 'auditor' && <RightsAuditor />}
                {activeSection === 'fund' && <FundStrategist />}
                {activeSection === 'strategist' && <LegalStrategist />}
                {activeSection === 'partners' && <PartnershipFinder />}
                {activeSection === 'grantwriter' && <GrantWriter />}
                {activeSection === 'ledger' && <GrantLedger />}
            </div>
        </div>
    );
};

export default DiscoveryEngine;
