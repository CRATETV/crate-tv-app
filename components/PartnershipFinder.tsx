import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface FundingPartner {
    organization: string;
    program: string;
    url: string;
    fit: string;
    subsidy_type: string;
}

const PartnershipFinder: React.FC = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [partners, setPartners] = useState<FundingPartner[]>([]);
    const [error, setError] = useState('');

    const scanOpportunities = async (type: 'bootstrapper' | 'grants' | 'philly') => {
        setIsAnalyzing(true);
        setError('');
        setPartners([]);

        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/find-funding-partners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, type }),
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Intelligence scan failed.');
            setPartners(data.partners || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Uplink to intelligence core failed.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-12 pb-20 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-gradient-to-br from-green-900/40 via-gray-900 to-black p-10 rounded-[3rem] border border-green-500/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <svg className="w-48 h-48 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                
                <div className="relative z-10 max-w-3xl">
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic mb-4">Funding Intelligence</h2>
                    <p className="text-xl text-gray-400 font-medium leading-relaxed mb-10">Identifying technology credits and arts grants that DO NOT require VC backing. Strategic path for independent builders.</p>
                    
                    <div className="flex flex-wrap gap-4">
                        <button 
                            onClick={() => scanOpportunities('bootstrapper')} 
                            disabled={isAnalyzing}
                            className="bg-white text-black font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-xl hover:bg-green-500 hover:text-white transition-all active:scale-95 disabled:opacity-30"
                        >
                            Scan Accessible Credits (No VC)
                        </button>
                        <button 
                            onClick={() => scanOpportunities('grants')} 
                            disabled={isAnalyzing}
                            className="bg-white/5 border border-white/10 text-white font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all active:scale-95 disabled:opacity-30"
                        >
                            Arts & Media Grants
                        </button>
                        <button 
                            onClick={() => scanOpportunities('philly')} 
                            disabled={isAnalyzing}
                            className="bg-white/5 border border-white/10 text-white font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all active:scale-95 disabled:opacity-30"
                        >
                            Philly Regional Funding
                        </button>
                    </div>
                </div>
            </div>

            {isAnalyzing && (
                <div className="py-20 flex flex-col items-center justify-center space-y-6">
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-green-500 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Gemini 3 Pro is Scanning Bootstrapper-Friendly Programs...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-600/10 border border-red-500/20 p-6 rounded-2xl text-center">
                    <p className="text-red-500 font-bold uppercase tracking-widest text-sm">{error}</p>
                </div>
            )}

            {partners.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {partners.map((p, i) => (
                        <div key={i} className="bg-[#0f0f0f] border border-green-900/30 p-8 rounded-[2.5rem] flex flex-col justify-between group hover:border-green-500/50 transition-all">
                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-green-700">{p.subsidy_type}</span>
                                    <span className="text-[8px] font-black px-2 py-0.5 rounded border border-green-900 text-green-900 uppercase">Indie Eligible</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white leading-none">{p.organization}</h3>
                                    <p className="text-green-500 text-xs font-bold mt-2 uppercase tracking-widest">{p.program}</p>
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed font-medium">{p.fit}</p>
                            </div>
                            <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
                                <a 
                                    href={p.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="bg-green-600 text-black font-black py-3 px-8 rounded-xl uppercase text-[9px] tracking-widest hover:bg-green-500 transition-all"
                                >
                                    Official Portal
                                </a>
                                <span className="text-[8px] font-black text-gray-800 uppercase tracking-widest">Verified 2025</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {!isAnalyzing && partners.length === 0 && !error && (
                <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30">
                    <p className="text-gray-500 font-black uppercase tracking-[0.5em]">Awaiting Intelligence Query</p>
                </div>
            )}
        </div>
    );
};

export default PartnershipFinder;