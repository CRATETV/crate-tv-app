import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ScoutedFilm {
    title: string;
    director: string;
    year: string;
    license: string;
    synopsis: string;
    sourceUrl: string;
    sourceTitle: string;
    trustLevel: 'High' | 'Medium' | 'Unverified';
}

const CATEGORIES = [
    { id: 'open_master', label: 'Open Studio (Blender/4K)', icon: '💎' },
    { id: 'modern_short', label: 'Vimeo CC-BY (2023+)', icon: '🎬' },
    { id: 'experimental', label: 'Digital Avant-Garde', icon: '🧬' },
    { id: 'doc', label: 'Open Documentaries', icon: '📡' }
];

const SOURCE_PROFILES = [
    { name: 'Blender Studio', status: 'Platinum', type: 'CC-BY 4.0', desc: 'Modern CGI masterpieces. Highest fidelity available.' },
    { name: 'Vimeo CC', status: 'Gold', type: 'CC-BY / CC-NC', desc: 'Indie festival shorts intentionally released for reach.' },
    { name: 'OS Cinema', status: 'Silver', type: 'CC-BY-SA', desc: 'Experimental narratives and investigative docs.' }
];

const ArchiveScoutTab: React.FC = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [results, setResults] = useState<ScoutedFilm[]>([]);
    const [error, setError] = useState('');
    const [activeFilter, setActiveFilter] = useState('open_master');

    const handleScan = async (category: string) => {
        setIsScanning(true);
        setError('');
        setResults([]);
        setActiveFilter(category);
        
        const password = sessionStorage.getItem('adminPassword');

        try {
            const res = await fetch('/api/scout-archive-films', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, category }),
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Uplink failed.');
            setResults(data.films || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'System scanning failed.');
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="flex flex-col xl:flex-row gap-8 animate-[fadeIn_0.5s_ease-out] pb-24">
            
            {/* Left: Control & Intel */}
            <div className="w-full xl:w-[450px] space-y-8 flex-shrink-0">
                <div className="bg-cyan-600/10 border border-cyan-500/20 p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_cyan]"></span>
                            <p className="text-cyan-500 font-black uppercase tracking-[0.6em] text-[10px]">Asset Intelligence</p>
                        </div>
                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic mb-6 leading-none">Modern Scout.</h2>
                        <p className="text-gray-400 font-medium leading-relaxed mb-10 text-sm">Targeting high-fidelity cinema released <span className="text-white font-bold">2023–2025</span> under Creative Commons protocols.</p>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {CATEGORIES.map(cat => (
                                <button 
                                    key={cat.id}
                                    onClick={() => handleScan(cat.id)} 
                                    disabled={isScanning}
                                    className={`px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border flex items-center justify-between group ${activeFilter === cat.id && !isScanning ? 'bg-cyan-600 text-white border-cyan-500 shadow-xl' : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{cat.icon}</span>
                                        {cat.label}
                                    </div>
                                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-black border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-2">Verified Source Manifest</h3>
                    {SOURCE_PROFILES.map(source => (
                        <div key={source.name} className="space-y-2 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-black text-white uppercase tracking-tight">{source.name}</p>
                                <span className="text-[8px] font-black text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded">{source.status}</span>
                            </div>
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{source.type}</p>
                            <p className="text-[10px] text-gray-600 leading-relaxed italic">"{source.desc}"</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Results Display */}
            <div className="flex-grow min-w-0 space-y-10">
                {isScanning && (
                    <div className="h-full flex flex-col items-center justify-center space-y-8 animate-[pulse_2s_infinite] py-32 border-2 border-dashed border-white/5 rounded-[4rem]">
                        <div className="relative">
                            <div className="w-32 h-32 border-4 border-cyan-500/20 rounded-full"></div>
                            <div className="absolute inset-0 w-32 h-32 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-cyan-500 font-black uppercase tracking-[0.5em] text-xs">Synchronizing with Open Source Repositories...</p>
                            <p className="text-gray-600 text-[10px] font-bold uppercase">Grounding results with Gemini 3 Pro Strategic Search...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-600/10 border border-red-500/20 p-12 rounded-[3rem] text-center">
                        <p className="text-red-500 font-black uppercase tracking-widest text-sm">{error}</p>
                    </div>
                )}

                {results.length > 0 && !isScanning && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-[fadeIn_0.8s_ease-out]">
                        {results.map((f, i) => (
                            <div key={i} className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3.5rem] flex flex-col justify-between group hover:border-cyan-500/40 transition-all shadow-2xl relative overflow-hidden h-full">
                                <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                    <span className="text-[12rem] font-black italic tracking-tighter leading-none">{i+1}</span>
                                </div>
                                
                                <div className="space-y-8 relative z-10">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-cyan-500">{f.license}</span>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${f.trustLevel === 'High' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{f.trustLevel} Trust Level</span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black text-gray-200 bg-cyan-600/20 px-3 py-1 rounded-full border border-cyan-500/20 shadow-lg">{f.year}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-[0.9] group-hover:text-cyan-400 transition-colors">{f.title}</h3>
                                        <p className="text-gray-500 text-[11px] font-bold mt-3 uppercase tracking-[0.2em]">Studio: {f.director}</p>
                                    </div>
                                    <p className="text-gray-400 text-sm leading-relaxed font-medium italic border-l-2 border-white/5 pl-4">"{f.synopsis}"</p>
                                </div>

                                <div className="mt-12 pt-8 border-t border-white/5 flex flex-col gap-3 relative z-10">
                                    <a 
                                        href={f.sourceUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="bg-white text-black font-black py-5 rounded-2xl uppercase text-[11px] tracking-widest text-center shadow-xl hover:bg-cyan-600 hover:text-white transition-all transform active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        Review Master @ {f.sourceTitle}
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => { navigator.clipboard.writeText(f.title); alert('Title captured for Pipeline ingest.'); }}
                                            className="flex-1 bg-white/5 hover:bg-white/10 text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-widest py-3 rounded-xl border border-white/10 transition-all"
                                        >
                                            Capture UUID
                                        </button>
                                        <button 
                                            onClick={() => { 
                                                const manifest = JSON.stringify(f, null, 2);
                                                navigator.clipboard.writeText(manifest);
                                                alert('Full JSON Manifest captured for database ingestion.');
                                            }}
                                            className="flex-1 bg-white/5 hover:bg-white/10 text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-widest py-3 rounded-xl border border-white/10 transition-all"
                                        >
                                            Export JSON
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {!isScanning && results.length === 0 && !error && (
                    <div className="h-full py-40 text-center border-2 border-dashed border-white/5 rounded-[4rem] opacity-30 flex flex-col items-center justify-center gap-8">
                        <svg className="w-24 h-24 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        <p className="text-gray-500 font-black uppercase tracking-[0.8em] text-sm">Scanner Online // Identify Modern Source</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArchiveScoutTab;