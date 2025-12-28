import React from 'react';

const Slide: React.FC<{ 
    children: React.ReactNode; 
    dark?: boolean; 
    title?: string; 
    subtitle?: string;
    gradient?: string;
}> = ({ children, dark = true, title, subtitle, gradient }) => (
    <section className={`w-full min-h-screen flex flex-col p-8 md:p-20 relative overflow-hidden break-after-page print:h-[11in] print:w-[8.5in] print:p-8 ${gradient ? gradient : (dark ? 'bg-[#050505] text-white' : 'bg-white text-black')}`}>
        <div className="flex justify-between items-center mb-12 border-b border-white/10 pb-6 print:mb-4 relative z-10">
            <div className="flex items-center gap-4">
                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" alt="Crate TV" className={`w-20 h-auto ${!dark && 'invert'}`} />
                <div className="h-6 w-px bg-white/20"></div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50">LIFT LABS PITCH 2025</p>
            </div>
            <div className="text-right">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-red-500' : 'text-red-600'}`}>CONFIDENTIAL PROPOSAL</p>
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
            <span>Philadelphia, PA</span>
            <span>© 2025 Crate TV // Comcast NBCUniversal LIFT Labs Selection</span>
        </div>
    </section>
);

const FeatureCard: React.FC<{ icon: string; title: string; desc: string; color: string }> = ({ icon, title, desc, color }) => (
    <div className={`p-8 rounded-[2rem] border border-white/10 ${color} shadow-2xl flex flex-col gap-4 transform transition-transform hover:scale-105`}>
        <div className="text-4xl">{icon}</div>
        <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{title}</h3>
        <p className="text-gray-200 text-sm leading-relaxed">{desc}</p>
    </div>
);

