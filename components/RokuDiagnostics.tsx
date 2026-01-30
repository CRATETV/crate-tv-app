
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const RokuDiagnostics: React.FC = () => {
    const [url, setUrl] = useState('');
    const [isProbing, setIsProbing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleProbe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        setIsProbing(true);
        setError('');
        setResult(null);

        try {
            const res = await fetch('/api/probe-roku-compatibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    url: url.trim(),
                    password: sessionStorage.getItem('adminPassword')
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Uplink failed.');
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'System scanning failed.');
        } finally {
            setIsProbing(false);
        }
    };

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#050505] border border-red-500/20 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                    <h2 className="text-[12rem] font-black italic text-red-600">PROBE</h2>
                </div>
                
                <div className="relative z-10 max-w-2xl space-y-6">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px]">Roku Hardware Simulator</p>
                    </div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Pre-Flight.</h2>
                    <p className="text-lg text-gray-400 font-medium leading-relaxed">
                        Verify your master files against physical Roku hardware constraints. We test for <span className="text-white font-bold">Byte-Range support</span> and <span className="text-white font-bold">MIME type integrity</span>.
                    </p>
                    
                    <form onSubmit={handleProbe} className="flex gap-4">
                        <input 
                            type="text" 
                            value={url} 
                            onChange={e => setUrl(e.target.value)}
                            placeholder="Paste stream URL (MP4 or HLS)..." 
                            className="form-input !bg-black/60 border-white/10 flex-grow"
                        />
                        <button type="submit" disabled={isProbing} className="bg-red-600 hover:bg-red-700 text-white font-black px-10 py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-xl transition-all">
                            {isProbing ? 'Probing...' : 'Run Scan'}
                        </button>
                    </form>
                </div>
            </div>

            {isProbing && <div className="py-20 flex justify-center"><LoadingSpinner /></div>}
            
            {error && (
                <div className="bg-red-600/10 border border-red-500/20 p-6 rounded-2xl text-center">
                    <p className="text-red-500 font-black uppercase tracking-widest text-xs">{error}</p>
                </div>
            )}

            {result && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-[fadeIn_0.5s_ease-out]">
                    <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] text-center shadow-2xl space-y-4">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Hardware Affinity</p>
                        <p className={`text-7xl font-black italic tracking-tighter ${result.status === 'OPTIMAL' ? 'text-green-500' : result.status === 'WARNING' ? 'text-amber-500' : 'text-red-600'}`}>
                            {result.score}%
                        </p>
                        <p className={`text-xs font-black uppercase tracking-widest ${result.status === 'OPTIMAL' ? 'text-green-600' : 'text-red-500'}`}>{result.status}</p>
                    </div>

                    <div className="md:col-span-2 bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl flex flex-col justify-center space-y-6">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">Diagnostic Findings</h4>
                        {result.findings.length > 0 ? (
                            <ul className="space-y-4">
                                {result.findings.map((f: string, i: number) => (
                                    <li key={i} className="flex gap-4 items-start">
                                        <span className="text-red-600 font-black">!</span>
                                        <p className="text-gray-300 text-sm font-medium leading-relaxed italic">"{f}"</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex gap-4 items-center">
                                <span className="text-green-500 text-xl">✓</span>
                                <p className="text-green-500 font-bold uppercase tracking-widest text-sm">Manifest satisfies all hardware requirements.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RokuDiagnostics;
