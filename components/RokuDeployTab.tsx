
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const RokuDeployTab: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'generating' | 'error'>('idle');
    const [error, setError] = useState('');
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

    const productionUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/roku-feed` : 'https://cratetv.net/api/roku-feed';

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
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
            {/* 1. SOURCE PACKAGE */}
            <div className="bg-purple-600/10 border border-purple-500/20 p-10 rounded-[3rem] shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-10">
                <div className="max-w-2xl space-y-4 text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-3">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                        <p className="text-purple-500 font-black uppercase tracking-[0.4em] text-[10px]">Crate TV OS // Roku SDK</p>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic">Source Code.</h2>
                    <p className="text-gray-400 text-lg font-medium leading-relaxed">
                        Download the raw code package. This version is sanitized for the Roku Store and ready for hardware signing.
                    </p>
                </div>
                <button 
                    onClick={handleDownloadZip}
                    disabled={status === 'generating'}
                    className="bg-white text-black font-black px-12 py-6 rounded-2xl uppercase tracking-widest text-sm shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                >
                    {status === 'generating' ? 'Zipping...' : 'Download Roku Source'}
                </button>
            </div>

            {/* 2. SIGNING GUIDE */}
            <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-10">
                <div className="space-y-2">
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Hardware Signing Protocol</h3>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Mandatory for Roku Store Approval</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { step: "01", label: "Dev Mode", desc: "Press Home(3x), Up(2x), R, L, R, L, R on remote. Enable installer and set a dev password." },
                        { step: "02", label: "Sideload", desc: "Go to your Roku IP in browser. Upload the ZIP from above. Install it to your TV." },
                        { step: "03", label: "Package", desc: "Click 'Packager' in the Roku Dev UI. Enter your password to download the signed .pkg file." }
                    ].map(s => (
                        <div key={s.step} className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                            <span className="text-red-600 font-black text-2xl italic">{s.step}</span>
                            <h4 className="text-white font-black uppercase text-sm">{s.label}</h4>
                            <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. FEED ENDPOINT */}
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] shadow-xl space-y-6">
                <div>
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">Production Feed Endpoint</h3>
                    <p className="text-[10px] text-gray-700 uppercase font-black tracking-[0.4em] mt-1">Global Manifest Relay</p>
                </div>
                <div className="bg-black border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 shadow-inner">
                    <code className="flex-grow font-mono text-xs text-purple-400 break-all select-all">{productionUrl}</code>
                    <button 
                        onClick={() => handleCopy(productionUrl, 'url')}
                        className={`whitespace-nowrap px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${copyStatus === 'url' ? 'bg-green-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
                    >
                        {copyStatus === 'url' ? 'Copied ✓' : 'Copy Endpoint'}
                    </button>
                </div>
            </div>

            {error && <p className="text-red-500 font-black uppercase text-center">{error}</p>}
        </div>
    );
};

export default RokuDeployTab;
