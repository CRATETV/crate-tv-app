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
}> = ({ id, children, dark = true, title, subtitle, gradient, targetCompany = 'LIFT LABS' }) => (
    <section id={id} className={`pitch-slide w-full min-h-[100vh] flex flex-col p-8 md:p-20 relative overflow-hidden break-after-page ${gradient ? gradient : (dark ? 'bg-[#050505] text-white' : 'bg-white text-black')}`}>
        {/* Dynamic Background Texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]"></div>

        {/* Dynamic Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.015] rotate-[-25deg] select-none whitespace-nowrap">
            <span className="text-[200px] font-black uppercase leading-none">CRATE // {targetCompany}</span>
        </div>

        <div className="flex justify-between items-center mb-12 border-b border-white/10 pb-6 relative z-10">
            <div className="flex items-center gap-4">
                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" className={`w-20 h-auto ${!dark && 'invert'}`} />
                <div className="h-6 w-px bg-white/20"></div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50">{targetCompany.toUpperCase()} PITCH 2025</p>
            </div>
            <div className="text-right">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-red-500' : 'text-red-600'}`}>CONFIDENTIAL // {targetCompany.toUpperCase()} INTERNAL</p>
            </div>
        </div>
        
        <div className="flex-grow flex flex-col justify-center relative z-10">
            {title && (
                <div className="mb-10">
                    <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-tight animate-[fadeIn_0.8s_ease-out]">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-red-500 font-bold uppercase tracking-[0.4em] text-xs mt-4 animate-[fadeIn_1s_ease-out]">
                            {subtitle}
                        </p>
                    )}
                </div>
            )}
            <div className="animate-[fadeIn_1.2s_ease-out]">
                {children}
            </div>
        </div>

        <div className="flex justify-between items-end mt-12 text-[9px] font-black uppercase tracking-widest text-white/30 border-t border-white/5 pt-6 relative z-10">
            <span>SECURE SESSION // ID_{targetCompany.slice(0,3).toUpperCase()}_025</span>
            <span>© 2025 Crate TV // Global Distribution Infrastructure</span>
        </div>
    </section>
);

const FeatureCard: React.FC<{ icon: string; title: string; desc: string; color: string }> = ({ icon, title, desc, color }) => (
    <div className={`p-8 rounded-[2rem] border border-white/10 ${color} shadow-2xl flex flex-col gap-4 transform transition-all hover:scale-105 hover:border-white/20`}>
        <div className="text-4xl">{icon}</div>
        <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{title}</h3>
        <p className="text-gray-200 text-sm leading-relaxed">{desc}</p>
    </div>
);

const PitchDeckPage: React.FC = () => {
    const { settings } = useFestival();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [showHandshake, setShowHandshake] = useState(true);

    // Resolve target company from URL param or global default
    const target = useMemo(() => {
        if (typeof window === 'undefined') return 'LIFT LABS';
        const params = new URLSearchParams(window.location.search);
        return params.get('for') || params.get('company') || settings.pitchTargetCompany || 'LIFT LABS';
    }, [settings.pitchTargetCompany]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowHandshake(false);
            setIsAuthorized(true);
        }, 2200);
        return () => clearTimeout(timer);
    }, []);

    if (showHandshake) {
        return (
            <div className="fixed inset-0 bg-[#050505] flex flex-col items-center justify-center z-[1000] p-8 text-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)]"></div>
                <div className="w-24 h-24 mb-12 relative">
                    <div className="absolute inset-0 border-4 border-red-600/20 rounded-full animate-ping"></div>
                    <div className="absolute inset-2 border-2 border-red-500 rounded-full animate-[spin_3s_linear_infinite] border-t-transparent"></div>
                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-full h-full object-contain p-4" alt="Crate" />
                </div>
                <h2 className="text-white font-black uppercase tracking-[0.5em] text-xs mb-4 animate-pulse">Establishing Secure Handshake</h2>
                <p className="text-gray-600 font-bold uppercase text-[9px] tracking-widest max-w-xs leading-relaxed">
                    Authenticating Strategic Session for {target.toUpperCase()}...
                </p>
                <div className="absolute bottom-12 w-48 h-px bg-white/5 overflow-hidden">
                    <div className="h-full bg-red-600 w-1/2 animate-[loading_2s_ease-in-out_infinite]"></div>
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
        <div className="bg-black min-h-screen selection:bg-red-600 selection:text-white">
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .pitch-slide { 
                        min-height: 100vh !important;
                        height: 100vh !important;
                        page-break-after: always !important;
                    }
                }
            `}</style>

            <div className="no-print fixed top-6 right-6 z-[100] flex gap-4">
                <button onClick={() => window.print()} className="bg-white text-black font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest shadow-2xl hover:bg-gray-200 transition-all hover:scale-105 active:scale-95">Export Presentation PDF</button>
                <button onClick={() => window.history.back()} className="bg-white/10 backdrop-blur-md text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest border border-white/20 hover:bg-white/20 transition-all">Exit Deck</button>
            </div>

            {/* SLIDE 1: VISION */}
            <Slide targetCompany={target} title="Home of the Unseen." subtitle="Crate TV Strategic Proposition" gradient="bg-gradient-to-br from-[#0a0a0a] via-[#111] to-red-950/20">
                <p className="text-2xl md:text-5xl text-gray-300 max-w-5xl font-medium leading-tight tracking-tight">
                    We are building a high-density streaming ecosystem for independent cinema, bridging the gap between <span className="text-white font-black">elite storytellers</span> and a global audience of <span className="text-white font-black">active discovery seekers.</span>
                </p>
                <div className="mt-16 inline-flex items-center gap-6 bg-red-600/10 border border-red-500/20 px-8 py-5 rounded-3xl">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Exclusive Brief Prepared For</p>
                        <p className="text-white font-black text-2xl uppercase tracking-tighter">{target}</p>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 2: VALUE TO PARTNER */}
            <Slide targetCompany={target} title="The Strategic Lift." subtitle={`High-Impact Value for ${target}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard 
                        icon="📟"
                        title="Talent Scouting"
                        desc="Access our 'Discovery Scores' for actors and directors. Identify high-potential creators through audience retention heatmaps before they hit the mainstream market."
                        color="bg-red-900/10"
                    />
                    <FeatureCard 
                        icon="🚰"
                        title="Content Pipeline"
                        desc={`A ready-to-scale acquisition funnel. Surface-area test indie titles with ${target}'s target demographics using our real-time sentiment telemetry.`}
                        color="bg-blue-900/10"
                    />
                    <FeatureCard 
                        icon="🤖"
                        title="Operations"
                        desc="Our AI-driven distribution stack handles press releases, social kits, and global OTT logistics automatically—dramatically reducing title management costs."
                        color="bg-purple-900/10"
                    />
                </div>
            </Slide>

            {/* SLIDE 3: INFRASTRUCTURE */}
            <Slide targetCompany={target} title="High-Density Platform" subtitle="Engineering Scalability">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-3">
                            <h4 className="text-xl font-black text-white uppercase">V4 Media Infrastructure</h4>
                            <p className="text-gray-400 leading-relaxed">Built on a hybrid AWS/Vercel stack. Capable of supporting millions of concurrent global streams with sub-second latency for interactive watch parties.</p>
                        </div>
                        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-3">
                            <h4 className="text-xl font-black text-white uppercase">Roku SDK Integration</h4>
                            <p className="text-gray-400 leading-relaxed">Successful deployment of a deep-tier SDK channel. We own the codebase end-to-end, allowing for radical experimentation with Big Screen monetization.</p>
                        </div>
                    </div>
                    <div className="bg-red-600/5 border border-red-500/20 p-10 rounded-[3rem] text-center">
                         <div className="text-6xl mb-6">🌩️</div>
                         <h3 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">Cloud Native</h3>
                         <p className="text-gray-400 leading-relaxed max-w-sm mx-auto">Our infrastructure is non-linear. We can spin up branded festival hubs for partners in under 24 hours.</p>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 4: THE MARKET */}
            <Slide targetCompany={target} title="The Acquisition Gap" subtitle="Unlocking the long-tail of premium indie">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-10">
                    <div className="text-center">
                        <p className="text-5xl font-black text-white mb-2">90%</p>
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">The Failure Rate</p>
                        <p className="text-sm text-gray-400 leading-relaxed">High-quality indie films that never reach a major platform due to distribution gatekeeping.</p>
                    </div>
                    <div className="text-center">
                        <p className="text-5xl font-black text-white mb-2">72%</p>
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">Audience Desire</p>
                        <p className="text-sm text-gray-400 leading-relaxed">Viewers who claim they want more 'authentic' and 'original' stories over recycled franchise IP.</p>
                    </div>
                    <div className="text-center">
                        <p className="text-5xl font-black text-white mb-2">Crate</p>
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">The Solution</p>
                        <p className="text-sm text-gray-400 leading-relaxed">A low-friction, high-quality terminal that identifies and captures the winners of the long-tail.</p>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 5: CONTACT */}
            <Slide targetCompany={target} title="Engage." dark={false} gradient="bg-white">
                <div className="flex flex-col items-center justify-center text-center py-12">
                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" className="w-80 h-auto invert mb-12 animate-[fadeIn_1.5s_ease-out]" />
                    <div className="space-y-2 mb-12">
                        <h3 className="text-4xl font-black uppercase tracking-tighter">Crate TV // Infrastructure</h3>
                        <p className="text-red-600 font-bold uppercase tracking-[0.5em] text-sm">Strategic Alliances Unit</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-6 text-left border-t border-black/10 pt-12">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Electronic Mail</p>
                            <p className="text-xl font-bold">cratetiv@gmail.com</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Global Terminal</p>
                            <p className="text-xl font-bold">www.cratetv.net</p>
                        </div>
                    </div>
                </div>
            </Slide>
        </div>
    );
};

export default PitchDeckPage;