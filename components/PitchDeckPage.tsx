import React, { useState, useEffect, useMemo } from 'react';
import { useFestival } from '../contexts/FestivalContext';

const Slide: React.FC<{ 
    children: React.ReactNode; 
    dark?: boolean; 
    title?: string; 
    subtitle?: string;
    gradient?: string;
    targetCompany?: string;
    slideNumber?: string;
}> = ({ children, dark = true, title, subtitle, gradient, targetCompany = 'LIFT LABS', slideNumber }) => (
    <section className={`pitch-slide w-full min-h-[100vh] flex flex-col p-8 md:p-24 relative overflow-hidden break-after-page ${gradient ? gradient : (dark ? 'bg-[#050505] text-white' : 'bg-white text-black')}`}>
        {/* Cinematic Texture Layers */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {/* Dynamic Watermark Engine */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.02] rotate-[-25deg] select-none whitespace-nowrap">
            <span className="text-[280px] font-black uppercase leading-none">{targetCompany.toUpperCase()} // STRATEGIC</span>
        </div>

        <div className="flex justify-between items-start mb-16 relative z-10">
            <div className="flex items-center gap-10">
                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate" className={`w-32 h-auto ${!dark && 'invert'}`} />
                <div className="h-10 w-px bg-white/10"></div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">PARTNER ADVISORY // SECURE</p>
                    <p className="text-[8px] font-bold text-red-600 uppercase tracking-widest mt-1">INTERNAL ASSET // PRE-VETTING PHASE</p>
                </div>
            </div>
            {slideNumber && (
                <div className="text-right">
                    <span className="text-6xl font-black opacity-10 italic">{slideNumber}</span>
                </div>
            )}
        </div>
        
        <div className="flex-grow flex flex-col justify-center relative z-10 max-w-7xl">
            {title && (
                <div className="mb-16">
                    <h2 className="text-6xl md:text-[9rem] font-black uppercase tracking-tighter leading-[0.8] animate-[fadeIn_0.8s_ease-out] italic italic-text">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-red-500 font-black uppercase tracking-[0.6em] text-base mt-8 animate-[fadeIn_1s_ease-out] bg-red-600/10 py-3 px-6 rounded-xl w-max border border-red-500/20 shadow-2xl">
                            {subtitle}
                        </p>
                    )}
                </div>
            )}
            <div className="animate-[fadeIn_1.2s_ease-out]">
                {children}
            </div>
        </div>

        <div className="flex justify-between items-end mt-16 text-[10px] font-black uppercase tracking-[0.4em] text-white/20 border-t border-white/5 pt-8 relative z-10">
            <div className="flex gap-12">
                <span>TERMINAL_SESSION // 0X5521</span>
                <span>LATENCY: 14MS</span>
            </div>
            <span>© 2025 CRATE TV INFRASTRUCTURE // GLOBAL CORE</span>
        </div>
    </section>
);

const MetricCard: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
    <div className="bg-white/[0.03] border border-white/10 p-12 rounded-[3.5rem] space-y-6 backdrop-blur-3xl shadow-2xl group hover:bg-white/[0.05] transition-all">
        <p className="text-[11px] font-black text-red-500 uppercase tracking-[0.5em]">{label}</p>
        <p className="text-8xl font-black tracking-tighter text-white italic">{value}</p>
        <p className="text-sm text-gray-500 font-bold uppercase tracking-widest leading-relaxed">{sub}</p>
    </div>
);

