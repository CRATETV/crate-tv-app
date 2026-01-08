import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

const RokuDeployTab: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'generating' | 'error'>('idle');
    const [jsonPreview, setJsonPreview] = useState<any>(null);
    const [isFetchingJson, setIsFetchingJson] = useState(false);
    const [error, setError] = useState('');
    const [copyStatus, setCopyStatus] = useState(false);

    const productionUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/roku-feed` : 'https://cratetv.net/api/roku-feed';

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(productionUrl);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
    };

    const fetchJsonPreview = async () => {
        setIsFetchingJson(true);
        try {
            const res = await fetch('/api/roku-feed');
            const data = await res.json();
            setJsonPreview(data);
        } catch (e) {
            setError("Could not retrieve live data manifest.");
        } finally {
            setIsFetchingJson(false);
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
            a.download = 'cratetv-roku-production-v4.zip';
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
            <div className="bg-purple-600/10 border border-purple-500/20 p-10 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="max-w-2xl space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                        <p className="text-purple-500 font-black uppercase tracking-[0.4em] text-[10px]">Infrastructure Node: TV_OS</p>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic">Production Packager.</h2>
                    <p className="text-gray-400 text-lg leading-relaxed font-medium">
                        Generate a verified Roku source package. This ZIP is pre-configured with your live API endpoints and stripped of characters that cause compilation failures.
                    </p>
                </div>
                <button 
                    onClick={handleDownloadZip}
                    disabled={status === 'generating'}
                    className="bg-white text-black font-black px-12 py-6 rounded-2xl uppercase tracking-widest text-sm shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                >
                    {status === 'generating' ? 'Synthesizing...' : 'Download Production ZIP'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* FEED URL SECTION */}
                <div className="bg-[#0a0a0a] border border-white/10 p-10 rounded-[3rem] shadow-2xl space-y-6">
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Global JSON Feed</h3>
                        <p className="text-gray-500 text-sm mt-1">This is the live URL for your Roku Channel Console.</p>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                        <code className="bg-black/60 border border-white/10 p-5 rounded-2xl text-purple-400 font-mono text-xs break-all">
                            {productionUrl}
                        </code>
                        <div className="flex gap-4">
                            <button 
                                onClick={handleCopyUrl}
                                className={`flex-1 px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${copyStatus ? 'bg-green-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white hover:text-black'}`}
                            >
                                {copyStatus ? 'URL Copied ✓' : 'Copy Feed URL'}
                            </button>
                            <button 
                                onClick={fetchJsonPreview}
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-black px-8 py-4 rounded-xl uppercase text-[10px] tracking-widest transition-all shadow-lg"
                            >
                                Inspect Live Data
                            </button>
                        </div>
                    </div>
                </div>

                {/* JSON PREVIEWER */}
                <div className="bg-[#0a0a0a] border border-white/10 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col min-h-[300px]">
                    <div className="mb-4">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Manifest Inspector</h3>
                        <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest">Real-time JSON validation</p>
                    </div>
                    
                    {isFetchingJson ? (
                        <div className="flex-grow flex items-center justify-center"><LoadingSpinner /></div>
                    ) : jsonPreview ? (
                        <div className="flex-grow overflow-auto max-h-[400px] scrollbar-hide">
                            <pre className="text-[10px] font-mono text-green-500 bg-black/40 p-4 rounded-xl">
                                {JSON.stringify(jsonPreview, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center opacity-20 text-center">
                            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7zm0 4h16m-8 4h.01M8 11h.01" /></svg>
                            <p className="text-xs font-black uppercase tracking-widest">Awaiting Uplink</p>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-6 bg-red-600/10 border border-red-500/20 rounded-2xl text-center">
                    <p className="text-red-500 font-black uppercase tracking-widest text-xs">{error}</p>
                </div>
            )}
        </div>
    );
};

export default RokuDeployTab;