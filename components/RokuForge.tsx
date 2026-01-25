import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import LoadingSpinner from './LoadingSpinner';

const COMPILER_STAGES = [
    { id: 'extraction', label: 'Extraction', icon: '📦', desc: 'Unpacking local Roku source' },
    { id: 'analysis', label: 'Analysis', icon: '🧠', desc: 'Triangulating with Telnet Logs' },
    { id: 'integration', label: 'Integration', icon: '🧬', desc: 'Patching Logic Breaches' },
    { id: 'packaging', label: 'Packaging', icon: '🚀', desc: 'Synthesizing Verified ZIP' }
];

const RokuForge: React.FC = () => {
    const [isForging, setIsForging] = useState(false);
    const [currentStage, setCurrentStage] = useState<string | null>(null);
    const [explanation, setExplanation] = useState('');
    const [fixedZipBlob, setFixedZipBlob] = useState<Blob | null>(null);
    const [error, setError] = useState('');
    const [prompt, setPrompt] = useState('');
    const [debugLog, setDebugLog] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !file.name.endsWith('.zip')) {
            setError('Please upload a valid .zip Roku project.');
            return;
        }

        setIsForging(true);
        setError('');
        setExplanation('');
        setFixedZipBlob(null);
        const password = sessionStorage.getItem('adminPassword');

        try {
            setCurrentStage('extraction');
            const zip = await JSZip.loadAsync(file);
            const projectContext: Record<string, string> = {};
            
            // We extract core logic files to send to the AI for analysis
            const filesToAnalyze = [
                'manifest',
                'components/HomeScene.xml',
                'components/HomeScene.brs',
                'source/main.brs'
            ];

            for (const path of filesToAnalyze) {
                const entry = zip.file(path);
                if (entry) {
                    projectContext[path] = await entry.async('string');
                }
            }

            setCurrentStage('analysis');
            await new Promise(r => setTimeout(r, 1000));

            setCurrentStage('integration');
            const res = await fetch('/api/generate-roku-logic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password, 
                    prompt: prompt || 'Fix all crashes and ensure feature parity with the webapp.',
                    debugLog: debugLog || 'No telnet logs provided.',
                    projectStructure: JSON.stringify(projectContext)
                }),
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'The Forge rejected the logic synchronization.');
            
            setExplanation(data.explanation);

            setCurrentStage('packaging');
            // Re-packaging: Clone the original and overwrite the core logic with forged code
            const newZip = new JSZip();
            
            // Copy all original files first
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

            // Inject forged files
            newZip.file('components/HomeScene.xml', data.xml);
            newZip.file('components/HomeScene.brs', data.brs);
            
            const finalBlob = await newZip.generateAsync({ 
                type: 'blob',
                compression: "DEFLATE",
                compressionOptions: { level: 9 }
            });
            
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
        a.download = `cratetv-forged-sdk-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out] pb-32">
            <div className="bg-[#050505] border border-purple-500/20 p-10 md:p-14 rounded-[4rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none rotate-12 scale-150">
                    <h2 className="text-[18rem] font-black italic text-purple-600">FORGE</h2>
                </div>
                
                <div className="relative z-10 max-w-6xl space-y-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse"></div>
                            <p className="text-purple-500 font-black uppercase tracking-[0.5em] text-[11px]">Roku Infrastructure Forge</p>
                        </div>
                        <h2 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter italic leading-none">The Forge.</h2>
                        <p className="text-2xl text-gray-500 font-medium leading-relaxed max-w-4xl">
                            Upload your current <span className="text-white">Roku ZIP</span> and paste the <span className="text-red-500">Telnet Output</span>. The Forge will synthesize a patched version that resolves crashes and matches web features.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {COMPILER_STAGES.map(stage => (
                            <div key={stage.id} className={`p-8 rounded-3xl border transition-all duration-700 ${currentStage === stage.id ? 'bg-purple-600 border-purple-400 shadow-2xl scale-105' : 'bg-white/5 border-white/5 opacity-40'}`}>
                                <span className="text-3xl mb-4 block">{stage.icon}</span>
                                <p className={`text-[12px] font-black uppercase tracking-widest ${currentStage === stage.id ? 'text-white' : 'text-gray-500'}`}>{stage.label}</p>
                                <p className={`text-[9px] font-bold mt-2 uppercase ${currentStage === stage.id ? 'text-purple-100' : 'text-gray-700'}`}>{stage.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Forge Instructions (Optional)</label>
                            <textarea 
                                value={prompt} 
                                onChange={e => setPrompt(e.target.value)} 
                                placeholder="e.g. 'Integrate the new Zine story row' or 'Fix the playback crash'..." 
                                className="form-input !bg-black/60 border-white/10 !p-6 text-lg font-medium min-h-[150px] focus:border-purple-600 transition-all"
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">Telnet Debug Feed (Port 8085)</label>
                                <button onClick={() => setDebugLog('')} className="text-[9px] font-black text-gray-700 hover:text-white uppercase tracking-widest">Clear Log</button>
                            </div>
                            <textarea 
                                value={debugLog} 
                                onChange={e => setDebugLog(e.target.value)} 
                                placeholder="Paste your Roku telnet debug logs here..." 
                                className="form-input !bg-[#020202] border-green-900/30 !p-6 text-[10px] font-mono text-green-500 min-h-[150px] focus:border-green-600 transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <input type="file" ref={fileInputRef} onChange={handleZipUpload} accept=".zip" className="hidden" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isForging}
                                className="bg-white text-black font-black py-10 rounded-[2.5rem] uppercase tracking-widest text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 flex flex-col items-center justify-center gap-4"
                            >
                                {isForging ? <div className="w-8 h-8 border-4 border-black/20 border-t-black rounded-full animate-spin"></div> : (
                                    <>
                                        <span className="text-2xl">⚡</span>
                                        Process ZIP & Logs
                                    </>
                                )}
                            </button>

                            <button 
                                onClick={handleDownloadFixed}
                                disabled={!fixedZipBlob || isForging}
                                className="bg-green-600 text-white font-black py-10 rounded-[2.5rem] uppercase tracking-widest text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-5 flex flex-col items-center justify-center gap-4"
                            >
                                <span className="text-2xl">📂</span>
                                Download Forged ZIP
                            </button>
                        </div>
                    </div>

                    {explanation && (
                        <div className="p-8 bg-white/5 border border-white/10 rounded-3xl animate-[fadeIn_0.5s_ease-out]">
                            <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2">Forge Analysis Report</p>
                            <p className="text-sm text-gray-300 font-medium leading-relaxed italic">"{explanation}"</p>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-10 bg-red-600/10 border border-red-500/20 rounded-[3rem] text-center animate-shake">
                    <p className="text-red-500 font-black uppercase tracking-widest">{error}</p>
                </div>
            )}
        </div>
    );
};

export default RokuForge;