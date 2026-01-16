
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
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate production package.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cratetv-production-source-v4.zip`;
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
            {/* Header Section */}
            <div className="bg-purple-600/10 border border-purple-500/20 p-10 rounded-[3rem] shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-10">
                <div className="max-w-2xl space-y-4 text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-3">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_#a855f7]"></span>
                        <p className="text-purple-500 font-black uppercase tracking-[0.4em] text-[10px]">Crate TV OS // Roku SDK</p>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic">Source Packager.</h2>
                    <p className="text-gray-400 text-lg leading-relaxed font-medium">
                        Download a fully-configured, production-ready Roku source ZIP. This package is stripped of compilation artifacts and pre-bound to your live API infrastructure.
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
                                Synthesizing...
                            </>
                        ) : 'Download Production ZIP'}
                    </button>
                    <p className="text-[9px] text-gray-600 text-center font-black uppercase tracking-widest">Target: {window.location.host}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* PRE-FLIGHT DIAGNOSTICS */}
                <div className="bg-[#0a0a0a] border border-white/10 p-10 rounded-[3rem] shadow-2xl space-y-8 flex flex-col">
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Pre-Flight Diagnostic</h3>
                        <p className="text-gray-500 text-sm mt-1 uppercase font-bold">Verifying infrastructure readiness</p>
                    </div>
                    
                    <div className="flex-grow flex flex-col justify-center space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${diagStatus === 'passed' ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                                <span className="text-[8px] font-black text-gray-500 uppercase">Live JSON Feed</span>
                                <span className={`text-xs font-bold ${diagStatus === 'passed' ? 'text-green-500' : 'text-gray-400'}`}>{diagStatus === 'passed' ? 'NOMINAL' : 'AWAITING'}</span>
                            </div>
                            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${diagStatus === 'passed' ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                                <span className="text-[8px] font-black text-gray-500 uppercase">Manifest Integrity</span>
                                <span className={`text-xs font-bold ${diagStatus === 'passed' ? 'text-green-500' : 'text-gray-400'}`}>{diagStatus === 'passed' ? 'VERIFIED' : 'AWAITING'}</span>
                            </div>
                        </div>

                        <button 
                            onClick={runPreFlightDiagnostic}
                            disabled={diagStatus === 'checking'}
                            className="w-full bg-purple-600/10 hover:bg-purple-600 border border-purple-500/20 text-purple-400 hover:text-white font-black py-4 rounded-xl uppercase text-[10px] tracking-widest transition-all"
                        >
                            {diagStatus === 'checking' ? 'Running Diagnostic...' : 'Execute Pre-Flight Check'}
                        </button>
                    </div>
                </div>

                {/* PUBLISHING ROADMAP */}
                <div className="bg-[#0a0a0a] border border-white/10 p-10 rounded-[3rem] shadow-2xl space-y-6">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Publishing Workflow</h3>
                    <div className="space-y-4">
                        {[
                            { step: "01", label: "Sideload ZIP to your Developer Roku device via its IP address." },
                            { step: "02", label: "Use the Roku 'Packager' utility to generate a signed .pkg file." },
                            { step: "03", label: "Upload the signed .pkg to the Roku Developer Dashboard." },
                            { step: "04", label: "Set the Feed URL below as your channel's primary content source." }
                        ].map(s => (
                            <div key={s.step} className="flex gap-4 group">
                                <span className="text-purple-500 font-black text-sm italic">{s.step}</span>
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
                        <p className="text-[10px] text-gray-700 uppercase font-black tracking-[0.4em] mt-1">Provide this to the Roku Developer Console</p>
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
