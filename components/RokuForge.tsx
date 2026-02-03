
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

    const MASTER_PROMPT = `Act as a World-Class Senior Roku Engineer. Build a production-ready Roku Channel (SceneGraph & BrightScript) for "Crate TV".

INFRASTRUCTURE CONTEXT:
- API Base: https://cratetv.net/api
- Primary Feed: /roku-feed?deviceId=[DEVICE_ID]
- Auth Polling: /roku/poll-auth?device_code_id=[DEVICE_ID]
- Tracking: POST /roku-mark-watched (Form Fields: deviceId, movieKey)

UI REQUIREMENTS (STUDIO V4 AESTHETIC):
- Color Palette: Background #050505, Primary #EF4444 (Crate Red).
- Resolution: FHD (1920x1080).
- Components Needed: 
  1. HomeScene: 16:9 Hero Carousel + RowList.
  2. RowList Styles: 'Standard' (2:3 posters) and 'Ranked' (Netflix-style massive numbers).
  3. DetailsScene: LargeArt, Synopsis, Cast list, "Play" button, and "Watchlist" toggle.
  4. VideoPlayer: Full HLS/MP4 support with Bookmark/Resume logic.

LOGIC REQUIREMENTS:
- DEVICE AUTH: On first launch, generate a unique ID using 'CreateObject("roDeviceInfo").GetChannelClientId()'. 
- LINKING: If user is not linked, show AccountLinkScene which displays a code from '/get-roku-link-code'. Poll '/roku/poll-auth' every 5s.
- PAYWALL: Check 'isUnlocked' property in the movie JSON. If false, disable the Play button and show a "Scan to Unlock" QR code pointing to 'purchaseUrl'.
- WATCH PARTY SYNC: If a movie has 'actualStartTime', calculate the seek offset by comparing current time to the epoch to ensure global synchronization.

BRIGHTSCRIPT BEST PRACTICES:
- Use 'Invalid' checks for all JSON nodes.
- Use Task nodes for all network requests to prevent UI thread blocking.
- Handle Remote Control keys (Back, Play, Options) gracefully.

Please output the code for:
1. source/Main.brs (Entry point & Registry check)
2. source/Config.brs (Global constants)
3. components/ContentTask.brs (JSON Parser)
4. components/HomeScene.xml/brs (Main UI)
5. components/VideoPlayer.xml/brs (Playback engine)`;

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(MASTER_PROMPT);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 3000);
    };

    const addLog = (msg: string) => {
        setLog(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const sanitizeContent = (content: string, fileName: string): string => {
        let clean = content.replace(/^\uFEFF/, ''); 
        clean = clean.replace(/[\u200B-\u200D\uFEFF]/g, ''); 
        clean = clean.replace(/\r\n/g, '\n'); 
        if (fileName.endsWith('.brs') && !clean.startsWith("'")) {
            clean = "' [SANITIZED_BY_CRATE_FORGE]\n" + clean;
        }
        if (fileName === 'Config.brs') {
            const host = window.location.host;
            const protocol = window.location.protocol;
            const apiUrl = `${protocol}//${host}/api`;
            clean = clean.replace('API_URL_PLACEHOLDER', apiUrl);
        }
        return clean;
    };

    const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setIsForging(true);
        setError('');
        setLog([]);
        setFixedZipBlob(null);
        addLog(`INITIALIZING LOCAL SYNTHESIS...`);
        try {
            const zip = new JSZip();
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const relativePath = (file as any).webkitRelativePath || file.name;
                if (file.name.startsWith('.') || file.name.includes('__MACOSX')) continue;
                const content = await file.text();
                let finalContent: string | Blob = content;
                if (file.name.endsWith('.brs') || file.name.endsWith('.xml') || file.name === 'manifest') {
                    finalContent = sanitizeContent(content, file.name);
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
            addLog(`SYNTHESIS COMPLETE.`);
        } catch (err) {
            setError('Synthesis rejected: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
                            <p className="text-red-500 font-black uppercase tracking-[0.5em] text-[11px]">Direct Hardware Sanitizer</p>
                        </div>
                        <h2 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter italic leading-none">The Forge.</h2>
                        <p className="text-2xl text-gray-500 font-medium leading-relaxed max-w-4xl">
                            Standardize your BrightScript nodes. Use the prompt below to generate full logic with <span className="text-white">Claude or Gemini</span>.
                        </p>
                    </div>

                    <div className="bg-amber-600/10 border border-amber-500/20 p-8 rounded-[2.5rem] space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest italic">Roku Master Prompt</h3>
                            <button 
                                onClick={handleCopyPrompt}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copyStatus ? 'bg-green-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
                            >
                                {copyStatus ? 'Copied ✓' : 'Copy for Claude'}
                            </button>
                        </div>
                        <div className="bg-black/60 p-6 rounded-2xl border border-white/5 font-mono text-[10px] text-amber-500 max-h-40 overflow-y-auto leading-relaxed select-all">
                            {MASTER_PROMPT}
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
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Select Source</h3>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelection} className="hidden" multiple {...({ webkitdirectory: "", directory: "" } as any)} />
                        </div>

                        <div className="bg-black border border-white/5 rounded-[3rem] p-8 flex flex-col h-[300px] shadow-inner">
                            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-4">Synthesis Log</p>
                            <div className="flex-grow overflow-y-auto font-mono text-[10px] space-y-1 scrollbar-hide text-green-500">
                                {log.length === 0 ? <p className="opacity-20 italic">Awaiting node selection...</p> : log.map((entry, i) => <p key={i}>{entry}</p>)}
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
                                    a.download = `cratetv-direct-build.zip`;
                                    a.click();
                                }}
                                className="bg-white text-black font-black px-16 py-6 rounded-2xl uppercase tracking-[0.3em] text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all"
                            >
                                Download Fixed Build
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
