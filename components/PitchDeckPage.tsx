import React, { useState, useEffect, useMemo } from 'react';
import { useFestival } from '../contexts/FestivalContext';

const Slide: React.FC<{ 
    id?: string;
    children: React.ReactNode; 
    dark?: boolean; 
    title?: string; 
    subtitle?: string;
    gradient?: string;
    targetCompany?: string;
    slideNumber?: string;
}> = ({ id, children, dark = true, title, subtitle, gradient, targetCompany = 'LIFT LABS', slideNumber }) => (
    <section id={id} className={`pitch-slide w-full min-h-[100vh] flex flex-col p-8 md:p-20 relative overflow-hidden break-after-page ${gradient ? gradient : (dark ? 'bg-[#050505] text-white' : 'bg-white text-black')}`}>
        {/* Dynamic Background Texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]"></div>

        {/* Cinematic Background Ornament */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full pointer-events-none"></div>

        {/* Dynamic Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.015] rotate-[-25deg] select-none whitespace-nowrap">
            <span className="text-[250px] font-black uppercase leading-none">{targetCompany.toUpperCase()} // STRATEGIC</span>
        </div>

        <div className="flex justify-between items-start mb-12 border-b border-white/10 pb-6 relative z-10">
            <div className="flex items-center gap-6">
                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" className={`w-24 h-auto ${!dark && 'invert'}`} />
                <div className="h-8 w-px bg-white/20"></div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">{targetCompany.toUpperCase()} ADVISORY</p>
                    <p className="text-[8px] font-bold text-red-500 uppercase tracking-widest mt-1">SENSITIVE ASSET // DO NOT DISTRIBUTE</p>
                </div>
            </div>
            {slideNumber && (
                <div className="text-right">
                    <span className="text-4xl font-black opacity-10 font-mono">{slideNumber}</span>
                </div>
            )}
        </div>
        
        <div className="flex-grow flex flex-col justify-center relative z-10 max-w-6xl">
            {title && (
                <div className="mb-12">
                    <h2 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-[0.85] animate-[fadeIn_0.8s_ease-out] italic">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-red-500 font-black uppercase tracking-[0.5em] text-sm mt-6 animate-[fadeIn_1s_ease-out] bg-red-600/10 py-2 px-4 rounded-lg w-max">
                            {subtitle}
                        </p>
                    )}
                </div>
            )}
            <div className="animate-[fadeIn_1.2s_ease-out] mt-4">
                {children}
            </div>
        </div>

        <div className="flex justify-between items-end mt-12 text-[9px] font-black uppercase tracking-widest text-white/20 border-t border-white/5 pt-6 relative z-10">
            <div className="flex gap-8">
                <span>SECURE SESSION // V4.2_OPS</span>
                <span>LATENCY: 14MS</span>
            </div>
            <span>© 2025 CRATE TV INFRASTRUCTURE</span>
        </div>
    </section>
);

const MetricBlock: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
    <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] space-y-4 backdrop-blur-xl">
        <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">{label}</p>
        <p className="text-6xl font-black tracking-tighter text-white">{value}</p>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest leading-relaxed">{sub}</p>
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
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.08)_0%,transparent_70%)]"></div>
                <div className="w-32 h-32 mb-12 relative animate-pulse">
                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-full h-full object-contain" alt="Crate" />
                </div>
                <h2 className="text-white font-black uppercase tracking-[0.8em] text-xs mb-4">Initializng Strategic Session</h2>
                <p className="text-red-600 font-black uppercase text-[11px] tracking-widest animate-bounce">
                    Target: {target.toUpperCase()}
                </p>
                <div className="absolute bottom-20 w-64 h-px bg-white/5 overflow-hidden">
                    <div className="h-full bg-red-600 w-1/3 animate-[loading_1.5s_infinite]"></div>
                </div>
                <style>{`
                    @keyframes loading {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(200%); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="bg-black min-h-screen selection:bg-red-600 selection:text-white scroll-smooth">
            <div className="no-print fixed top-8 right-8 z-[100] flex gap-4">
                <button onClick={() => window.print()} className="bg-red-600 text-white font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-[0_20px_50px_rgba(239,68,68,0.3)] hover:bg-red-500 transition-all hover:scale-105 active:scale-95">Export PDF Brief</button>
                <button onClick={() => window.history.back()} className="bg-white/10 backdrop-blur-md text-white font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all">Terminate Session</button>
            </div>

            {/* SLIDE 1: COVER */}
            <Slide slideNumber="01" targetCompany={target} title="Home of the Unseen." subtitle="Crate TV: Strategic Overview" gradient="bg-gradient-to-br from-[#0a0a0a] via-[#050505] to-red-950/20">
                <div className="max-w-4xl space-y-12">
                    <p className="text-3xl md:text-6xl text-gray-300 font-medium leading-[1.1] tracking-tight">
                        We are building the <span className="text-white font-black italic">high-density</span> distribution bridge for the next generation of independent cinema.
                    </p>
                    <div className="flex items-center gap-10 pt-10 border-t border-white/5">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Document Status</p>
                            <p className="text-xl font-black uppercase text-white">Active Proposal</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Prepared For</p>
                            <p className="text-xl font-black uppercase text-white">{target}</p>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 2: THE PROBLEM */}
            <Slide slideNumber="02" targetCompany={target} title="The Barrier." subtitle="The Acquisition Gap">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
                    <div className="space-y-10">
                        <p className="text-4xl font-bold leading-tight text-white">Major platforms have become gatekeepers of <span className="text-red-600">algorithmic safety</span>, leaving a vacuum for authentic discovery.</p>
                        <ul className="space-y-6 text-gray-400">
                            <li className="flex gap-4"><span className="text-red-500 font-black">/ 01</span> <p className="text-lg">90% of award-winning shorts never reach a monetized OTT platform.</p></li>
                            <li className="flex gap-4"><span className="text-red-500 font-black">/ 02</span> <p className="text-lg">Creator payout structures on YouTube/Social are predatory (CPM-based only).</p></li>
                            <li className="flex gap-4"><span className="text-red-500 font-black">/ 03</span> <p className="text-lg">Audiences are fatigued by franchise IP and crave curated 'lean-in' experiences.</p></li>
                        </ul>
                    </div>
                    <div className="relative group">
                         <div className="absolute -inset-4 bg-red-600/20 blur-3xl opacity-50"></div>
                         <MetricBlock label="Market Failure" value="84%" sub="of indie films fail to secure professional distribution despite critical acclaim." />
                    </div>
                </div>
            </Slide>

            {/* SLIDE 3: CRATE FEST MODEL */}
            <Slide slideNumber="03" targetCompany={target} title="Crate Fest." subtitle="The Event-Driven Monetization Engine" gradient="bg-gradient-to-tr from-[#050505] to-purple-950/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
                    <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] space-y-4">
                        <h4 className="text-2xl font-black uppercase tracking-tighter text-white">Pop-Up Scarcity</h4>
                        <p className="text-gray-400 leading-relaxed text-sm">Crate Fest introduces high-value, time-locked events. A $15 digital pass unlocks a 7-day exclusive collection, creating an urgency major streamers lack.</p>
                    </div>
                    <div className="p-10 bg-red-600/10 border border-red-500/20 rounded-[3rem] space-y-4">
                        <h4 className="text-2xl font-black uppercase tracking-tighter text-white">Global Community</h4>
                        <p className="text-gray-400 leading-relaxed text-sm">Integrated live watch parties with real-time sentiment mapping and chat. Turning passive viewing into an 'appointment' experience.</p>
                    </div>
                    <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] space-y-4">
                        <h4 className="text-2xl font-black uppercase tracking-tighter text-white">Direct-to-Artist</h4>
                        <p className="text-gray-400 leading-relaxed text-sm">A transparent split model. 70% of festival pass revenue flows directly to the featured creators, fostering a loyal talent pipeline.</p>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 4: INFRASTRUCTURE */}
            <Slide slideNumber="04" targetCompany={target} title="Native Stack." subtitle="Roku // Web // Cloud Hub">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="relative rounded-[4rem] overflow-hidden border border-white/10 shadow-2xl">
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/ruko+logo+.webp" className="w-full h-full object-cover opacity-40 blur-sm scale-110" alt="Roku" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                            <h3 className="text-5xl font-black uppercase tracking-tighter text-white mb-4">Deep SDK Integration</h3>
                            <p className="text-gray-300 max-w-sm font-medium">Unlike 'web-view' wrappers, we own our Roku SDK codebase, allowing for custom monetization features directly on the big screen.</p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="p-8 bg-white/5 rounded-3xl border border-white/5">
                            <p className="text-red-500 font-black uppercase text-[10px] tracking-widest mb-2">Platform Velocity</p>
                            <h4 className="text-xl font-black text-white uppercase">Cloud Manifesting</h4>
                            <p className="text-gray-400 mt-2 text-sm">Our Studio V4 engine publishes content updates globally in &lt;100ms. Dynamic pricing and category row management require zero redeployments.</p>
                        </div>
                        <div className="p-8 bg-white/5 rounded-3xl border border-white/5">
                            <p className="text-red-500 font-black uppercase text-[10px] tracking-widest mb-2">Predictive Logic</p>
                            <h4 className="text-xl font-black text-white uppercase">AI Logistics Hub</h4>
                            <p className="text-gray-400 mt-2 text-sm">Automated press kits, social media campaigns, and script doctor analysis using Gemini 3 Pro. Reducing overhead for high-volume catalog growth.</p>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 5: OPPORTUNITY */}
            <Slide slideNumber="05" targetCompany={target} title="The Yield." subtitle="Strategic Synergy">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                    <div className="space-y-8">
                        <h4 className="text-4xl font-black text-white uppercase tracking-tighter">Why {target}?</h4>
                        <p className="text-xl text-gray-400 leading-relaxed font-medium">We identify high-velocity talent through data before they hit the mainstream. For a partner like <span className="text-white">{target}</span>, Crate TV serves as the ultimate R&D funnel for original IP acquisition.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-600/10 border border-green-500/20 p-6 rounded-3xl text-center">
                            <p className="text-3xl font-black text-white">82%</p>
                            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Retention Rate</p>
                        </div>
                        <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-3xl text-center">
                            <p className="text-3xl font-black text-white">2.4x</p>
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Growth Velocity</p>
                        </div>
                        <div className="col-span-2 bg-red-600/10 border border-red-500/20 p-8 rounded-[2rem] text-center">
                            <p className="text-4xl font-black text-white italic tracking-tighter">Ready for Expansion</p>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 6: CONTACT */}
            <Slide targetCompany={target} dark={false} gradient="bg-white">
                <div className="flex flex-col items-center justify-center text-center py-20">
                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" className="w-80 h-auto invert mb-16 animate-pulse" />
                    <div className="space-y-4 mb-20">
                        <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">Let's Build.</h3>
                        <p className="text-red-600 font-black uppercase tracking-[0.6em] text-lg">Infrastructure for Visionaries</p>
                    </div>
                    <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-12 text-left border-t border-black/10 pt-12">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Strategic Alliances</p>
                            <p className="text-2xl font-black">cratetiv@gmail.com</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Platform Terminal</p>
                            <p className="text-2xl font-black">cratetv.net</p>
                        </div>
                    </div>
                </div>
            </Slide>
        </div>
    );
};

export default PitchDeckPage;