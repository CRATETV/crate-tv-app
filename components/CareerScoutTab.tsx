
import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface CareerIntel {
    rareSkill: string;
    description: string;
    bulletPoint: string;
}

const CareerScoutTab: React.FC = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [intel, setIntel] = useState<CareerIntel[]>([]);
    const [pitch, setPitch] = useState('');
    const [error, setError] = useState('');

    const handleAnalyzeExperience = async () => {
        setIsAnalyzing(true);
        setError('');
        const password = sessionStorage.getItem('adminPassword');
        
        try {
            const res = await fetch('/api/get-career-scout-intel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setIntel(data.intel);
            setPitch(data.pitch);
        } catch (err) {
            setError('System core analysis deferred.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out] pb-32">
            <div className="bg-gradient-to-br from-indigo-900/40 via-gray-900 to-black p-10 rounded-[3rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <svg className="w-48 h-48 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                
                <div className="relative z-10 max-w-4xl space-y-6">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_#6366f1]"></span>
                        <p className="text-indigo-400 font-black uppercase tracking-[0.5em] text-[10px]">Crate Career Intelligence // V1.0</p>
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter italic leading-none">Experience <span className="text-indigo-500">Forge.</span></h2>
                    <p className="text-xl text-gray-400 font-medium leading-relaxed">
                        Convert your Crate TV architecture into professional high-stakes narratives. This tool maps your technical output to the specific language used by **Insight Global** and **Big Tech** recruiters.
                    </p>
                    
                    <div className="pt-6">
                        <button 
                            onClick={handleAnalyzeExperience}
                            disabled={isAnalyzing}
                            className="bg-white text-black font-black px-12 py-5 rounded-2xl text-lg uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-30"
                        >
                            {isAnalyzing ? 'Synthesizing Trajectory...' : 'Analyze Architecture for Recruiters'}
                        </button>
                    </div>
                </div>
            </div>

            {isAnalyzing && (
                <div className="py-20 flex flex-col items-center justify-center space-y-6">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-indigo-400 font-black uppercase tracking-widest text-xs animate-pulse">Gemini is mapping codebase to industry standards...</p>
                </div>
            )}

            {intel.length > 0 && !isAnalyzing && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-[fadeIn_0.6s_ease-out]">
                    <div className="space-y-6">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest italic border-l-4 border-red-600 pl-4">Core Skill Manifest</h3>
                        <div className="grid gap-4">
                            {intel.map((item, i) => (
                                <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-3xl hover:border-indigo-500/30 transition-all">
                                    <p className="text-indigo-400 font-black uppercase text-[10px] tracking-widest mb-2">{item.rareSkill}</p>
                                    <p className="text-white font-bold text-lg mb-3 uppercase tracking-tight">{item.description}</p>
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                        <p className="text-gray-400 text-xs italic leading-relaxed">" {item.bulletPoint} "</p>
                                    </div>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(item.bulletPoint); alert('Copied to Clipboard.'); }}
                                        className="mt-4 text-[9px] font-black uppercase text-gray-600 hover:text-white transition-colors"
                                    >
                                        Copy Bullet Point
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                         <h3 className="text-xl font-black text-white uppercase tracking-widest italic border-l-4 border-indigo-600 pl-4">The Recruiter Hook</h3>
                         <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden h-full">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <svg className="w-32 h-32 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                            </div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Optimized for Insight Global Outreach</p>
                            <pre className="whitespace-pre-wrap font-serif text-lg text-gray-300 leading-relaxed italic pr-4">
                                "{pitch}"
                            </pre>
                            <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center">
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(pitch); alert('Recruiter Pitch Copied.'); }}
                                    className="bg-white text-black font-black px-8 py-3 rounded-xl uppercase text-[10px] tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-xl"
                                >
                                    Copy Professional Hook
                                </button>
                                <a 
                                    href="https://jobs.insightglobal.com/search?keywords=Roku%20React%20Remote"
                                    target="_blank"
                                    className="text-indigo-400 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors flex items-center gap-2"
                                >
                                    Launch Search Hub
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                            </div>
                         </div>
                    </div>
                </div>
            )}
            
            {!intel.length && !isAnalyzing && (
                <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[4rem] opacity-30">
                    <p className="text-gray-500 font-black uppercase tracking-[0.8em]">Awaiting Identity Analysis</p>
                </div>
            )}
        </div>
    );
};

export default CareerScoutTab;
