import React, { useState } from 'react';
import { AnalyticsData } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface StrategicHubProps {
    analytics: AnalyticsData | null;
}

const ManifestBlock: React.FC<{ label: string; text: string }> = ({ label, text }) => (
    <div className="bg-black/60 border border-white/10 p-6 rounded-2xl relative group">
        <div className="flex justify-between items-center mb-3">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{label}</p>
            <span className="text-[9px] text-gray-700 font-mono">{text.length} chars</span>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed font-medium italic">"{text}"</p>
        <button 
            onClick={() => { navigator.clipboard.writeText(text); alert('Copy successful.'); }}
            className="absolute top-4 right-4 text-gray-700 hover:text-white transition-colors"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
        </button>
    </div>
);

const ShowcaseAsset: React.FC<{ title: string; desc: string; icon: string }> = ({ title, desc, icon }) => (
    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 hover:border-red-600/30 transition-all relative">
        <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <h4 className="text-white font-black uppercase tracking-tighter italic">{title}</h4>
        </div>
        <p className="text-gray-400 text-xs leading-relaxed font-medium">"{desc}"</p>
        <div className="flex justify-between items-center pt-2">
            <button 
                onClick={() => { navigator.clipboard.writeText(`${title}\n\n${desc}`); alert('Narrative copied.'); }}
                className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:text-white transition-colors"
            >
                Copy Narrative Pair
            </button>
            <span className="text-[8px] text-gray-700 font-mono uppercase">{desc.length}/160 CHARS</span>
        </div>
    </div>
);

const StrategicHub: React.FC<StrategicHubProps> = ({ analytics }) => {
    const [target, setTarget] = useState<'aws' | 'investor' | 'press'>('aws');
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [isForgingImage, setIsForgingImage] = useState(false);
    const [manifest, setManifest] = useState<any>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

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

    const handleForgeVisual = async () => {
        setIsForgingImage(true);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/generate-brand-asset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password, 
                    type: 'header', 
                    context: 'AWS Startup Showcase Cover Image' 
                }),
            });
            const data = await res.json();
            if (data.imageUrl) setGeneratedImage(data.imageUrl);
        } catch (e) {
            alert("Visual forge offline.");
        } finally {
            setIsForgingImage(false);
        }
    };

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out] pb-32">
            
            {/* Showcase Asset Manifest Section */}
            <div className="bg-gradient-to-br from-red-600/10 to-transparent border border-red-500/20 p-10 rounded-[3rem] shadow-2xl space-y-8">
                <div className="flex items-baseline gap-4">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Showcase Asset Manifest</h2>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Optimized for 160-Char Limits</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ShowcaseAsset 
                        icon="📱"
                        title="The Discovery Terminal"
                        desc="High-density mobile UI for rapid discovery. Features a real-time 'Live Pulse' and sector routing powered by our unique serverless infrastructure manifest logic."
                    />
                    <ShowcaseAsset 
                        icon="📺"
                        title="Big Screen Authority"
                        desc="Native Roku SDK delivering high-bitrate masters. Immersive 10-foot experience with zero-latency global sync, scaling 4K video across hardware ecosystems."
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* AWS Tech Cheat Sheet */}
                <div className="bg-[#0a0a0a] border border-amber-500/20 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden h-fit">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                         <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/aws.png" className="w-24 grayscale" alt="AWS" />
                    </div>
                    <div className="relative z-10 space-y-6">
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">AWS Infrastructure Brief.</h2>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Copy these into the Showcase Form</p>
                        </div>
                        
                        <div className="grid gap-4">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">Primary Storage</p>
                                <p className="text-sm font-bold text-white">Amazon S3</p>
                                <p className="text-[10px] text-gray-500 mt-1">"The Crate Vault" - Housing high-bitrate 4K cinematic masters and encrypted key art.</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">Delivery Layer</p>
                                <p className="text-sm font-bold text-white">Amazon CloudFront</p>
                                <p className="text-[10px] text-gray-500 mt-1">Global edge delivery protocols ensuring zero-buffer playback for international audiences.</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">Security Framework</p>
                                <p className="text-sm font-bold text-white">AWS IAM / Signature V4</p>
                                <p className="text-[10px] text-gray-500 mt-1">Enterprise-grade authorization governing the handshake between Vercel and the S3 Master Feed.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visual Asset Forge */}
                <div className="bg-gradient-to-br from-red-950/20 via-black to-black border border-red-500/20 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden h-fit">
                    <div className="relative z-10 space-y-8">
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Visual Forge.</h2>
                            <p className="text-gray-400 font-medium leading-relaxed mt-2 text-sm">Generate impressive cinematic headers for startup showcases.</p>
                        </div>

                        <div className="aspect-video bg-black rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center relative group">
                            {generatedImage ? (
                                <img src={generatedImage} className="w-full h-full object-cover" alt="Generated Header" />
                            ) : (
                                <div className="text-center opacity-20 group-hover:opacity-40 transition-opacity">
                                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Visual Synthesis</p>
                                </div>
                            )}
                            {isForgingImage && (
                                <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center space-y-4">
                                    <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-red-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Forging Cinematic Frame...</p>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handleForgeVisual}
                            disabled={isForgingImage}
                            className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-2xl transition-all active:scale-95 disabled:opacity-30"
                        >
                            {isForgingImage ? 'Forging Master Asset...' : 'Generate AWS Showcase Header'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900/40 via-black to-black border border-indigo-500/20 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden h-fit">
                    <div className="relative z-10 space-y-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div>
                                <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">Narrative Hub.</h2>
                                <p className="text-gray-400 font-medium leading-relaxed mt-2">Generate high-stakes copy for external profiles.</p>
                            </div>

                            <div className="flex flex-wrap gap-2 p-1 bg-black rounded-xl border border-white/5">
                                {['aws', 'investor', 'press'].map((t: any) => (
                                    <button key={t} onClick={() => setTarget(t)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${target === t ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>
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
                            {isSynthesizing ? 'Synthesizing Narrative...' : 'Synthesize Profile Manifest'}
                        </button>
                    </div>
                </div>

            {manifest && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-[fadeIn_0.8s_ease-out]">
                    <div className="space-y-6">
                        <ManifestBlock label="Main Header / Tagline" text={manifest.tagline} />
                        <ManifestBlock label="Short Description (Elevator Pitch)" text={manifest.shortDesc} />
                        <ManifestBlock label="The Problem Statement" text={manifest.problem} />
                    </div>
                    <div className="space-y-6">
                        <ManifestBlock label="The AWS Solution" text={manifest.solution} />
                        <ManifestBlock label="Impact Statement" text={manifest.impact} />
                        <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-3xl space-y-4">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Showcase Design Logic</h4>
                            <p className="text-gray-400 text-xs leading-relaxed">Gemini Recommendation: Descriptions are optimized for 160-character maximum constraints commonly found in AWS Activate and professional startup directory platforms.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrategicHub;