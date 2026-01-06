import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const FundStrategist: React.FC = () => {
    const [fundName, setFundName] = useState('Independence Public Media Foundation (Philly)');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [strategy, setStrategy] = useState('');
    const [error, setError] = useState('');

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fundName.trim()) return;

        setIsAnalyzing(true);
        setError('');
        setStrategy('');

        try {
            const res = await fetch('/api/generate-fund-strategy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password: sessionStorage.getItem('adminPassword'),
                    fundName: fundName.trim()
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Strategy synthesis failed.');
            setStrategy(data.strategy);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Institutional core unreachable.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-amber-500/20 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none rotate-12">
                    <svg className="w-48 h-48 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                
                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_orange]"></span>
                        <p className="text-amber-500 font-black uppercase tracking-[0.6em] text-[10px]">Crate Institutional Hub</p>
                    </div>
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic mb-4">Fund Strategist</h2>
                    <p className="text-xl text-gray-400 font-medium leading-relaxed mb-10">Pitch Crate TV as the "Infrastructure Partner" for major funds. Secure capital to distribute to your filmmakers.</p>
                    
                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div className="flex gap-4">
                            <select 
                                value={fundName} 
                                onChange={e => setFundName(e.target.value)}
                                className="form-input !bg-black/40 border-white/10 text-lg flex-grow"
                            >
                                <option value="Epic Games (Epic MegaGrants)">Epic Games (Epic MegaGrants)</option>
                                <option value="Independence Public Media Foundation (Philly)">Independence Public Media (IPMF)</option>
                                <option value="Philadelphia Cultural Fund">Philadelphia Cultural Fund (PCF)</option>
                                <option value="Greater Philadelphia Film Office (Tech/Arts)">Greater Philly Film Office (GPFO)</option>
                                <option value="Pew Center for Arts & Heritage">Pew Center for Arts & Heritage</option>
                                <option value="Tribeca Festival / Tribeca Studios">Tribeca (Studios/Festival)</option>
                                <option value="Sundance Institute / Documentary Fund">Sundance Institute</option>
                                <option value="National Endowment for the Arts (Media Projects)">National Endowment for the Arts</option>
                                <option value="Knight Foundation (Media Innovation)">Knight Foundation</option>
                            </select>
                            <button type="submit" disabled={isAnalyzing} className="bg-amber-500 text-black font-black px-10 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl transition-all hover:bg-white disabled:opacity-30">
                                {isAnalyzing ? 'Mapping Priorities...' : 'Synthesize Pitch'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {isAnalyzing && (
                <div className="py-24 flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-amber-500/20 rounded-full"></div>
                        <div className="absolute inset-0 w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-amber-500 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Researching 2025 Institutional Guidelines...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-600/10 border border-red-500/20 p-8 rounded-3xl text-center">
                    <p className="text-red-500 font-black uppercase tracking-widest text-sm">{error}</p>
                </div>
            )}

            {strategy && (
                <div className="bg-white/5 border border-white/10 p-12 rounded-[3.5rem] shadow-2xl space-y-8 animate-[fadeIn_0.8s_ease-out]">
                    <div className="flex justify-between items-center border-b border-white/5 pb-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Hub Partnership Proposal</h3>
                        <button onClick={() => { navigator.clipboard.writeText(strategy); alert('Strategy Copied.'); }} className="text-amber-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Copy to Clipboard</button>
                    </div>
                    <div className="prose prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap font-serif text-lg text-gray-300 leading-relaxed bg-black/40 p-10 rounded-3xl border border-white/5 shadow-inner">
                            {strategy}
                        </pre>
                    </div>
                    <div className="bg-amber-500/5 p-6 rounded-2xl border border-amber-500/10">
                        <p className="text-xs text-amber-500 font-bold leading-relaxed uppercase tracking-tighter">
                            Strategic Note: This pitch frames Crate TV as a "Fiscal Delegate"—a way for ${fundName} to achieve massive cultural impact with zero technical overhead.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FundStrategist;