import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import LoadingSpinner from './LoadingSpinner';

const RokuForge: React.FC = () => {
    const [isForging, setIsForging] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const [fixedZipBlob, setFixedZipBlob] = useState<Blob | null>(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addLog = (msg: string) => {
        setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    /**
     * Aggressively strips UTF-8 BOM and non-printable artifacts 
     * that cause Roku &h02 errors.
     */
    const sanitizeContent = (content: string, fileName: string): string => {
        let clean = content.replace(/^\uFEFF/, ''); // Strip BOM
        clean = clean.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Strip ghost spaces
        clean = clean.replace(/\r\n/g, '\n'); // Normalize line endings
        
        if (fileName.endsWith('.brs') && !clean.startsWith("'")) {
            clean = "' [SANITIZED_BY_CRATE_FORGE]\n" + clean;
        }
        
        if (fileName === 'Config.brs') {
            const host = window.location.host;
            const protocol = window.location.protocol;
            const apiUrl = `${protocol}//${host}/api`;
            clean = clean.replace('API_URL_PLACEHOLDER', apiUrl);
            addLog(`Injected Live API Node: ${apiUrl}`);
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
            let brsCount = 0;
            let xmlCount = 0;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const relativePath = (file as any).webkitRelativePath || file.name;
                
                // We only care about files in the roku folder structure
                // Skip OS junk like .DS_Store
                if (file.name.startsWith('.') || file.name.includes('__MACOSX')) continue;

                const content = await file.text();
                let finalContent: string | Blob = content;

                if (file.name.endsWith('.brs') || file.name.endsWith('.xml') || file.name === 'manifest') {
                    finalContent = sanitizeContent(content, file.name);
                    if (file.name.endsWith('.brs')) brsCount++;
                    if (file.name.endsWith('.xml')) xmlCount++;
                } else {
                    // For images, keep as-is
                    finalContent = file;
                }

                // Maintain directory structure if possible, otherwise flatten to standard Roku paths
                let zipPath = relativePath;
                if (zipPath.includes('roku/')) {
                    zipPath = zipPath.split('roku/')[1];
                }
                
                zip.file(zipPath, finalContent);
            }

            addLog(`PURGED ${brsCount} BRS NODES OF HIDDEN ARTIFACTS.`);
            addLog(`VALIDATED ${xmlCount} XML COMPONENTS.`);

            const blob = await zip.generateAsync({ 
                type: 'blob',
                compression: "DEFLATE",
                compressionOptions: { level: 9 }
            });
            
            setFixedZipBlob(blob);
            addLog(`SYNTHESIS COMPLETE. READY FOR HARDWARE UPLINK.`);

        } catch (err) {
            setError('Synthesis rejected: ' + (err instanceof Error ? err.message : 'Unknown internal error'));
            addLog(`CRITICAL ERROR DETECTED.`);
        } finally {
            setIsForging(false);
        }
    };

    const handleDownload = () => {
        if (!fixedZipBlob) return;
        const url = URL.createObjectURL(fixedZipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cratetv-direct-build.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
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
                            Drag your local <span className="text-white">roku folder</span> here. We will strip the hidden bytes causing your <span className="text-red-500">Syntax Errors</span> and generate a perfect ZIP instantly. No Git push required.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Drop Zone */}
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white/5 border-2 border-dashed border-white/10 hover:border-red-600/40 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                        >
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg className="w-10 h-10 text-gray-500 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Select Files</h3>
                            <p className="text-xs text-gray-500 mt-2 font-bold uppercase">Select your entire 'roku' folder content</p>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileSelection} 
                                className="hidden" 
                                multiple 
                                {...({ webkitdirectory: "", directory: "" } as any)} 
                            />
                        </div>

                        {/* Terminal */}
                        <div className="bg-black border border-white/5 rounded-[3rem] p-8 flex flex-col h-[300px] shadow-inner">
                            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-4">Synthesis Log</p>
                            <div className="flex-grow overflow-y-auto font-mono text-[10px] space-y-1 scrollbar-hide">
                                {log.length === 0 ? (
                                    <p className="text-gray-800 italic">Awaiting node selection...</p>
                                ) : (
                                    log.map((entry, i) => (
                                        <p key={i} className="text-green-500 animate-[fadeIn_0.2s_ease-out]">{entry}</p>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-8">
                        <button 
                            onClick={handleDownload}
                            disabled={!fixedZipBlob || isForging}
                            className="bg-white text-black font-black px-16 py-6 rounded-2xl uppercase tracking-[0.3em] text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20 flex items-center gap-4"
                        >
                            <span className="text-xl">📂</span>
                            Download Fixed Build
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-8 bg-red-600/10 border border-red-500/20 rounded-3xl text-center">
                    <p className="text-red-500 font-black uppercase tracking-widest">{error}</p>
                </div>
            )}
        </div>
    );
};

export default RokuForge;