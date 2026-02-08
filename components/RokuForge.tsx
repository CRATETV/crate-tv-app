
import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import LoadingSpinner from './LoadingSpinner';

const RokuForge: React.FC = () => {
    const [isForging, setIsForging] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const [fixedZipBlob, setFixedZipBlob] = useState<Blob | null>(null);
    const [error, setError] = useState('');
    const [copyStatus, setCopyStatus] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const MASTER_PROMPT = `Act as a Senior Roku SDK Architect. I need a production-grade logic patch for the "Crate TV" SceneGraph (V4 Infrastructure). 

CORE OBJECTIVE: 
The channel must provide a "Clean Cinema" experience. This means absolute focus on the film with ZERO distracting UI overlays during playback.

SPECIFIC FIXES REQUIRED:

1. CLEAN CINEMA PROTOCOL (VideoPlayer.xml & VideoPlayer.brs):
   - DISABLE NATIVE UI: Set the Video node field 'transportBarVisible' to false in the XML.
   - REMOVE ALL OVERLAYS: Delete every custom UI element (Group, Rectangle, Label) that appears at the bottom of the screen. 
   - PURGE BUTTONS: Remove the Play, Rewind, and Fast Forward button groups entirely. They are not rendering correctly and must be deleted.
   - SCREEN CLEARANCE: The screen must be 100% clear during playback. No progress lines, no time labels, no icons.
   - REMOTE LOGIC: Standard remote behavior (OK to pause, Left/Right to seek) must remain functional via the Video node, but without any visual feedback on screen.

2. DYNAMIC TOP 10 LOGIC (HomeScene.brs):
   - The feed identifies the Top 10 row with type="ranked". 
   - FIX: In your feed-parsing loop, check if category.type == "ranked".
   - If true, assign "RankedMoviePoster" as the item component for that specific row.

3. RANKED POSTER VISUALS (RankedMoviePoster.xml):
   - Render a massive numeric outline (01, 02, 03) behind the poster.
   - NUMBER STYLE: Use font size 280, bold. Set opacity to 0.15.
   - Focus ring must be strictly #EF4444 (Crate Red).

4. TOP NAVIGATION (Header.xml):
   - Set LabelList 'itemSize' width to [600, 60] to prevent the "THE PUBLIC SQUARE" label from truncating.

OUTPUT FILES:
Please provide corrected source for:
1. components/VideoPlayer.xml (No buttons, transportBarVisible=false)
2. components/VideoPlayer.brs (Clean state management)
3. components/HomeScene.brs (Dynamic ranked lookup)
4. components/RankedMoviePoster.xml (Ghost numbering system)
5. components/Header.xml (Legibility fix)`;

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(MASTER_PROMPT);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 3000);
    };

    const addLog = (msg: string) => {
        setLog(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setIsForging(true);
        setError('');
        setLog([]);
        setFixedZipBlob(null);
        addLog(`INITIALIZING FORGE V4...`);
        try {
            const zip = new JSZip();
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const relativePath = (file as any).webkitRelativePath || file.name;
                if (file.name.startsWith('.') || file.name.includes('__MACOSX')) continue;
                const content = await file.text();
                let finalContent: string | Blob = content;
                
                if (file.name.endsWith('.brs') || file.name.endsWith('.xml') || file.name === 'manifest') {
                    finalContent = content.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\r\n/g, '\n');
                } else {
                    finalContent = file;
                }
                
                let zipPath = relativePath;
                if (zipPath.includes('roku/')) {
                    zipPath = zipPath.split('roku/')[1];
                }
                zip.file(zipPath, finalContent);
            }
            const blob = await zip.generateAsync({ type: 'blob', compression: "DEFLATE" });
            setFixedZipBlob(blob);
            addLog(`FORGE COMPLETE. READY FOR SIGNING.`);
        } catch (err) {
            setError('Forge rejected: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setIsForging(false);
        }
    };

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out] pb-32">
            <div className="bg-[#050505] border border-red-600/20 p-10 md:p-14 rounded-[4rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none rotate-12 scale-150">
                    <h2 className="text-[18rem] font-black italic text-red-600">FORGE</h2>
                </div>
                
                <div className="relative z-10 max-w-5xl space-y-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_#ef4444]"></div>
                            <p className="text-red-500 font-black uppercase tracking-[0.5em] text-[11px]">Hardware UI Reconstruction</p>
                        </div>
                        <h2 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter italic leading-none">The Forge.</h2>
                        <p className="text-2xl text-gray-500 font-medium leading-relaxed max-w-4xl">
                            Eliminate visual clutter. Use this specialized <span className="text-white">Clean Cinema Protocol</span> to remove broken buttons and progress lines from the TV screen.
                        </p>
                    </div>

                    <div className="bg-amber-600/10 border border-amber-500/20 p-8 rounded-[2.5rem] space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest italic">Roku V4 Master Spec</h3>
                            <button 
                                onClick={handleCopyPrompt}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copyStatus ? 'bg-green-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
                            >
                                {copyStatus ? 'Copied ✓' : 'Copy for AI Architect'}
                            </button>
                        </div>
                        <div className="bg-black/60 p-6 rounded-2xl border border-white/5 font-mono text-[10px] text-amber-500 max-h-40 overflow-y-auto leading-relaxed select-all">
                            {MASTER_PROMPT}
                        </div>
                    </div>

                    <div className="bg-cyan-900/10 border border-cyan-500/20 p-8 rounded-[2.5rem] space-y-6">
                         <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest italic">Transcoding Laboratory</h3>
                            <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">FFmpeg Optimization</span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium leading-relaxed">If a video fails to play on Roku hardware, re-encode it using the <strong className="text-white">Hardware Optimized Command</strong>. Requires FFmpeg (via Homebrew).</p>
                        <div className="bg-black/60 p-5 rounded-xl border border-white/5 font-mono text-[10px] text-cyan-400 select-all cursor-pointer group" onClick={() => { navigator.clipboard.writeText('ffmpeg -i input.mp4 -c:v libx264 -profile:v high -level:4.1 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k output_roku.mp4'); alert('Copied'); }}>
                            ffmpeg -i input.mp4 -c:v libx264 -profile:v high -level:4.1 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k output_roku.mp4
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white/5 border-2 border-dashed border-white/10 hover:border-red-600/40 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                        >
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg className="w-10 h-10 text-gray-500 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Select Source Folder</h3>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelection} className="hidden" multiple {...({ webkitdirectory: "", directory: "" } as any)} />
                        </div>

                        <div className="bg-black border border-white/5 rounded-[3rem] p-8 flex flex-col h-[300px] shadow-inner">
                            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-4">Synthesis Log</p>
                            <div className="flex-grow overflow-y-auto font-mono text-[10px] space-y-1 scrollbar-hide text-green-500">
                                {log.length === 0 ? <p className="opacity-20 italic">Awaiting source ingest...</p> : log.map((entry, i) => <p key={i}>{entry}</p>)}
                            </div>
                        </div>
                    </div>

                    {fixedZipBlob && (
                        <div className="flex justify-center pt-8">
                            <button 
                                onClick={() => {
                                    const url = URL.createObjectURL(fixedZipBlob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `cratetv-v4-sanitized.zip`;
                                    a.click();
                                }}
                                className="bg-white text-black font-black px-16 py-6 rounded-2xl uppercase tracking-[0.3em] text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all"
                            >
                                Download Sanitized Build
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {error && <div className="p-8 bg-red-600/10 border border-red-500/20 rounded-3xl text-center text-red-500 font-black uppercase">{error}</div>}
        </div>
    );
};

export default RokuForge;
