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
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
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
                    <h2 className="text-6xl md:text-[9rem] font-black uppercase tracking-tighter leading-[0.8] animate-[fadeIn_0.8s_ease-out] italic">
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
    const studioEmail = settings.businessEmail || "studio@cratetv.net";
    const target = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('for') || settings.pitchTargetCompany || 'LIFT LABS';
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
                <p className="text-red-600 font-black uppercase text-xl tracking-[0.2em] animate-bounce">IDENTIFIED: {target.toUpperCase()}</p>
            </div>
        );
    }

    return (
        <div className="bg-black min-h-screen selection:bg-red-600 selection:text-white scroll-smooth overflow-x-hidden">
            <Slide slideNumber="01" targetCompany={target} title="The Afterlife." subtitle="Crate TV: Strategic Yield 2025" gradient="bg-gradient-to-br from-[#0a0a0a] via-[#050505] to-red-950/20">
                <div className="max-w-5xl space-y-16">
                    <p className="text-4xl md:text-7xl text-gray-200 font-black leading-[0.95] tracking-tight uppercase">
                        The elite <span className="text-white italic underline decoration-red-600 underline-offset-[12px]">permanent home</span> for world-class cinema.
                    </p>
                </div>
            </Slide>

            <Slide slideNumber="02" targetCompany={target} title="The Event." subtitle="Live Social Streaming Architecture">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="space-y-10">
                        <p className="text-4xl font-black uppercase italic leading-tight">Beyond Passive Viewing: <span className="text-red-600">The Watch Party.</span></p>
                        <p className="text-xl text-gray-400 leading-relaxed font-medium">Crate TV solves the "lonely stream" problem. Our infrastructure allows hundreds of simultaneous viewers to sync playback, interact via live chat, and engage with directors in real-time Q&A sessions.</p>
                        <div className="flex gap-10">
                            <div className="space-y-2">
                                <p className="text-4xl font-black text-white italic">Sub-100ms</p>
                                <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Global Sync Latency</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-4xl font-black text-red-600 italic">70%</p>
                                <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Filmmaker Yield</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative rounded-[4rem] overflow-hidden border border-white/10 shadow-2xl">
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/filmmaker-bg.jpg" className="w-full h-full object-cover opacity-40" alt="Watch Party" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        <div className="absolute bottom-8 left-8 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Live: Sector Delta Active</span>
                        </div>
                    </div>
                </div>
            </Slide>

            <Slide slideNumber="03" targetCompany={target} title="Economics." subtitle="Disruptive Acquisition Model">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <MetricCard label="Ticketed Events" value="$5.00" sub="Standard pricing for live watch parties. High conversion 'dopamine' purchase point." />
                    <MetricCard label="Artist Retention" value="70%" sub="Filmmakers keep the lion's share of all ticket sales and community donations." />
                </div>
                <div className="mt-16 p-8 bg-white/5 border border-white/10 rounded-3xl">
                    <p className="text-gray-400 text-lg leading-relaxed">
                        Unlike traditional "buy-out" models that strip artists of their upside, Crate TV provides a <span className="text-white font-bold">continuous revenue engine</span>. We specialize in the "Encore Window"—providing new life to films that have completed their initial distribution run.
                    </p>
                </div>
            </Slide>

            <Slide targetCompany={target} dark={true} gradient="bg-[#050505]">
                <div className="flex flex-col items-center justify-center text-center py-20">
                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" className="w-80 h-auto invert mb-20 animate-pulse" />
                    <h3 className="text-7xl md:text-9xl font-black uppercase tracking-tighter leading-none italic mb-10">Let's Build.</h3>
                    <p className="text-3xl font-black italic text-gray-600 uppercase tracking-widest">{studioEmail}</p>
                </div>
            </Slide>
        </div>
    );
};

export default PitchDeckPage;