const PitchDeckPage: React.FC = () => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-[#050505] min-h-screen selection:bg-red-600 selection:text-white">
            <div className="fixed top-6 right-6 z-50 flex gap-3 no-print">
                <button 
                    onClick={() => window.history.back()}
                    className="bg-gray-900/80 backdrop-blur-md hover:bg-gray-800 text-white font-black px-5 py-2 rounded-lg text-[10px] uppercase tracking-widest border border-white/10 transition-all"
                >
                    Exit
                </button>
                <button 
                    onClick={handlePrint}
                    className="bg-red-600 hover:bg-red-500 text-white font-black px-6 py-2 rounded-lg text-[10px] uppercase tracking-widest shadow-2xl transition-all"
                >
                    Export PDF
                </button>
            </div>

            {/* SLIDE 1: COVER */}
            <Slide gradient="bg-gradient-to-br from-red-950 via-[#050505] to-black">
                <div className="max-w-4xl space-y-8">
                    <div className="inline-block bg-red-600 text-white px-5 py-1.5 rounded-full font-black text-[10px] uppercase tracking-[0.4em] mb-4">
                        Discovery-as-a-Service
                    </div>
                    <h1 className="text-8xl md:text-[12rem] font-black tracking-tighter leading-[0.8] mb-6">
                        CRATE <span className="text-red-600">TV</span>
                    </h1>
                    <h2 className="text-3xl md:text-5xl font-black text-gray-400 uppercase tracking-tighter leading-none">
                        The Global Stage for <br/>
                        <span className="text-white italic">Elite Independent Cinema.</span>
                    </h2>
                    <div className="pt-16 flex items-center gap-10">
                        <div className="h-px flex-grow bg-gradient-to-r from-red-600 to-transparent"></div>
                        <div className="flex flex-col text-right">
                             <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Selected for</span>
                             <span className="text-xl font-black text-white italic">Comcast NBCUniversal LIFT Labs</span>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 2: THE PROBLEM */}
            <Slide title="Rescuing Elite Cinema" subtitle="Stopping the Post-Festival Decay">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
                    <div className="space-y-12">
                        <div className="space-y-4">
                            <h3 className="text-4xl font-black text-red-500 uppercase tracking-tighter">The Obscurity Gap</h3>
                            <p className="text-gray-300 text-xl leading-relaxed">
                                Every year, thousands of <strong className="text-white">original masterpieces</strong> win awards at festivals, screen for 3 days, and then **vanish**. 
                            </p>
                        </div>
                        <div className="p-8 bg-white/5 rounded-3xl border-l-8 border-red-600">
                             <p className="text-gray-200 text-lg leading-relaxed">
                                Crate TV sources high-velocity content that the general public is currently **missing**. We give "Invisible Gems" an intentional, year-round home.
                             </p>
                        </div>
                    </div>
                    <div className="relative group">
                        <div className="absolute -inset-10 bg-red-600/20 blur-[120px] opacity-50 transition-opacity group-hover:opacity-80"></div>
                        <div className="relative bg-gray-900 border border-white/10 p-12 rounded-[3rem] text-center shadow-2xl">
                            <p className="text-8xl font-black text-white mb-2 tracking-tighter">95%</p>
                            <p className="text-gray-500 uppercase font-black text-xs tracking-[0.4em]">Films die after festivals.</p>
                            <p className="mt-8 text-white font-bold text-xl uppercase tracking-tighter leading-none">We provide the <br/><span className="text-red-600">Permanence.</span></p>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 3: FESTIVAL PARTNERSHIP */}
            <Slide title="Virtual Festival Hub" subtitle="Supporting Playhouse West Philadelphia" gradient="bg-gradient-to-br from-[#1a0b2e] via-[#050505] to-black">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                         <div className="bg-purple-600/10 border border-purple-500/30 p-8 rounded-3xl">
                            <h3 className="text-3xl font-black uppercase text-purple-400 mb-4">Official Digital Partner</h3>
                            <p className="text-gray-300 text-lg leading-relaxed">
                                We broadcast high-velocity selections from institutions like the <strong className="text-white">Playhouse West Philadelphia Film Festival</strong> to a global audience.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                <p className="text-2xl mb-2">🎪</p>
                                <p className="text-xs font-bold text-white uppercase tracking-widest">Live Blocks</p>
                                <p className="text-[10px] text-gray-500 mt-2">Synchronized virtual screenings.</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                <p className="text-2xl mb-2">🎟️</p>
                                <p className="text-xs font-bold text-white uppercase tracking-widest">Digital Tickets</p>
                                <p className="text-[10px] text-gray-500 mt-2">Monetized access to blocks.</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative text-center">
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" className="w-64 h-auto mx-auto mb-8 drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]" alt="Crate TV" />
                        <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10">
                            <p className="text-xs font-black text-purple-500 uppercase tracking-[0.3em] mb-4">The Philly Catalyst</p>
                            <p className="text-xl font-bold text-white italic">"Expanding the reach of Philadelphia's finest independent voices."</p>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 4: THE CREATOR ECONOMY */}
            <Slide title="Creator Economy" subtitle="Direct Monetization of Talent">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
                    <FeatureCard 
                        icon="💰" 
                        title="Fan Tips" 
                        desc="Viewers donate directly to filmmakers. Creators keep 70% of every dollar."
                        color="bg-green-600/10"
                    />
                    <FeatureCard 
                        icon="💎" 
                        title="PPV Rentals" 
                        desc="Exclusive access to world premieres and director's cuts via 24h rentals."
                        color="bg-blue-600/10"
                    />
                    <FeatureCard 
                        icon="📟" 
                        title="Industry Access" 
                        desc="Verified agencies pay to access discovery data and performance telemetry."
                        color="bg-purple-600/10"
                    />
                 </div>
                 <div className="mt-16 p-10 bg-white/5 rounded-[3rem] border border-white/10 text-center max-w-3xl mx-auto">
                    <p className="text-[10px] font-black uppercase text-red-500 tracking-[0.5em] mb-4">The Revenue Split</p>
                    <div className="flex justify-center items-end gap-2">
                        <span className="text-9xl font-black text-white">70</span>
                        <span className="text-4xl font-black text-red-600 mb-4">/ 30</span>
                    </div>
                    <p className="text-gray-400 font-medium uppercase tracking-widest mt-2">Creator vs Platform</p>
                 </div>
            </Slide>

            {/* SLIDE 5: WHY NOW */}
            <Slide title="Ready to Scale" subtitle="Partnering with Comcast LIFT Labs" gradient="bg-gradient-to-t from-red-600/10 to-black">
                <div className="flex flex-col md:flex-row gap-12 items-center">
                    <div className="flex-1 space-y-10">
                        <h4 className="text-4xl font-black uppercase text-white tracking-tighter leading-tight">Operational and <span className="text-red-600">Built.</span></h4>
                        <div className="space-y-6 text-gray-400 text-xl leading-relaxed">
                            <p>Crate TV is not a "concept." We are a **functional media infrastructure** with an active Roku presence and AWS backbone.</p>
                            <p>With **Comcast LIFT Labs**, we intend to scale our model to thousands of creators and millions of viewers.</p>
                        </div>
                        <div className="bg-red-600 p-8 rounded-3xl text-white font-black italic text-2xl shadow-2xl uppercase tracking-tight">
                            "Lifting the best stories off the ground."
                        </div>
                    </div>
                    <div className="w-full md:w-80 bg-white/5 border border-white/10 rounded-[2.5rem] p-10 space-y-6">
                        <p className="text-xs font-black uppercase text-red-500 tracking-[0.3em]">Infrastructure</p>
                        <ul className="text-sm space-y-4 font-bold text-gray-200 uppercase tracking-tighter">
                            <li className="flex items-center gap-3">● Active Roku Channel</li>
                            <li className="flex items-center gap-3">● Full AWS/CDN Backend</li>
                            <li className="flex items-center gap-3">● Proprietary Creator CRM</li>
                            <li className="flex items-center gap-3">● Secure Payment Flow</li>
                        </ul>
                    </div>
                </div>
            </Slide>

            <style>{`
                @media print {
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    .break-after-page { page-break-after: always; }
                    section { min-height: 100vh; height: 100vh; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default PitchDeckPage;