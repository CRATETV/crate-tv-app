
import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

const RokuDeployTab: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'generating' | 'error'>('idle');
    const [diagStatus, setDiagStatus] = useState<'idle' | 'checking' | 'passed' | 'failed'>('idle');
    const [error, setError] = useState('');
    const [copyStatus, setCopyStatus] = useState(false);

    const productionUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/roku-feed` : 'https://cratetv.net/api/roku-feed';

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(productionUrl);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
    };

    const runPreFlightDiagnostic = async () => {
        setDiagStatus('checking');
        try {
            const res = await fetch('/api/get-live-data?t=' + Date.now());
            if (res.ok) {
                const data = await res.json();
                if (data.movies && Object.keys(data.movies).length > 0) {
                    setDiagStatus('passed');
                } else {
                    throw new Error("Empty Catalog Manifest");
                }
            } else {
                throw new Error("Feed Node Offline");
            }
        } catch (e) {
            setDiagStatus('failed');
            setError("Diagnostic failed: " + (e instanceof Error ? e.message : "API Unreachable"));
        }
    };

    const handleDownloadZip = async () => {
        setStatus('generating');
        setError('');
        const password = sessionStorage.getItem('adminPassword');

        try {
            const response = await fetch('/api/generate-roku-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate production package.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cratetv-source-v4.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setStatus('idle');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setStatus('error');
        }
    };

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out] pb-24">
            {/* Project Integrity Alert */}
            <div className="bg-[#0f0f0f] border border-red-500/20 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/30">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Fixing "Invalid Package" Errors</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Ghost Code Detected</p>
                        <p className="text-sm text-gray-400 leading-relaxed font-medium">
                            The "ghost codes" you've seen are likely <strong>invisible Unicode characters</strong> (like Zero-Width Spaces) created when copying code from certain editors.
                        </p>
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                            <p className="text-[9px] font-bold text-green-500 uppercase">Automatic Fix Applied:</p>
                            <p className="text-xs text-gray-500 mt-1 italic">Our packager now deep-cleans all .brs and .xml files to strip these artifacts during the ZIP creation process.</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Manifest Integrity</p>
                        <ul className="text-xs text-gray-400 space-y-2 list-disc list-inside">
                            <li>Ensure your <code className="text-white">/roku</code> folder contains a file named <code className="text-white">manifest</code>.</li>
                            <li>The manifest MUST NOT have a file extension (e.g. .txt).</li>
                            <li>It must contain <code className="text-white">major_version=1</code> and <code className="text-white">minor_version=0</code>.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Header Section */}
            <div className="bg-purple-600/10 border border-purple-500/20 p-10 rounded-[3rem] shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-10">
                <div className="max-w-2xl space-y-4 text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-3">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_#a855f7]"></span>
                        <p className="text-purple-500 font-black uppercase tracking-[0.4em] text-[10px]">Crate TV OS // Roku SDK</p>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic">Step 1: Source.</h2>
                    <p className="text-gray-400 text-lg leading-relaxed font-medium">
                        Download the raw code package. This version features a <strong>Deep Purge</strong> of invisible characters that cause sideload crashes.
                    </p>
                </div>
                <div className="flex flex-col gap-4 w-full lg:w-auto">
                    <button 
                        onClick={handleDownloadZip}
                        disabled={status === 'generating'}
                        className="bg-white text-black font-black px-12 py-6 rounded-2xl uppercase tracking-widest text-sm shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                    >
                        {status === 'generating' ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                Scrubbing Code...
                            </>
                        ) : 'Download Clean ZIP'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* THE SIGNING STATION */}
                <div className="bg-[#0a0a0a] border border-white/10 p-10 rounded-[3rem] shadow-2xl space-y-8 flex flex-col border-l-4 border-l-purple-500">
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Step 2: The Signing Station</h3>
                        <p className="text-gray-500 text-sm mt-1 uppercase font-bold">Turning code into a store-ready App</p>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">A. Access the Forge</p>
                            <p className="text-sm text-gray-300">Open your Roku's IP address in Chrome (e.g. <code className="text-purple-400">http://192.168.1.5</code>). Login with your developer credentials.</p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">B. Sideload Source</p>
                            <p className="text-sm text-gray-300">Upload the cleaned ZIP from Step 1. Your TV will attempt to launch the app instantly.</p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">C. Generate .PKG</p>
                            <p className="text-sm text-gray-300">On that same webpage, click <strong className="text-white">"Packager"</strong>. Enter your Dev Password. It will give you a <strong className="text-green-500">Signed .pkg</strong> file.</p>
                        </div>
                    </div>
                </div>

                {/* PUBLISHING ROADMAP */}
                <div className="bg-[#0a0a0a] border border-white/10 p-10 rounded-[3rem] shadow-2xl space-y-8 flex flex-col border-l-4 border-l-red-600">
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Step 3: Distribution</h3>
                        <p className="text-gray-500 text-sm mt-1 uppercase font-bold">Uploading to the Global Store</p>
                    </div>
                    <div className="space-y-4">
                        {[
                            { step: "01", label: "Open the Roku Developer Dashboard." },
                            { step: "02", label: "Navigate to 'Package Upload' in your channel settings." },
                            { step: "03", label: "Upload the SIGNED .PKG file (Not the ZIP)." },
                            { step: "04", label: "Provide the Feed URL below to sync your catalog." }
                        ].map(s => (
                            <div key={s.step} className="flex gap-4 group">
                                <span className="text-red-600 font-black text-sm italic">{s.step}</span>
                                <p className="text-gray-400 text-xs font-medium leading-relaxed group-hover:text-white transition-colors">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* LIVE FEED URL */}
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] shadow-xl space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">Universal Feed Endpoint</h3>
                        <p className="text-[10px] text-gray-700 uppercase font-black tracking-[0.4em] mt-1">Provide this to Roku to link your library 'As Is'</p>
                    </div>
                </div>
                <div className="bg-black border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 shadow-inner">
                    <code className="flex-grow font-mono text-xs text-purple-400 break-all select-all">{productionUrl}</code>
                    <button 
                        onClick={handleCopyUrl}
                        className={`whitespace-nowrap px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${copyStatus ? 'bg-green-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
                    >
                        {copyStatus ? 'Copied ✓' : 'Copy Endpoint'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-6 bg-red-600/10 border border-red-500/20 rounded-2xl text-center animate-shake">
                    <p className="text-red-500 font-black uppercase tracking-widest text-xs">{error}</p>
                </div>
            )}
        </div>
    );
};

export default RokuDeployTab;
