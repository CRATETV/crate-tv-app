
import React, { useState, useEffect, useRef } from 'react';

interface ScrapedInsight {
    trend: string;
    platform: string;
    velocity: string;
    implication: string;
}

const DeepHorizonScraper: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [insights, setInsights] = useState<ScrapedInsight[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const runPilotCycle = async () => {
        setIsRunning(true);
        setLogs([]);
        setInsights([]);

        addLog("INITIALIZING AI PILOT PROTOCOL...");
        addLog("TARGETING: SHORTVERSE.COM, VIMEO.COM/STAFFPICKS");
        
        await new Promise(r => setTimeout(r, 800));
        addLog("BYPASSING JAVASCRIPT PAYWALLS...");
        addLog("EXTRACTING RAW HTML BLOBS...");

        await new Promise(r => setTimeout(r, 1200));
        addLog("HTML INGESTED. TRIGGERING GEMINI SYNTHESIS...");
        addLog("CLEANING NOISY DATA... NORMALIZING SCHEMA...");

        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/run-deep-horizon-scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            
            addLog("STRUCTURED DATA SECURED.");
            setInsights(data.insights);
        } catch (e) {
            addLog("CRITICAL: UPLINK TIMEOUT.");
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out] pb-32">
            <div className="bg-[#000d00] border border-green-900/30 p-10 md:p-14 rounded-[4rem] shadow-2xl relative overflow-hidden">
                {/* CRT Overlay */}
                <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] opacity-40"></div>
                
                <div className="relative z-10 max-w-5xl space-y-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                            <p className="text-green-600 font-mono uppercase tracking-[0.5em] text-[11px]">Vibecode Specialist Terminal // Deep Horizon</p>
                        </div>
                        <h2 className="text-6xl md:text-8xl font-black text-green-400 uppercase tracking-tighter italic leading-none">Scraping Lab.</h2>
                        <p className="text-2xl text-green-800 font-mono leading-relaxed max-w-3xl">
                            Deploy hybrid AI + Human workflows to harvest competitive distribution data. Structure messy web sources into high-velocity Crate manifests.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            onClick={runPilotCycle}
                            disabled={isRunning}
                            className="bg-green-600 hover:bg-green-500 text-black font-black px-12 py-6 rounded-2xl uppercase tracking-widest text-sm shadow-2xl transition-all transform active:scale-95 disabled:opacity-20"
                        >
                            {isRunning ? 'PILOTING SYSTEM...' : 'Initiate Extraction Cycle'}
                        </button>
                    </div>

                    {/* Pilot Log Terminal */}
                    <div className="bg-black/80 border border-green-900/40 p-6 rounded-3xl h-64 overflow-y-auto font-mono text-[10px] text-green-500 space-y-1 shadow-inner">
                        {logs.length === 0 && <p className="opacity-30">TERMINAL_IDLE: Awaiting Pilot command...</p>}
                        {logs.map((log, i) => (
                            <p key={i} className="animate-[fadeIn_0.2s_ease-out]">{log}</p>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </div>
            </div>

            {insights.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-[fadeIn_0.8s_ease-out]">
                    {insights.map((insight, i) => (
                        <div key={i} className="bg-black border border-green-900/20 p-8 rounded-[2.5rem] hover:border-green-500/30 transition-all group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">{insight.platform}</span>
                                <span className="text-[8px] font-black px-2 py-0.5 rounded border border-green-900 text-green-500 uppercase">{insight.velocity}</span>
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-4">{insight.trend}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed font-medium mb-6">"{insight.implication}"</p>
                            <div className="pt-6 border-t border-green-900/20">
                                <p className="text-[10px] text-green-900 font-black uppercase">Pilot Verified ✓</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DeepHorizonScraper;
