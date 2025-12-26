import React, { useState, useEffect } from 'react';
import { useFestival } from '../contexts/FestivalContext';
import LoadingSpinner from './LoadingSpinner';
import { Movie } from '../types';

const TerminalStat: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-green-500' }) => (
    <div className="border border-green-900/30 p-4 bg-black">
        <p className="text-[10px] font-mono text-green-700 uppercase tracking-widest mb-1">{" >> "} {label}</p>
        <p className={`text-2xl font-mono ${color} tracking-tighter`}>{value}</p>
    </div>
);

const IndustryPortalView: React.FC = () => {
    const { movies, isLoading } = useFestival();
    const [stats, setStats] = useState<any[]>([]);

    useEffect(() => {
        // Build mock distribution metrics for the Bento Box
        const filmData = (Object.values(movies) as Movie[]).map(m => ({
            id: m.key,
            title: m.title,
            director: m.director,
            retention: Math.floor(Math.random() * 20) + 70 + '%',
            growth: '+' + (Math.random() * 15).toFixed(1) + '%',
            market: Math.random() > 0.5 ? 'NA/EU' : 'ASIA/LATAM',
            score: Math.floor(Math.random() * 30) + 65
        })).sort((a,b) => b.score - a.score);
        setStats(filmData);
    }, [movies]);

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="bg-[#000d00] min-h-screen font-mono p-8 text-green-500 relative overflow-hidden rounded-3xl border border-green-900/30">
            {/* Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20"></div>
            
            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                <div className="flex justify-between items-end border-b border-green-900 pb-6">
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter text-green-400">Industry Discovery Terminal</h1>
                        <p className="text-xs text-green-800 mt-2 tracking-[0.3em]">ENCRYPTED ACCESS // PRO_DISTRIBUTION_V1.0</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-green-900 uppercase">Status: Live Feed</p>
                        <p className="text-sm font-bold text-green-600">{new Date().toLocaleTimeString()}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <TerminalStat label="Active Screeners" value={Object.keys(movies).length.toString()} />
                    <TerminalStat label="Aggregated Retention" value="84.2%" />
                    <TerminalStat label="Market Reach" value="Global" />
                    <TerminalStat label="Talent Velocity" value="+22.4%" color="text-amber-500" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Bento Box: Top Talent Feed */}
                    <div className="lg:col-span-2 border border-green-900/50 bg-black/40 p-6 rounded shadow-[0_0_50px_rgba(0,50,0,0.1)]">
                        <h2 className="text-sm font-black uppercase tracking-[0.4em] mb-6 text-green-200 border-b border-green-900/30 pb-2">High-Velocity Talent</h2>
                        <div className="space-y-1">
                            <div className="grid grid-cols-6 text-[10px] uppercase font-black text-green-900 p-2">
                                <span className="col-span-2">Project/Director</span>
                                <span>Retention</span>
                                <span>MoM Growth</span>
                                <span>Market</span>
                                <span className="text-right">Score</span>
                            </div>
                            {stats.map(s => (
                                <div key={s.id} className="grid grid-cols-6 items-center p-3 border border-green-900/10 hover:bg-green-900/10 transition-colors cursor-crosshair">
                                    <div className="col-span-2">
                                        <p className="text-sm font-bold text-green-400 truncate uppercase">{s.title}</p>
                                        <p className="text-[9px] text-green-700 uppercase">Dir. {s.director}</p>
                                    </div>
                                    <span className="text-xs">{s.retention}</span>
                                    <span className="text-xs text-green-300">{s.growth}</span>
                                    <span className="text-xs text-green-700">{s.market}</span>
                                    <span className="text-right font-black text-green-400">{s.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="border border-green-900/50 bg-black p-6 rounded">
                            <h3 className="text-[10px] font-black uppercase mb-4 text-green-800">Telemetry Alerts</h3>
                            <div className="space-y-4">
                                <div className="p-3 bg-green-900/10 border-l-2 border-green-500">
                                    <p className="text-[10px] font-bold">ANOMALY DETECTED</p>
                                    <p className="text-[11px] text-green-700 mt-1">High "Re-Watch" co-efficient detected for Director: Michael Dwayne Paylor.</p>
                                </div>
                                <div className="p-3 bg-amber-900/10 border-l-2 border-amber-500 text-amber-500">
                                    <p className="text-[10px] font-bold">MARKET OPPORTUNITY</p>
                                    <p className="text-[11px] text-amber-700 mt-1">"Juniper" is trending with 18-24 demographic in NA.</p>
                                </div>
                            </div>
                        </div>

                        <div className="border border-green-900/50 bg-black p-6 rounded flex flex-col gap-4">
                             <button className="w-full bg-green-600/10 hover:bg-green-600/20 text-green-500 border border-green-500/30 p-4 text-[10px] font-black uppercase tracking-widest transition-all">Export Distribution Deck (PDF)</button>
                             <button className="w-full bg-green-600 text-black p-4 text-[10px] font-black uppercase tracking-widest hover:bg-green-400 transition-all">Direct Messaging Interface</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IndustryPortalView;