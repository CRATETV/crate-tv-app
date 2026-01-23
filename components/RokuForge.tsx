import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import LoadingSpinner from './LoadingSpinner';

const COMPILER_STAGES = [
    { id: 'extraction', label: 'Extraction', icon: '📦', desc: 'Unpacking local Roku source' },
    { id: 'analysis', label: 'Analysis', icon: '🧠', desc: 'Mapping component hierarchy' },
    { id: 'integration', label: 'Integration', icon: '🧬', desc: 'Injecting Web Feature Parity' },
    { id: 'packaging', label: 'Packaging', icon: '🚀', desc: 'Synthesizing Fixed SDK ZIP' }
];

const RokuForge: React.FC = () => {
    const [isForging, setIsForging] = useState(false);
    const [currentStage, setCurrentStage] = useState<string | null>(null);
    const [result, setResult] = useState<{ xml: string; brs: string; explanation: string } | null>(null);
    const [fixedZipBlob, setFixedZipBlob] = useState<Blob | null>(null);
    const [error, setError] = useState('');
    const [copyType, setCopyType] = useState<'xml' | 'brs' | null>(null);
    const [prompt, setPrompt] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !file.name.endsWith('.zip')) {
            setError('Please upload a valid .zip Roku project.');
            return;
        }

        setIsForging(true);
        setError('');
        setResult(null);
        setFixedZipBlob(null);
        const password = sessionStorage.getItem('adminPassword');

        try {
            setCurrentStage('extraction');
            const zip = await JSZip.loadAsync(file);
            const projectStructure: Record<string, string> = {};
            
            const filePromises: Promise<void>[] = [];
            zip.forEach((relativePath, zipEntry) => {
                if (!zipEntry.dir && (relativePath.endsWith('.brs') || relativePath.endsWith('.xml') || relativePath === 'manifest')) {
                    filePromises.push(
                        zipEntry.async('string').then(content => {
                            projectStructure[relativePath] = content;
                        })
                    );
                }
            });
            await Promise.all(filePromises);

            setCurrentStage('analysis');
            await new Promise(r => setTimeout(r, 1000));

            setCurrentStage('integration');
            const res = await fetch('/api/generate-roku-logic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password, 
                    prompt: `RECONSTRUCT PROJECT: ${prompt || 'Apply Tudum aesthetics and integrate Watch Party sync.'}. 
                             INPUT MANIFEST: ${JSON.stringify(projectStructure).substring(0, 10000)}...`,
                    componentType: 'PROJECT_WIDE_REFACTOR' 
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'AI Synthesis rejected the request.');
            setResult(data);

            setCurrentStage('packaging');
            const newZip = new JSZip();
            
            const copyPromises: Promise<void>[] = [];
            zip.forEach((path, entry) => {
                if (!entry.dir) {
                    copyPromises.push(
                        entry.async('blob').then(blob => {
                            newZip.file(path, blob);
                        })
                    );
                }
            });
            await Promise.all(copyPromises);

            newZip.file('components/HomeScene.xml', data.xml);
            newZip.file('components/HomeScene.brs', data.brs);
            
            const finalBlob = await newZip.generateAsync({ type: 'blob' });
            setFixedZipBlob(finalBlob);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Strategic Transformation failure.');
        } finally {
            setIsForging(false);
            setCurrentStage(null);
        }
    };

    const handleDownloadFixed = () => {
        if (!fixedZipBlob) return;
        const url = URL.createObjectURL(fixedZipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cratetv-fixed-sdk-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const handleCopy = (code: string, label: 'xml' | 'brs') => {
        navigator.clipboard.writeText(code);
        setCopyType(label);
        setTimeout(() => setCopyType(null), 2000);
    };

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out] pb-32">
            <div className="bg-[#050505] border border-purple-500/20 p-10 md:p-14 rounded-[4rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none rotate-12 scale-150">
                    <h2 className="text-[18rem] font-black italic text-purple-600">FORGE</h2>
                </div>
                
                <div className="relative z-10 max-w-6xl space-y-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse"></div>
                            <p className="text-purple-500 font-black uppercase tracking-[0.5em] text-[11px]">Roku Infrastructure Rebuild</p>
                        </div>
                        <h2 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter italic leading-none">The SDK Forge.</h2>
                        <p className="text-2xl text-gray-500 font-medium leading-relaxed max-w-4xl">
                            Upload your Roku project ZIP. The Forge will <span className="text-white italic">refactor the logic</span> for global sync parity and provide a corrected ZIP for the Channel Store.
                        </p>
                    </div>

                    <div className="flex flex-col gap-10">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {COMPILER_STAGES.map(stage => (
                                <div key={stage.id} className={`p-8 rounded-3xl border transition-all duration-700 ${currentStage === stage.id ? 'bg-purple-600 border-purple-400 shadow-2xl scale-105' : 'bg-white/5 border-white/5 opacity-40'}`}>
                                    <span className="text-3xl mb-4 block">{stage.icon}</span>
                                    <p className={`text-[12px] font-black uppercase tracking-widest ${currentStage === stage.id ? 'text-white' : 'text-gray-500'}`}>{stage.label}</p>
                                    <p className={`text-[9px] font-bold mt-2 uppercase ${currentStage === stage.id ? 'text-purple-100' : 'text-gray-700'}`}>{stage.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-6">
                            <textarea 
                                value={prompt} 
                                onChange={e => setPrompt(e.target.value)} 
                                placeholder="Refactoring instructions (e.g. 'Ensure the Oscars live stream node is prioritized')..." 
                                className="form-input !bg-black/60 border-white/10 !p-10 text-2xl font-medium min-h-[150px] focus:border-purple-600 transition-all shadow-inner"
                            />
                            
                            <input type="file" ref={fileInputRef} onChange={handleZipUpload} accept=".zip" className="hidden" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isForging}
                                    className="bg-white text-black font-black py-12 rounded-[2.5rem] uppercase tracking-widest text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 flex flex-col items-center justify-center gap-4"
                                >
                                    {isForging ? <div className="w-8 h-8 border-4 border-black/20 border-t-black rounded-full animate-spin"></div> : 'Upload SDK to Refactor'}
                                </button>

                                <button 
                                    onClick={handleDownloadFixed}
                                    disabled={!fixedZipBlob || isForging}
                                    className="bg-green-600 text-white font-black py-12 rounded-[2.5rem] uppercase tracking-widest text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-5 flex flex-col items-center justify-center gap-4"
                                >
                                    Download Fixed ZIP
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-10 bg-red-600/10 border border-red-500/20 rounded-[3rem] text-center animate-shake">
                    <p className="text-red-500 font-black uppercase tracking-widest">{error}</p>
                </div>
            )}

            {result && !isForging && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-[fadeIn_1s_ease-out]">
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-6">
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Fixed HomeScene.xml</span>
                            <button onClick={() => handleCopy(result.xml, 'xml')} className="text-[10px] font-black uppercase tracking-widest px-5 py-2 rounded-xl bg-white/5 text-gray-400 border border-white/10">Copy XML</button>
                        </div>
                        <div className="bg-[#050505] border border-white/5 p-12 rounded-[3.5rem] h-[600px] overflow-auto scrollbar-hide">
                            <pre className="text-xs font-mono text-purple-400 leading-relaxed whitespace-pre-wrap">{result.xml}</pre>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-6">
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Fixed HomeScene.brs</span>
                            <button onClick={() => handleCopy(result.brs, 'brs')} className="text-[10px] font-black uppercase tracking-widest px-5 py-2 rounded-xl bg-white/5 text-gray-400 border border-white/10">Copy .brs</button>
                        </div>
                        <div className="bg-[#050505] border border-white/5 p-12 rounded-[3.5rem] h-[600px] overflow-auto scrollbar-hide">
                            <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap">{result.brs}</pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RokuForge;