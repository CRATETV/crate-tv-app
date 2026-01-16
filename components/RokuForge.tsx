
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const PRESETS = [
    { label: 'Cinematic RowList', type: 'UI', prompt: 'A RowList that features large posters with a subtle red focus border and a title that appears on focus with a gradient fade.' },
    { label: 'Watch Party Sync', type: 'LOGIC', prompt: 'BrightScript logic to fetch /api/watch-party status and apply the currentTime to the video player with 1s buffer logic.' },
    { label: 'Details Transmission', type: 'UI', prompt: 'A prestigious Details Scene with a large backdrop poster at 20% opacity, a floating action button for "Watch Now", and a cast member grid.' },
    { label: 'Global Auth Bridge', type: 'LOGIC', prompt: 'Logic to handle the 6-character linking code handshake with the web API and persist the device token in registry.' }
];

const RokuForge: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [type, setType] = useState('UI');
    const [isForging, setIsForging] = useState(false);
    const [result, setResult] = useState<{ xml: string; brs: string; explanation: string } | null>(null);
    const [error, setError] = useState('');
    const [copyType, setCopyType] = useState<'xml' | 'brs' | null>(null);

    const handleForge = async () => {
        if (!prompt.trim()) return;
        setIsForging(true);
        setError('');
        setResult(null);
        const password = sessionStorage.getItem('adminPassword');

        try {
            const res = await fetch('/api/generate-roku-logic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, prompt, componentType: type }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Uplink rejected.');
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Uplink failed.');
        } finally {
            setIsForging(false);
        }
    };

    const handleCopy = (code: string, label: 'xml' | 'brs') => {
        navigator.clipboard.writeText(code);
        setCopyType(label);
        setTimeout(() => setCopyType(null), 2000);
    };

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out] pb-32">
            <div className="bg-purple-600/10 border border-purple-500/20 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none rotate-12 scale-150">
                    <h2 className="text-[12rem] font-black italic text-purple-500">FORGE</h2>
                </div>
                <div className="relative z-10 max-w-4xl space-y-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                            <p className="text-purple-500 font-black uppercase tracking-[0.6em] text-[10px]">Roku Engineering Core</p>
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter italic leading-none">Roku Forge.</h2>
                        <p className="text-xl text-gray-400 font-medium leading-relaxed mt-4">AI-driven BrightScript & SceneGraph synthesis. Build components that exactly mirror the web app's prestigious aesthetic.</p>
                    </div>

                    <div className="space-y-4 pt-4">
                        <div className="flex flex-wrap gap-2">
                            {PRESETS.map(p => (
                                <button 
                                    key={p.label}
                                    onClick={() => { setPrompt(p.prompt); setType(p.type); }}
                                    className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:bg-purple-600 transition-all"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <textarea 
                                value={prompt} 
                                onChange={e => setPrompt(e.target.value)} 
                                placeholder="Describe the component or logic required..." 
                                className="form-input !bg-black/40 border-white/10 flex-grow text-lg min-h-[120px] font-medium leading-relaxed"
                            />
                            <div className="flex flex-col gap-2">
                                <select value={type} onChange={e => setType(e.target.value)} className="form-input !py-3 !bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-widest">
                                    <option value="UI">UI Component</option>
                                    <option value="LOGIC">Script Logic</option>
                                    <option value="FULL">Full Build</option>
                                </select>
                                <button 
                                    onClick={handleForge}
                                    disabled={isForging || !prompt}
                                    className="flex-grow bg-white text-black font-black px-12 rounded-2xl uppercase tracking-widest text-xs shadow-xl transition-all hover:bg-purple-600 hover:text-white active:scale-95 disabled:opacity-20"
                                >
                                    {isForging ? 'Synthesizing...' : 'Execute Forge'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isForging && (
                <div className="py-24 flex flex-col items-center justify-center space-y-8">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-[0_0_40px_rgba(168,85,247,0.4)]"></div>
                    <div className="text-center">
                        <p className="text-purple-400 font-black uppercase tracking-[0.4em] text-xs animate-pulse">Gemini 3 Pro is constructing SceneGraph nodes...</p>
                        <p className="text-gray-700 text-[9px] font-bold uppercase mt-2">Targeting Crate TV V4 architecture standards</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-600/10 border border-red-500/20 p-8 rounded-[2rem] text-center">
                    <p className="text-red-500 font-black uppercase tracking-widest">{error}</p>
                </div>
            )}

            {result && !isForging && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-[fadeIn_0.8s_ease-out]">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-4">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">SceneGraph XML</span>
                            <button 
                                onClick={() => handleCopy(result.xml, 'xml')}
                                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${copyType === 'xml' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                            >
                                {copyType === 'xml' ? 'Copied' : 'Copy XML'}
                            </button>
                        </div>
                        <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl h-[500px] overflow-auto scrollbar-hide">
                            <pre className="text-xs font-mono text-purple-400 leading-relaxed whitespace-pre-wrap">{result.xml}</pre>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-4">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">BrightScript Logic</span>
                            <button 
                                onClick={() => handleCopy(result.brs, 'brs')}
                                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${copyType === 'brs' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                            >
                                {copyType === 'brs' ? 'Copied' : 'Copy Logic'}
                            </button>
                        </div>
                        <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl h-[500px] overflow-auto scrollbar-hide">
                            <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap">{result.brs}</pre>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-indigo-900/10 border border-indigo-500/20 p-10 rounded-[3rem] shadow-xl">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Engineering Manifesto</h4>
                        <p className="text-gray-300 text-lg leading-relaxed font-medium italic">"{result.explanation}"</p>
                    </div>
                </div>
            )}

            {!isForging && !result && (
                <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[4rem] opacity-20">
                    <p className="text-gray-500 font-black uppercase tracking-[0.6em] text-sm">Awaiting Strategic Design Input</p>
                </div>
            )}
        </div>
    );
};

export default RokuForge;
