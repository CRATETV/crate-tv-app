
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const RokuDiagnostics: React.FC = () => {
    const [logInput, setLogInput] = useState('');
    const [analysis, setAnalysis] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalyzeLogs = async () => {
        setIsAnalyzing(true);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/analyze-roku-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, logs: logInput }),
            });
            const data = await res.json();
            setAnalysis(data.analysis);
        } catch (e) {
            alert("Analysis uplink failed.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#050505] border border-red-600/20 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                    <h2 className="text-[12rem] font-black italic text-red-600">DEBUG</h2>
                </div>
                
                <div className="relative z-10 max-w-4xl space-y-6">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px]">Roku Hardware Debugger</p>
                    </div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Telnet Interpreter.</h2>
                    <p className="text-lg text-gray-400 font-medium leading-relaxed">
                        Paste your console output from <span className="text-white font-mono">telnet [IP] 8085</span>. Crate AI will identify the line of code causing the crash.
                    </p>
                    
                    <textarea 
                        value={logInput}
                        onChange={(e) => setLogInput(e.target.value)}
                        placeholder="Paste Telnet logs here..."
                        className="w-full h-48 bg-black/60 border border-white/10 rounded-2xl p-6 text-[10px] font-mono text-green-500 focus:border-red-600 outline-none transition-all"
                    />

                    <button 
                        onClick={handleAnalyzeLogs}
                        disabled={isAnalyzing || !logInput}
                        className="bg-red-600 hover:bg-red-700 text-white font-black px-10 py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-xl transition-all disabled:opacity-20"
                    >
                        {isAnalyzing ? 'Analyzing Stack Trace...' : 'Identify Error Source'}
                    </button>
                </div>
            </div>

            {analysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-[fadeIn_0.5s_ease-out]">
                    <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-6">
                        <h3 className="text-xl font-black text-white uppercase italic">Root Cause</h3>
                        <p className="text-gray-300 font-medium leading-relaxed">{analysis.summary}</p>
                        <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-xl">
                            <p className="text-[10px] font-black text-red-500 uppercase mb-1">Faulty Line</p>
                            <code className="text-white text-xs">{analysis.faultyLine}</code>
                        </div>
                    </div>

                    <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-6">
                        <h3 className="text-xl font-black text-white uppercase italic">Suggested Fix</h3>
                        <pre className="bg-black p-6 rounded-2xl text-xs text-indigo-400 font-mono overflow-x-auto">
                            {analysis.codeFix}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RokuDiagnostics;
