
import React, { useState, useMemo } from 'react';
import { AnalyticsData, Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import PromoCodeManager from './PromoCodeManager';
import { useFestival } from '../contexts/FestivalContext';

interface StrategicHubProps {
    analytics: AnalyticsData | null;
}

const ManifestBlock: React.FC<{ label: string; text: string }> = ({ label, text }) => (
    <div className="bg-black/60 border border-white/10 p-6 rounded-2xl relative group shadow-inner">
        <div className="flex justify-between items-center mb-3">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{label}</p>
            <span className="text-[9px] text-gray-700 font-mono">{text.length} chars</span>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed font-medium italic">"{text}"</p>
        <button 
            onClick={() => { navigator.clipboard.writeText(text); alert('Payload copied.'); }}
            className="absolute top-4 right-4 text-gray-700 hover:text-white transition-colors"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
        </button>
    </div>
);

const StrategicHub: React.FC<StrategicHubProps> = ({ analytics }) => {
    const { movies } = useFestival();
    const [target, setTarget] = useState<'aws' | 'investor' | 'press'>('aws');
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [manifest, setManifest] = useState<any>(null);

    const movieArray = useMemo(() => Object.values(movies) as Movie[], [movies]);

    const handleSynthesize = async () => {
        setIsSynthesizing(true);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/generate-showcase-manifest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, target, metrics: analytics }),
            });
            const data = await res.json();
            setManifest(data.manifest);
        } catch (e) {
            alert("Synthesis uplink failed.");
        } finally {
            setIsSynthesizing(false);
        }
    };

    return (
        <div className="space-y-16 animate-[fadeIn_0.5s_ease-out] pb-32">
            
            <div className="bg-gradient-to-br from-green-900/20 to-black border border-green-500/20 p-10 rounded-[3rem] shadow-2xl space-y-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                     <svg className="w-48 h-48 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                </div>
                <div className="relative z-10">
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <p className="text-green-500 font-black uppercase tracking-[0.6em] text-[10px]">Conversion Ops</p>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic">Voucher Forge.</h2>
                        <p className="text-gray-400 max-w-2xl mt-4 font-medium leading-relaxed">Respond to social media praise or partner inquiries with immediate value. Issue single-use master keys.</p>
                    </div>
                    
                    <PromoCodeManager 
                        isAdmin={true} 
                        targetFilms={movieArray}
                    />
                </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900/40 via-black to-black border border-indigo-500/20 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden h-fit">
                    <div className="relative z-10 space-y-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div>
                                <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">Narrative Hub.</h2>
                                <p className="text-gray-400 font-medium leading-relaxed mt-2">Synthesize high-stakes copy for partners, press, or strategic infrastructure applications.</p>
                            </div>

                            <div className="flex flex-wrap gap-2 p-1 bg-black rounded-xl border border-white/5 shadow-inner">
                                {['aws', 'investor', 'press'].map((t: any) => (
                                    <button key={t} onClick={() => setTarget(t)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${target === t ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                                        {t.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={handleSynthesize}
                            disabled={isSynthesizing}
                            className="w-full bg-white text-black hover:bg-gray-200 font-black py-6 rounded-2xl uppercase tracking-[0.2em] text-xs shadow-2xl transition-all active:scale-95 disabled:opacity-30"
                        >
                            {isSynthesizing ? 'Consulting Gemini Core...' : 'Synthesize Strategic Manifest'}
                        </button>
                    </div>
                </div>

            {manifest && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-[fadeIn_0.8s_ease-out]">
                    <div className="space-y-6">
                        <ManifestBlock label="Strategic Hook" text={manifest.tagline} />
                        <ManifestBlock label="Elevator Pitch (160 Chars)" text={manifest.shortDesc} />
                        <ManifestBlock label="Market Conflict" text={manifest.problem} />
                    </div>
                    <div className="space-y-6">
                        <ManifestBlock label="Systemic Solution" text={manifest.solution} />
                        <ManifestBlock label="Impact Thesis" text={manifest.impact} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrategicHub;
