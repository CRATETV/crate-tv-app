import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const RokuDeployTab: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'generating' | 'error'>('idle');
    const [error, setError] = useState('');

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
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-purple-600/10 border border-purple-500/20 p-10 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="max-w-2xl space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                        <p className="text-purple-500 font-black uppercase tracking-[0.4em] text-[10px]">Infrastructure Node: TV_OS</p>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic">Production Packager.</h2>
                    <p className="text-gray-400 text-lg leading-relaxed font-medium">
                        Generate a verified, hardened Roku source package. This ZIP is pre-configured with your live API endpoints and stripped of all non-standard characters that cause compilation failures.
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-4">
                    <p className="text-red-500 font-black uppercase tracking-widest text-[9px]">Fix Protocol: &hb9</p>
                    <h3 className="text-xl font-bold text-white uppercase italic">Clean Ingestion</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">We automatically strip the Byte Order Mark (BOM) and normalize line endings to ensure the Roku manifest is 100% compliant with standard SDK rules.</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-4">
                    <p className="text-purple-500 font-black uppercase tracking-widest text-[9px]">Sync Protocol: API_V4</p>
                    <h3 className="text-xl font-bold text-white uppercase italic">Live Binding</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">Your production URL is hard-coded into the Config.brs at the time of download. No manual IP setup is required for the live build.</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-4">
                    <p className="text-green-500 font-black uppercase tracking-widest text-[9px]">Build Protocol: SIGNED</p>
                    <h3 className="text-xl font-bold text-white uppercase italic">Ready to Sign</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">Upload this ZIP to your Roku device in Developer Mode to create the signed .pkg file required for the public store.</p>
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