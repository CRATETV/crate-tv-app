
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
    acquisitionMode: 'INGEST' | 'NEGOTIATE';
}

const CATEGORIES = [
    { id: 'prestige_shorts', label: 'Shortverse & Prestige', icon: '🏆' },
    { id: 'vimeo_staff', label: 'Vimeo Staff Picks (CC)', icon: '✨' },
    { id: 'philly_open', label: 'Philly Community Records', icon: '🏘️' },
    { id: 'experimental', label: 'Digital Avant-Garde', icon: '🧬' }
];

const ArchiveScoutTab: React.FC = () => {
    const [view, setView] = useState<'scout' | 'marketing'>('scout');
    const [isScanning, setIsScanning] = useState(false);
    const [results, setResults] = useState<ScoutedFilm[]>([]);
    const [ingestingId, setIngestingId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [activeFilter, setActiveFilter] = useState('prestige_shorts');

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

    const handlePushToJury = async (film: ScoutedFilm, index: number) => {
        setIngestingId(index);
        try {
            const res = await fetch('/api/send-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filmTitle: film.title,
                    directorName: film.director,
                    email: 'scouted@cratetv.net',
                    cast: 'Internal Scouting',
                    synopsis: film.synopsis,
                    posterUrl: 'https://cratetelevision.s3.us-east-1.amazonaws.com/placeholder-poster.png',
                    movieUrl: film.sourceUrl,
                    source: 'AI_SCOUTED',
                    website_url_check: '' // Honeypot bypass
                })
            });
            if (res.ok) {
                alert(`"${film.title}" pushed to Jury manifest as a SCOUTED target.`);
            }
        } catch (e) {
            alert("Uplink to pipeline failed.");
        } finally {
            setIngestingId(null);
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-[fadeIn_0.5s_ease-out] pb-24">
            <div className="flex justify-center mb-4">
                <div className="bg-black border border-white/5 p-1 rounded-2xl inline-flex shadow-2xl">
                    <button onClick={() => setView('scout')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'scout' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Prestige Scout</button>
                    <button onClick={() => setView('marketing')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'marketing' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Street Heat Lab</button>
                </div>
            </div>

            {view === 'scout' ? (
                <div className="flex flex-col xl:flex-row gap-8">
                    <div className="w-full xl:w-[450px] space-y-8 flex-shrink-0">
                        <div className="bg-cyan-600/10 border border-cyan-500/20 p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                                    <p className="text-cyan-500 font-black uppercase tracking-[0.6em] text-[10px]">Prestige Intelligence</p>
                                </div>
                                <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic mb-6 leading-none">Modern Scout.</h2>
                                <p className="text-gray-400 font-medium leading-relaxed mb-10 text-sm">Identifying <span className="text-white font-bold">award-winning cinema</span> on platforms like Shortverse and Vimeo that align with the Crate TV aesthetic.</p>
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
                        
                        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Strategy Advisory</h4>
                            <p className="text-xs text-gray-400 leading-relaxed italic">"Directly inviting festival winners via 'Modern Scout' increases Crate's catalog prestige by 400% compared to open submissions alone."</p>
                        </div>
                    </div>

                    <div className="flex-grow min-w-0 space-y-10">
                        {isScanning && (
                            <div className="h-full py-32 border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center gap-8">
                                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-cyan-500 font-black uppercase tracking-widest text-xs">Scanning Digital Archives...</p>
                            </div>
                        )}

                        {results.length > 0 && !isScanning && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-[fadeIn_0.8s_ease-out]">
                                {results.map((f, i) => (
                                    <div key={i} className={`bg-[#0f0f0f] border ${f.acquisitionMode === 'NEGOTIATE' ? 'border-amber-500/20' : 'border-white/5'} p-10 rounded-[3.5rem] flex flex-col justify-between group hover:border-cyan-500/40 transition-all shadow-2xl h-full`}>
                                        <div className="space-y-8 relative z-10">
                                            <div className="flex justify-between items-start">
                                                <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${f.acquisitionMode === 'NEGOTIATE' ? 'text-amber-500' : 'text-cyan-500'}`}>
                                                    {f.acquisitionMode === 'NEGOTIATE' ? 'Negotiation Target' : f.license}
                                                </span>
                                                <span className="text-[10px] font-black text-gray-200 bg-cyan-600/20 px-3 py-1 rounded-full border border-cyan-500/20 shadow-lg">{f.year}</span>
                                            </div>
                                            <div>
                                                <h3 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-[0.9] group-hover:text-cyan-400 transition-colors">{f.title}</h3>
                                                <p className="text-gray-500 text-[11px] font-bold mt-3 uppercase tracking-[0.2em]">Director: {f.director}</p>
                                            </div>
                                            <p className="text-gray-400 text-sm leading-relaxed font-medium italic border-l-2 border-white/5 pl-4">"{f.synopsis}"</p>
                                        </div>

                                        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col gap-3 relative z-10">
                                            <button 
                                                onClick={() => handlePushToJury(f, i)}
                                                disabled={ingestingId === i}
                                                className={`text-white font-black py-5 rounded-2xl uppercase text-[11px] tracking-widest text-center shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${f.acquisitionMode === 'NEGOTIATE' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-red-600 hover:bg-red-500'}`}
                                            >
                                                {ingestingId === i ? 'Routing...' : 'Push to Grand Jury'}
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            </button>
                                            <a 
                                                href={f.sourceUrl} 
                                                target="_blank" 
                                                className="bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-xl uppercase text-[9px] tracking-widest text-center border border-white/10 transition-all"
                                            >
                                                Review Source @ {f.sourceTitle}
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto space-y-12 animate-[fadeIn_0.5s_ease-out]">
                    <div className="bg-red-600/10 border border-red-500/20 p-10 rounded-[3rem] text-center space-y-4 shadow-2xl">
                         <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Street Heat Lab.</h2>
                         <p className="text-gray-400 max-w-xl mx-auto">Asset blueprints for the Summer Community Refresh campaign.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl space-y-6 shadow-xl">
                            <h3 className="text-lg font-black uppercase text-red-500 tracking-widest">Cold Water Labels</h3>
                            <div className="p-6 bg-black rounded-2xl border border-white/10 space-y-4">
                                <p className="text-[10px] font-black text-gray-600 uppercase">Label Headline</p>
                                <p className="text-2xl font-black text-white uppercase italic tracking-tighter">REFRESH THE CULTURE.</p>
                                <p className="text-[10px] font-black text-gray-600 uppercase pt-4">Call to Action</p>
                                <p className="text-sm font-bold text-gray-300">Scan to watch the local collection on Crate TV. No paywall.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArchiveScoutTab;
