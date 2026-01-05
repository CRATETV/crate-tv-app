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
}

const CATEGORIES = [
    { id: 'open_master', label: 'Open Masterpieces (4K)', icon: '💎' },
    { id: 'modern_short', label: 'Indie Shorts (2023+)', icon: '🎬' },
    { id: 'experimental', label: 'Modern Avant-Garde', icon: '🧬' },
    { id: 'doc', label: 'Contemporary Docs', icon: '📡' }
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
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out] pb-24">
            <div className="bg-cyan-600/10 border border-cyan-500/20 p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <svg className="w-48 h-48 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                
                <div className="relative z-10 max-w-3xl">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_cyan]"></span>
                        <p className="text-cyan-500 font-black uppercase tracking-[0.6em] text-[10px]">Crate Modern Scout</p>
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter italic mb-4">Contemporary Ingest</h2>
                    <p className="text-xl text-gray-400 font-medium leading-relaxed mb-10">Scan the web for high-fidelity cinema released in the last <span className="text-white font-bold">24 months</span> under Creative Commons (CC-BY) licenses. Modern assets for the elite catalog.</p>
                    
                    <div className="flex flex-wrap gap-3">
                        {CATEGORIES.map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => handleScan(cat.id)} 
                                disabled={isScanning}
                                className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border flex items-center gap-3 ${activeFilter === cat.id && !isScanning ? 'bg-cyan-600 text-white border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)]' : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'}`}
                            >
                                <span>{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {isScanning && (
                <div className="py-24 flex flex-col items-center justify-center space-y-8 animate-[pulse_2s_infinite]">
                    <div className="relative">
                        <div className="w-24 h-24 border-4 border-cyan-500/20 rounded-full"></div>
                        <div className="absolute inset-0 w-24 h-24 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-cyan-500 font-black uppercase tracking-[0.5em] text-xs">Scanning Modern Network Nodes...</p>
                        <p className="text-gray-600 text-[10px] font-bold uppercase">Grounding results with Gemini 3 Pro Strategic Search...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-600/10 border border-red-500/20 p-8 rounded-3xl text-center">
                    <p className="text-red-500 font-black uppercase tracking-widest text-sm">{error}</p>
                </div>
            )}

            {results.length > 0 && !isScanning && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-[fadeIn_0.8s_ease-out]">
                    {results.map((f, i) => (
                        <div key={i} className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-between group hover:border-cyan-500/40 transition-all shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                <span className="text-9xl font-black italic">{i+1}</span>
                            </div>
                            
                            <div className="space-y-6 relative z-10">
                                <div className="flex justify-between items-start">
                                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-cyan-500">{f.license}</span>
                                    <span className="text-[10px] font-bold text-gray-200 bg-cyan-600/20 px-2 py-0.5 rounded border border-cyan-500/20 shadow-lg">{f.year}</span>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black uppercase tracking-tighter italic text-white leading-none group-hover:text-cyan-400 transition-colors">{f.title}</h3>
                                    <p className="text-gray-500 text-xs font-bold mt-2 uppercase tracking-widest">Dir. {f.director}</p>
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed font-medium line-clamp-4 italic">"{f.synopsis}"</p>
                            </div>

                            <div className="mt-10 pt-6 border-t border-white/5 flex flex-col gap-4 relative z-10">
                                <a 
                                    href={f.sourceUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="bg-white text-black font-black py-4 rounded-xl uppercase text-[10px] tracking-widest text-center shadow-xl hover:bg-cyan-600 hover:text-white transition-all transform active:scale-95"
                                >
                                    Review Master @ {f.sourceTitle}
                                </a>
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(f.title); alert('Title captured for Pipeline ingest.'); }}
                                    className="text-[9px] font-black text-gray-700 uppercase tracking-widest hover:text-white transition-colors"
                                >
                                    Capture Record Identifier
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {!isScanning && results.length === 0 && !error && (
                <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30 flex flex-col items-center gap-6">
                    <svg className="w-16 h-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <p className="text-gray-500 font-black uppercase tracking-[0.5em]">Scanner Online // Specify Modern Sector</p>
                </div>
            )}
        </div>
    );
};

export default ArchiveScoutTab;