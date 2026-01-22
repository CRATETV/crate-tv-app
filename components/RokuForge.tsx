import React, { useState, useMemo } from 'react';
import LoadingSpinner from './LoadingSpinner';

const COMPILER_STAGES = [
    { id: 'ingestion', label: 'Ingestion', icon: '📥', desc: 'Identify HTML/JS structure' },
    { id: 'mapping', label: 'Mapping', icon: '🗺️', desc: 'React -> SceneGraph Mapping' },
    { id: 'translation', label: 'Translation', icon: '⚡', desc: 'JS -> BrightScript Transpilation' },
    { id: 'packaging', label: 'Packaging', icon: '📦', desc: 'Generate SDK Directory' }
];

const RokuForge: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isForging, setIsForging] = useState(false);
    const [currentStage, setCurrentStage] = useState<string | null>(null);
    const [result, setResult] = useState<{ xml: string; brs: string; explanation: string } | null>(null);
    const [error, setError] = useState('');
    const [copyType, setCopyType] = useState<'xml' | 'brs' | null>(null);

    const handleForge = async () => {
        if (!prompt.trim()) return;
        setIsForging(true);
        setError('');
        setResult(null);
        const password = sessionStorage.getItem('adminPassword');

        // Simulate 4-Stage Pipeline for UX
        for (const stage of COMPILER_STAGES) {
            setCurrentStage(stage.id);
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        try {
            const res = await fetch('/api/generate-roku-logic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password, 
                    prompt: `CONVERSION REQUEST: ${prompt}. 
                             MAPPING RULES: 
                             - Map Flexbox to RowList. 
                             - Map fetch() to roUrlTransfer. 
                             - Inject Focus Management (m.top.setFocus(true)).
                             - Use SceneGraph XML patterns.`,
                    componentType: 'FULL_SDK_BUILD' 
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Compiler uplink rejected.');
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Compiler Logic Failure.');
        } finally {
            setIsForging(false);
            setCurrentStage(null);
        }
    };

    const handleCopy = (code: string, label: 'xml' | 'brs') => {
        navigator.clipboard.writeText(code);
        setCopyType(label);
        setTimeout(() => setCopyType(null), 2000);
    };

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out] pb-32">
            <div className="bg-[#050505] border border-purple-500/20 p-10 md:p-14 rounded-[4rem] shadow-[0_0_100px_rgba(168,85,247,0.1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none rotate-12 scale-150">
                    <h2 className="text-[15rem] font-black italic text-purple-500">SDK</h2>
                </div>
                
                <div className="relative z-10 max-w-5xl space-y-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse"></div>
                            <p className="text-purple-500 font-black uppercase tracking-[0.5em] text-[11px]">Web-to-BrightScript Compiler</p>
                        </div>
                        <h2 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter italic leading-none">The Compiler.</h2>
                        <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-3xl">
                            Semantic translation engine mapping React HTML5 components to <span className="text-white italic">BrightScript SceneGraph</span> equivalents. Optimized for remote focus and lazy loading.
                        </p>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {COMPILER_STAGES.map(stage => (
                                <div key={stage.id} className={`p-6 rounded-3xl border transition-all duration-500 ${currentStage === stage.id ? 'bg-purple-600 border-purple-400 shadow-2xl scale-105' : 'bg-white/5 border-white/5 opacity-40'}`}>
                                    <span className="text-2xl mb-3 block">{stage.icon}</span>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${currentStage === stage.id ? 'text-white' : 'text-gray-500'}`}>{stage.label}</p>
                                    <p className={`text-[8px] font-bold mt-1 uppercase ${currentStage === stage.id ? 'text-purple-100' : 'text-gray-700'}`}>{stage.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-4">
                            <textarea 
                                value={prompt} 
                                onChange={e => setPrompt(e.target.value)} 
                                placeholder="Paste Web Component logic to transpile (e.g. A React carousel with fetch calls)..." 
                                className="form-input !bg-black/60 border-white/10 !p-8 text-xl font-medium min-h-[200px] focus:border-purple-600 transition-all scrollbar-hide shadow-inner"
                            />
                            <button 
                                onClick={handleForge}
                                disabled={isForging || !prompt}
                                className="w-full bg-white text-black font-black py-8 rounded-[2rem] uppercase tracking-[0.4em] text-sm shadow-[0_40px_80px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center gap-4"
                            >
                                {isForging ? (
                                    <>
                                        <div className="w-5 h-5 border-4 border-black/20 border-t-black rounded-full animate-spin"></div>
                                        Compiling Binary Structure...
                                    </>
                                ) : 'Execute Conversion Pipeline'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {result && !isForging && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-[fadeIn_0.8s_ease-out]">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-4">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Roku SceneGraph XML</span>
                            </div>
                            <button 
                                onClick={() => handleCopy(result.xml, 'xml')}
                                className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg transition-all ${copyType === 'xml' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
                            >
                                {copyType === 'xml' ? 'Payload Copied' : 'Copy XML'}
                            </button>
                        </div>
                        <div className="bg-[#050505] border border-white/5 p-10 rounded-[3rem] shadow-2xl h-[600px] overflow-auto scrollbar-hide relative group">
                            <pre className="text-xs font-mono text-purple-400 leading-relaxed whitespace-pre-wrap">{result.xml}</pre>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-4">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">BrightScript Logic (.brs)</span>
                            </div>
                            <button 
                                onClick={() => handleCopy(result.brs, 'brs')}
                                className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg transition-all ${copyType === 'brs' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
                            >
                                {copyType === 'brs' ? 'Payload Copied' : 'Copy .brs'}
                            </button>
                        </div>
                        <div className="bg-[#050505] border border-white/5 p-10 rounded-[3rem] shadow-2xl h-[600px] overflow-auto scrollbar-hide relative group">
                            <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap">{result.brs}</pre>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white/5 border border-white/10 p-12 rounded-[3.5rem] shadow-xl">
                        <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-[0.6em] mb-6">Semantic Translation Report</h4>
                        <p className="text-gray-300 text-xl leading-relaxed font-medium italic">"{result.explanation}"</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RokuForge;