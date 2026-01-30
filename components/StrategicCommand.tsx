
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface AcquisitionTarget {
    title: string;
    director: string;
    award: string;
    marketValue: string;
    pitchHook: string;
    status: 'High Potential' | 'Secure Now';
}

const StrategicCommand: React.FC = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [targets, setTargets] = useState<AcquisitionTarget[]>([]);
    const [selectedTarget, setSelectedTarget] = useState<AcquisitionTarget | null>(null);
    const [dispatchStatus, setDispatchStatus] = useState<'idle' | 'drafting' | 'ready'>('idle');
    const [draft, setDraft] = useState('');

    const runReconnaissance = async () => {
        setIsScanning(true);
        setTargets([]);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/scout-strategic-partners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            setTargets(data.targets || []);
        } catch (e) {
            alert("Strategic uplink failure.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleSynthesizeDispatch = async (target: AcquisitionTarget) => {
        setSelectedTarget(target);
        setDispatchStatus('drafting');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/generate-partnership-dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, target }),
            });
            const data = await res.json();
            setDraft(data.dispatch);
            setDispatchStatus('ready');
        } catch (e) {
            alert("Drafting failed.");
            setDispatchStatus('idle');
        }
    };

    return (
        <div className="space-y-10 pb-32 animate-[fadeIn_0.5s_ease-out]">
            {/* The Command Dashboard */}
            <div className="bg-[#050505] border border-red-600/20 p-10 md:p-14 rounded-[4rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-12 scale-150">
                    <h1 className="text-[15rem] font-black italic text-red-600">WIN</h1>
                </div>
                
                <div className="relative z-10 max-w-5xl space-y-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_#ef4444]"></div>
                            <p className="text-red-500 font-black uppercase tracking-[0.5em] text-[11px]">Strategic Command // Active Acquisition</p>
                        </div>
                        <h2 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter italic leading-none">Gain Ground.</h2>
                        <p className="text-2xl text-gray-500 font-medium leading-relaxed max-w-3xl">
                            Stop waiting for submissions. Scan recent festival winners and dispatch <span className="text-white">Elite Partnership Offers</span> that convert creators instantly.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            onClick={runReconnaissance}
                            disabled={isScanning}
                            className="bg-red-600 hover:bg-red-700 text-white font-black px-12 py-6 rounded-2xl uppercase tracking-widest text-sm shadow-2xl shadow-red-900/40 transition-all transform active:scale-95 disabled:opacity-20"
                        >
                            {isScanning ? 'Scanning Festivals...' : 'Scan High-Value Targets'}
                        </button>
                    </div>
                </div>
            </div>

            {isScanning && (
                <div className="py-20 flex flex-col items-center justify-center space-y-6">
                    <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-red-500 font-black uppercase tracking-widest text-xs animate-pulse">Gemini is parsing 2024/2025 award manifests...</p>
                </div>
            )}

            {targets.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-[fadeIn_0.8s_ease-out]">
                    <div className="space-y-6">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest italic border-l-4 border-red-600 pl-4">Target Matrix</h3>
                        <div className="grid gap-4">
                            {targets.map((t, i) => (
                                <div key={i} className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] hover:border-red-600/30 transition-all group cursor-pointer" onClick={() => handleSynthesizeDispatch(t)}>
                                    <div className="flex justify-between items-start mb-6">
                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{t.award}</span>
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${t.status === 'Secure Now' ? 'bg-red-600 text-white border-red-500' : 'bg-white/5 text-gray-500 border-white/10'}`}>{t.status.toUpperCase()}</span>
                                    </div>
                                    <h4 className="text-3xl font-black text-white uppercase tracking-tighter italic group-hover:text-red-500 transition-colors leading-none">{t.title}</h4>
                                    <p className="text-gray-500 text-xs font-bold uppercase mt-2">Director: {t.director}</p>
                                    <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
                                        <p className="text-[10px] text-gray-600 font-black uppercase">Yield Score: {t.marketValue}</p>
                                        <span className="text-red-500 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Prepare Dispatch →</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest italic border-l-4 border-indigo-600 pl-4">Dispatch Center</h3>
                        <div className="bg-[#0f0f0f] border border-white/10 p-10 rounded-[3rem] shadow-2xl h-full flex flex-col">
                            {dispatchStatus === 'idle' ? (
                                <div className="flex-grow flex flex-col items-center justify-center text-center opacity-20 space-y-4">
                                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    <p className="text-sm font-black uppercase tracking-[0.5em]">Awaiting Target Selection</p>
                                </div>
                            ) : dispatchStatus === 'drafting' ? (
                                <div className="flex-grow flex flex-col items-center justify-center space-y-6">
                                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-indigo-400 font-black uppercase tracking-widest text-[10px]">Synthesizing High-Stakes Narrative...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full animate-[fadeIn_0.5s_ease-out]">
                                    <div className="mb-8">
                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Proposed Dispatch for {selectedTarget?.director}</p>
                                        <p className="text-xs text-gray-500 font-bold italic">Strategy: The "Distribution Afterlife" Narrative</p>
                                    </div>
                                    <textarea 
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        className="flex-grow bg-black/40 border border-white/5 rounded-2xl p-6 text-gray-300 font-serif text-lg leading-relaxed focus:border-red-600 transition-all outline-none resize-none"
                                    />
                                    <div className="mt-8 flex gap-4">
                                        <button onClick={() => { navigator.clipboard.writeText(draft); alert('Dispatch copied.'); }} className="flex-1 bg-white text-black font-black py-4 rounded-xl uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all">Copy to Clipboard</button>
                                        <button onClick={() => { window.location.href = `mailto:?subject=Strategic Distribution Partnership: ${selectedTarget?.title}&body=${encodeURIComponent(draft)}`; }} className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Execute Dispatch</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrategicCommand;