const PitchDeckPage: React.FC = () => {
    const { settings } = useFestival();
    const [showHandshake, setShowHandshake] = useState(true);

    const target = useMemo(() => {
        if (typeof window === 'undefined') return 'LIFT LABS';
        const params = new URLSearchParams(window.location.search);
        return params.get('for') || params.get('company') || settings.pitchTargetCompany || 'LIFT LABS';
    }, [settings.pitchTargetCompany]);

    useEffect(() => {
        const timer = setTimeout(() => setShowHandshake(false), 2400);
        return () => clearTimeout(timer);
    }, []);

    if (showHandshake) {
        return (
            <div className="fixed inset-0 bg-[#050505] flex flex-col items-center justify-center z-[1000] p-8 text-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.12)_0%,transparent_70%)]"></div>
                <div className="w-40 h-40 mb-16 relative">
                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-full h-full object-contain animate-pulse" alt="Crate" />
                </div>
                <h2 className="text-white font-black uppercase tracking-[1em] text-sm mb-6">Securing Strategy Session</h2>
                <p className="text-red-600 font-black uppercase text-xl tracking-[0.2em] animate-bounce">
                    IDENTIFIED: {target.toUpperCase()}
                </p>
                <div className="absolute bottom-24 w-80 h-px bg-white/5 overflow-hidden">
                    <div className="h-full bg-red-600 w-1/3 animate-[loading_1.5s_infinite]"></div>
                </div>
                <style>{`
                    @keyframes loading {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(200%); }
                    }
                    .italic-text { font-style: italic; }
                `}</style>
            </div>
        );
    }

    return (
        <div className="bg-black min-h-screen selection:bg-red-600 selection:text-white scroll-smooth overflow-x-hidden">
            <div className="no-print fixed top-10 right-10 z-[100] flex gap-6">
                <button onClick={() => window.print()} className="bg-red-600 text-white font-black px-10 py-5 rounded-2xl text-[11px] uppercase tracking-widest shadow-[0_25px_60px_rgba(239,68,68,0.4)] hover:bg-red-500 transition-all hover:scale-105 active:scale-95">Generate Audit Brief</button>
                <button onClick={() => window.history.back()} className="bg-white/10 backdrop-blur-xl text-white font-black px-10 py-5 rounded-2xl text-[11px] uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all">Close Terminal</button>
            </div>

            {/* SLIDE 1: PRESTIGE COVER */}
            <Slide slideNumber="01" targetCompany={target} title="Home of the Unseen." subtitle="Crate TV: Strategic Yield 2025" gradient="bg-gradient-to-br from-[#0a0a0a] via-[#050505] to-red-950/20">
                <div className="max-w-5xl space-y-16">
                    <p className="text-4xl md:text-7xl text-gray-200 font-black leading-[0.95] tracking-tight uppercase">
                        Architecting the <span className="text-white italic underline decoration-red-600 underline-offset-[12px]">High-Density</span> distribution bridge for world-class independent cinema.
                    </p>
                    {settings.pitchDeckCustomMessage && (
                        <div className="bg-white/5 p-8 rounded-3xl border border-white/10 italic text-2xl text-red-500 font-bold">
                            "{settings.pitchDeckCustomMessage}"
                        </div>
                    )}
                    <div className="flex items-center gap-16 pt-16 border-t border-white/5">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">Strategic Context</p>
                            <p className="text-2xl font-black uppercase text-white">Active Proposal</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">Prepared For</p>
                            <p className="text-2xl font-black uppercase text-white">{target}</p>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 2: THE PROBLEM */}
            <Slide slideNumber="02" targetCompany={target} title="The Distribution Gap." subtitle="The Market Problem">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
                    <div className="space-y-12">
                        <p className="text-5xl font-black leading-[1.1] text-white uppercase italic">Algorithmic safety is the <span className="text-red-600">death</span> of authentic discovery.</p>
                        <ul className="space-y-8 text-gray-400 font-medium">
                            <li className="flex gap-6 border-b border-white/5 pb-8"><span className="text-red-500 font-black text-xl italic">/ 01</span> <p className="text-xl">Elite short-form content has no professional monetization home.</p></li>
                            <li className="flex gap-6 border-b border-white/5 pb-8"><span className="text-red-500 font-black text-xl italic">/ 02</span> <p className="text-xl">YouTube "Creator" payouts are predatory and race-to-the-bottom CPM based.</p></li>
                            <li className="flex gap-6 border-b border-white/5 pb-8"><span className="text-red-500 font-black text-xl italic">/ 03</span> <p className="text-xl">Audiences are suffering from "Franchise Fatigue" — they crave the 'unseen'.</p></li>
                        </ul>
                    </div>
                    <div className="relative group">
                         <div className="absolute -inset-10 bg-red-600/10 blur-[100px] opacity-50"></div>
                         <MetricCard label="Market Failure" value="84%" sub="of award-winning indie films secure zero professional monetization after festival runs." />
                    </div>
                </div>
            </Slide>

            {/* SLIDE 3: CRATE FEST ENGINE */}
            <Slide slideNumber="03" targetCompany={target} title="Crate Fest." subtitle="The Pop-Up Scarcity Engine" gradient="bg-gradient-to-tr from-[#050505] to-red-950/30">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-16">
                    <div className="p-12 bg-white/[0.02] border border-white/5 rounded-[4rem] space-y-6">
                        <h4 className="text-3xl font-black uppercase tracking-tighter text-white italic">Time Scarcity</h4>
                        <p className="text-gray-400 leading-relaxed text-base font-medium">Crate Fest introduces high-value, time-locked events. A $20 pass unlocks a 7-day masterclass in cinema, creating an urgency legacy platforms lack.</p>
                    </div>
                    <div className="p-12 bg-red-600/10 border border-red-500/20 rounded-[4rem] space-y-6 shadow-2xl">
                        <h4 className="text-3xl font-black uppercase tracking-tighter text-white italic">Live Sentiment</h4>
                        <p className="text-gray-400 leading-relaxed text-base font-medium">Synchronized global watch parties with sub-second latency chat and real-time "Hype Map" sentiment tracking for distribution data.</p>
                    </div>
                    <div className="p-12 bg-white/[0.02] border border-white/5 rounded-[4rem] space-y-6">
                        <h4 className="text-3xl font-black uppercase tracking-tighter text-white italic">Artist Yield</h4>
                        <p className="text-gray-400 leading-relaxed text-base font-medium">A transparent 70/30 revenue share model. We prioritize the fuel (artists) over the machine (infrastructure).</p>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 4: INFRASTRUCTURE */}
            <Slide slideNumber="04" targetCompany={target} title="Native Stack." subtitle="Roku // Cloud // Intelligence">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="relative rounded-[5rem] overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,1)]">
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/ruko+logo+.webp" className="w-full h-full object-cover opacity-30 blur-sm scale-110" alt="Roku" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-16 text-center bg-black/40">
                            <h3 className="text-6xl font-black uppercase tracking-tighter text-white mb-6 italic">Big Screen Authority</h3>
                            <p className="text-gray-300 max-w-sm font-bold text-lg">We own our Roku SDK codebase. No wrappers. No compromises. High-bitrate master exhibition directly in the living room.</p>
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div className="p-10 bg-white/5 rounded-[3rem] border border-white/10 group hover:border-red-600/50 transition-all">
                            <p className="text-red-500 font-black uppercase text-[10px] tracking-[0.5em] mb-3">Operational Velocity</p>
                            <h4 className="text-2xl font-black text-white uppercase italic">The Studio Engine</h4>
                            <p className="text-gray-400 mt-4 text-base font-medium leading-relaxed">Our proprietary V4 interface publishes content and re-routes monetization rules globally in sub-100ms cycles.</p>
                        </div>
                        <div className="p-10 bg-white/5 rounded-[3rem] border border-white/10 group hover:border-red-600/50 transition-all">
                            <p className="text-red-500 font-black uppercase text-[10px] tracking-[0.5em] mb-3">AI Intelligence</p>
                            <h4 className="text-2xl font-black text-white uppercase italic">Predictive Analytics</h4>
                            <p className="text-gray-400 mt-4 text-base font-medium leading-relaxed">Integrated Gemini 3 Pro reasoning layer analyzes audience Hype Maps to predict which talent is ready for major IP acquisition.</p>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 5: OPPORTUNITY */}
            <Slide slideNumber="05" targetCompany={target} title="The Synergy." subtitle="Growth Metrics">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
                    <div className="space-y-10">
                        <h4 className="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">Why Crate TV x {target}?</h4>
                        <p className="text-2xl text-gray-400 leading-relaxed font-medium">We serve as the ultimate <span className="text-white italic">R&D Funnel</span>. We identify talent at the point of origin, bypassing the traditional gatekeeper friction and reducing IP acquisition costs.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-green-600/10 border border-green-500/20 p-10 rounded-[3rem] text-center shadow-2xl">
                            <p className="text-5xl font-black text-white italic">82%</p>
                            <p className="text-[11px] font-black text-green-500 uppercase tracking-[0.5em] mt-2">Retention</p>
                        </div>
                        <div className="bg-blue-600/10 border border-blue-500/20 p-10 rounded-[3rem] text-center shadow-2xl">
                            <p className="text-5xl font-black text-white italic">2.4x</p>
                            <p className="text-[11px] font-black text-blue-500 uppercase tracking-[0.5em] mt-2">Velocity</p>
                        </div>
                        <div className="col-span-2 bg-red-600/10 border border-red-500/20 p-12 rounded-[3.5rem] text-center shadow-2xl">
                            <p className="text-5xl font-black text-white italic tracking-tighter uppercase">Ready for Expansion</p>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 6: CONTACT */}
            <Slide targetCompany={target} dark={false} gradient="bg-white">
                <div className="flex flex-col items-center justify-center text-center py-20">
                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" className="w-[30rem] h-auto invert mb-20 animate-pulse" />
                    <div className="space-y-6 mb-24">
                        <h3 className="text-7xl md:text-9xl font-black uppercase tracking-tighter leading-none italic">Let's Build.</h3>
                        <p className="text-red-600 font-black uppercase tracking-[0.8em] text-2xl">Excellence by Design</p>
                    </div>
                    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-20 text-left border-t border-black/10 pt-16">
                        <div>
                            <p className="text-[11px] font-black uppercase text-gray-400 tracking-[0.6em] mb-4">Strategic Contact</p>
                            <p className="text-3xl font-black italic">cratetiv@gmail.com</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase text-gray-400 tracking-[0.6em] mb-4">Network Terminal</p>
                            <p className="text-3xl font-black italic">cratetv.net</p>
                        </div>
                    </div>
                </div>
            </Slide>
        </div>
    );
};

export default PitchDeckPage;