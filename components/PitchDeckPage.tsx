import React from 'react';

const Slide: React.FC<{ children: React.ReactNode; dark?: boolean; title?: string; subtitle?: string }> = ({ children, dark = true, title, subtitle }) => (
    <section className={`w-full min-h-screen flex flex-col p-8 md:p-20 relative overflow-hidden break-after-page print:h-[11in] print:w-[8.5in] print:p-8 ${dark ? 'bg-black text-white' : 'bg-white text-black'}`}>
        {/* LIFT Labs Header Branding */}
        <div className="flex justify-between items-center mb-12 border-b border-gray-800 pb-6 print:mb-4">
            <div className="flex items-center gap-4">
                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" alt="Crate TV" className={`w-20 h-auto ${!dark && 'invert'}`} />
                <div className="h-6 w-px bg-gray-700"></div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">Lift Labs // Accelerator Pitch 2025</p>
            </div>
            <div className="text-right">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-red-500' : 'text-red-600'}`}>CONFIDENTIAL PROPOSAL</p>
            </div>
        </div>
        
        <div className="flex-grow flex flex-col justify-center">
            {title && (
                <div className="mb-10">
                    <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-none animate-[fadeIn_0.8s_ease-out]">
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

        <div className="flex justify-between items-end mt-12 text-[9px] font-black uppercase tracking-widest text-gray-600 border-t border-gray-900 pt-6">
            <span>Philadelphia, PA</span>
            <span>© 2025 Crate TV // NBCUniversal LIFT Labs Selection</span>
        </div>
    </section>
);

const SynergyCard: React.FC<{ title: string; body: string; icon: string }> = ({ title, body, icon }) => (
    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-red-500/30 transition-all group">
        <div className="text-2xl mb-4 group-hover:scale-110 transition-transform">{icon}</div>
        <h4 className="text-lg font-black text-white uppercase mb-2 tracking-tight">{title}</h4>
        <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
    </div>
);

const PitchDeckPage: React.FC = () => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-[#050505] min-h-screen">
            {/* Nav Controls */}
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
                    Export for LIFT Labs
                </button>
            </div>

            {/* SLIDE 1: THE COVER */}
            <Slide>
                <div className="max-w-4xl space-y-8">
                    <div className="inline-block bg-red-600 text-white px-4 py-1 rounded font-black text-[10px] uppercase tracking-[0.4em] mb-4">
                        Accelerating Media Innovation
                    </div>
                    <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter leading-[0.85] mb-6">
                        CRATE <span className="text-white/10">TV</span>
                    </h1>
                    <h2 className="text-3xl md:text-5xl font-black text-gray-400 uppercase tracking-tighter leading-none">
                        Discovery-as-a-Service for <br/>
                        <span className="text-white">The Next Generation of Cinema.</span>
                    </h2>
                    <div className="pt-16 flex items-center gap-10">
                        <div className="h-px flex-grow bg-gradient-to-r from-red-600 to-transparent"></div>
                        <div className="flex flex-col text-right">
                             <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest">A Partnership with</span>
                             <span className="text-lg font-black text-white italic">COMCAST NBCUniversal</span>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 2: THE PROBLEM */}
            <Slide title="The Discovery Crisis" subtitle="Market Inefficiency in Streaming">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="space-y-10">
                        <div className="bg-red-600/10 border-l-4 border-red-600 p-6 rounded-r-xl">
                            <h4 className="text-xl font-bold mb-2">Algorithmic Erasure</h4>
                            <p className="text-gray-400">92% of independent short films—the farm system of Hollywood—never reach a premium living room interface. They are buried by volume-based algorithms.</p>
                        </div>
                        <div className="bg-white/5 border-l-4 border-gray-600 p-6 rounded-r-xl">
                            <h4 className="text-xl font-bold mb-2">Engagement Plateaus</h4>
                            <p className="text-gray-400">Gen-Z and Alpha viewers are migrating from long-form traditional streaming to short-form community platforms. Legacy UI is struggling to bridge the gap.</p>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute -inset-4 bg-red-600/20 blur-3xl opacity-50"></div>
                        <div className="relative bg-gray-900 border border-white/10 p-10 rounded-[2rem] text-center shadow-2xl">
                            <p className="text-7xl font-black text-white mb-2 tracking-tighter">8.5m</p>
                            <p className="text-gray-500 uppercase font-black text-xs tracking-widest">Hours of Unexploited Content</p>
                            <p className="mt-6 text-sm text-gray-400 italic">High-fidelity independent assets currently sitting on personal hard drives without an enterprise pipeline.</p>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 3: THE SOLUTION */}
            <Slide title="The Artist-First Engine" subtitle="Curation Over Chaos">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-8 bg-white text-black rounded-[2.5rem] flex flex-col justify-between">
                        <h3 className="text-2xl font-black uppercase leading-tight">Human <br/>Curation</h3>
                        <p className="text-sm font-bold opacity-70">Hand-picked by professional curators from Playhouse West, ensuring Peacock-level quality on an indie budget.</p>
                    </div>
                    <div className="p-8 bg-red-600 text-white rounded-[2.5rem] flex flex-col justify-between transform scale-105 shadow-2xl z-10">
                        <h3 className="text-2xl font-black uppercase leading-tight">Automated <br/>Pipelines</h3>
                        <p className="text-sm font-bold opacity-90">Proprietary "One-Click" Roku & Web packaging. We move content from submission to big screen in &lt; 24 hours.</p>
                    </div>
                    <div className="p-8 bg-gray-900 text-white border border-white/10 rounded-[2.5rem] flex flex-col justify-between">
                        <h3 className="text-2xl font-black uppercase leading-tight">Equitable <br/>Returns</h3>
                        <p className="text-sm font-bold opacity-50">A 70/30 creator-first split powered by secure Square infrastructure, creating a sustainable talent incubator.</p>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 4: TECH ALPHA - AI TELEMETRY */}
            <Slide title="AI Intelligence" subtitle="Data-Driven Talent Scouting">
                <div className="space-y-12">
                    <div className="bg-gradient-to-r from-purple-900/40 to-black p-8 rounded-[2rem] border border-purple-500/20">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="text-3xl">✨</span>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Gemini-Powered Metadata</h3>
                        </div>
                        <p className="text-gray-300 text-lg leading-relaxed max-w-3xl">
                            We leverage **Google Gemini AI** to generate strategic growth roadmaps and deep-sentiment "Hype Maps." We don't just track views; we track **narrative impact**—identifying which scenes trigger peak engagement.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-6 bg-black border border-white/5 rounded-2xl">
                             <p className="text-[10px] font-black text-red-500 uppercase mb-4 tracking-widest">Product Feature</p>
                             <h4 className="text-xl font-bold mb-2 text-white">Script Doctor</h4>
                             <p className="text-sm text-gray-500 italic">AI analysis of narrative market-fit before a frame is even shot.</p>
                        </div>
                        <div className="p-6 bg-black border border-white/5 rounded-2xl">
                             <p className="text-[10px] font-black text-red-500 uppercase mb-4 tracking-widest">Data Asset</p>
                             <h4 className="text-xl font-bold mb-2 text-white">Hype Map Telemetry</h4>
                             <p className="text-sm text-gray-400">Real-time heatmaps of audience sentiment to identify "Breakout Stars" for NBCU acquisition.</p>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 5: COMCAST SYNERGY */}
            <Slide title="Comcast Synergy" subtitle="Plugging into the Ecosystem">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <SynergyCard 
                            icon="📺"
                            title="X1 / Flex Integration"
                            body="Direct metadata injection into Xfinity global search, positioning indie content alongside major studio releases."
                        />
                        <SynergyCard 
                            icon="🎬"
                            title="Peacock Talent Pipeline"
                            body="Crate TV acts as a low-risk testing ground for emerging directors and actors before they transition to Peacock Originals."
                        />
                    </div>
                    <div className="space-y-6">
                        <SynergyCard 
                            icon="🏙️"
                            title="Philadelphia HQ Advantage"
                            body="Direct physical synergy with Comcast Center. We represent the soul of the Philadelphia creative tech community."
                        />
                        <SynergyCard 
                            icon="📶"
                            title="Xfinity Mobile Engagement"
                            body="Optimized PWA architecture for data-efficient streaming on Xfinity Mobile, bypassing high-barrier app store downloads."
                        />
                    </div>
                </div>
            </Slide>

            {/* SLIDE 6: TRACTION & PHILADELPHIA ROOTS */}
            <Slide title="Philadelphia Built" subtitle="The Infrastructure of Trust">
                 <div className="relative h-64 md:h-80 rounded-[3rem] overflow-hidden mb-10 border border-white/10">
                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/filmmaker-bg.jpg" className="w-full h-full object-cover opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                    <div className="absolute bottom-8 left-8">
                         <h3 className="text-5xl font-black text-white italic tracking-tighter uppercase">Local Power. Global Vision.</h3>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                        <p className="text-3xl font-black text-white">100%</p>
                        <p className="text-[10px] uppercase text-gray-500 font-bold mt-1">Creator Ownership</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                        <p className="text-3xl font-black text-white">4K</p>
                        <p className="text-[10px] uppercase text-gray-500 font-bold mt-1">Mastering Standards</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                        <p className="text-3xl font-black text-white">Roku</p>
                        <p className="text-[10px] uppercase text-gray-500 font-bold mt-1">Native SDK Pipeline</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                        <p className="text-3xl font-black text-white">Square</p>
                        <p className="text-[10px] uppercase text-gray-500 font-bold mt-1">Secure Monetization</p>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 7: THE TEAM & VISION */}
            <Slide title="Join the Movement" subtitle="The Future of Interactive Cinema">
                <div className="text-center space-y-10 max-w-3xl mx-auto py-10">
                    <p className="text-2xl md:text-4xl text-gray-300 font-medium italic leading-tight">
                        "Crate TV is not just a streaming service. It is a digital home for the bold voices Comcast LIFT Labs was designed to champion."
                    </p>
                    <div className="pt-12">
                         <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" alt="Crate TV" className="w-56 h-auto mx-auto mb-6" />
                         <p className="text-red-500 font-black uppercase tracking-[0.6em] text-sm">Elevate the Unseen.</p>
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
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .break-after-page { page-break-after: always; }
            `}</style>
        </div>
    );
};

export default PitchDeckPage;