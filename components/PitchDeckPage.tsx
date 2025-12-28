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

const Screenshot: React.FC<{ src: string; caption: string; movieTitle: string; type?: 'mobile' | 'desktop' }> = ({ src, caption, movieTitle, type = 'desktop' }) => (
    <div className="flex flex-col gap-4 group items-center">
        <div className={`${type === 'mobile' ? 'w-56 aspect-[9/19]' : 'w-full aspect-video'} bg-gray-900 rounded-xl overflow-hidden border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-[1.02] flex flex-col`}>
            {/* Browser Header if Desktop */}
            {type === 'desktop' && (
                <div className="bg-gray-800 h-6 flex items-center px-3 gap-1.5 border-b border-white/5 flex-none">
                    <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                    <span className="text-[7px] text-gray-500 ml-2 font-mono truncate">cratetv.net/movie/{movieTitle.toLowerCase().replace(/\s/g, '')}</span>
                </div>
            )}
            <div className="flex-grow flex items-center justify-center bg-black overflow-hidden p-2">
                <img 
                    src={src} 
                    alt={movieTitle} 
                    className="w-full h-full object-contain drop-shadow-2xl" 
                />
            </div>
        </div>
        <div className="text-center">
            <p className="text-[11px] font-black text-white uppercase tracking-tighter">{caption}</p>
            <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest mt-0.5">Featuring: {movieTitle}</p>
        </div>
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
                    Export to PDF
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
                        Independent Discovery-as-a-Service <br/>
                        <span className="text-white">The Philadelphia Tech Catalyst.</span>
                    </h2>
                    <div className="pt-16 flex items-center gap-10">
                        <div className="h-px flex-grow bg-gradient-to-r from-red-600 to-transparent"></div>
                        <div className="flex flex-col text-right">
                             <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Designed for</span>
                             <span className="text-lg font-black text-white italic">NBCUniversal LIFT Labs</span>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 2: THE INTERFACE (SHOWCASING ACTUAL WEBAPP) */}
            <Slide title="The Product Suite" subtitle="Proprietary UI/UX for the Multi-Device Era">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
                    <div className="space-y-6">
                        <Screenshot 
                            src="https://cratetelevision.s3.amazonaws.com/Lifeless+poster+remake+.jpg" 
                            movieTitle="Lifeless"
                            caption="Webapp: Cinematic Desktop View"
                        />
                        <div className="p-6 bg-red-600/10 border border-red-500/20 rounded-2xl">
                            <p className="text-gray-300 text-sm leading-relaxed italic">
                                "Our UI eliminates 'Infinite Scroll Fatigue' by prioritizing narrative weight over algorithmic volume."
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-8">
                        <div className="flex gap-8 items-end justify-center">
                            <Screenshot 
                                src="https://cratetelevision.s3.us-east-1.amazonaws.com/Gemeni+Time+Service.JPG" 
                                movieTitle="Gemini Time Service"
                                caption="Webapp: Mobile Player" 
                                type="mobile"
                            />
                            <div className="flex-grow p-8 bg-white/5 rounded-3xl border border-white/10 mb-12 max-w-xs">
                                <h4 className="text-white font-black uppercase tracking-tighter mb-3">Seamless PWA Integration</h4>
                                <p className="text-gray-400 text-xs leading-relaxed font-medium">Native-feel Progressive Web App architecture ensures instant performance without the friction of app store downloads.</p>
                                <div className="mt-6 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                    <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Zero Install Friction</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 3: THE MARKET GAP */}
            <Slide title="The Content Inefficiency" subtitle="Streaming's Talent Bottleneck">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="space-y-10">
                        <div className="bg-red-600/10 border-l-4 border-red-600 p-6 rounded-r-xl">
                            <h4 className="text-xl font-bold mb-2">Discovery Score &lt; 5%</h4>
                            <p className="text-gray-400">95% of high-quality independent pilots and short films are invisible to major studio scouts. Legacy UI prevents "The Next Big Thing" from surfacing.</p>
                        </div>
                        <div className="bg-white/5 border-l-4 border-gray-600 p-6 rounded-r-xl">
                            <h4 className="text-xl font-bold mb-2">Platform Fatigue</h4>
                            <p className="text-gray-400">Viewers are overwhelmed by generic content. Data shows a 40% surge in demand for community-curated, "authentic" narrative experiences.</p>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute -inset-4 bg-red-600/20 blur-3xl opacity-50"></div>
                        <div className="relative bg-gray-900 border border-white/10 p-10 rounded-[2rem] text-center shadow-2xl">
                            <p className="text-7xl font-black text-white mb-2 tracking-tighter">84%</p>
                            <p className="text-gray-500 uppercase font-black text-xs tracking-widest">Audience Retention Rate</p>
                            <p className="mt-6 text-sm text-gray-400 italic">Crate TV's curated format generates significantly higher "Scene Engagement" than standard algorithmic feeds.</p>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 4: THE DATA EDGE */}
            <Slide title="Audience Telemetry" subtitle="AI-Driven Talent Scouting">
                <div className="space-y-12">
                    <div className="bg-gradient-to-r from-purple-900/40 to-black p-8 rounded-[2rem] border border-purple-500/20">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="text-3xl">✨</span>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Gemini-Powered "Hype Maps"</h3>
                        </div>
                        <p className="text-gray-300 text-lg leading-relaxed max-w-3xl">
                            We use advanced AI to track second-by-second sentiment. We identify **high-velocity directors** before they hit the mainstream, providing a "De-Risked" pipeline for original programming acquisition.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-6 bg-black border border-white/5 rounded-2xl">
                             <p className="text-[10px] font-black text-red-500 uppercase mb-4 tracking-widest">Prediction Engine</p>
                             <h4 className="text-xl font-bold mb-2 text-white">Talent Velocity Map</h4>
                             <p className="text-sm text-gray-500 italic">Identifies actors and directors with high "Industry Re-watch" co-efficients.</p>
                        </div>
                        <div className="p-6 bg-black border border-white/5 rounded-2xl">
                             <p className="text-[10px] font-black text-red-500 uppercase mb-4 tracking-widest">Metadata Asset</p>
                             <h4 className="text-xl font-bold mb-2 text-white">Scene Retention Analysis</h4>
                             <p className="text-sm text-gray-400">Deep telemetry on which narrative hooks trigger user conversions and community engagement.</p>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 5: SCALABILITY */}
            <Slide title="Accelerate with Us" subtitle="The Future is Philadelphia">
                <div className="flex flex-col md:flex-row gap-12 items-center">
                    <div className="flex-1 space-y-6">
                        <h4 className="text-3xl font-black uppercase text-white">Why Now?</h4>
                        <p className="text-lg text-gray-400 leading-relaxed">
                            Crate TV is at the intersection of **Interactive Media** and **Infrastructure Scalability**. We are ready to pilot our "Discovery-as-a-Service" model at enterprise scale.
                        </p>
                        <div className="bg-red-600 p-6 rounded-2xl text-white font-bold italic">
                            "We are building the farm system for the future of cinematic talent."
                        </div>
                    </div>
                    <div className="w-full md:w-80 bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4">
                        <p className="text-[10px] font-black uppercase text-gray-500">Proposal Pillars</p>
                        <ul className="text-sm space-y-3 font-bold text-gray-200">
                            <li>● Distribution Pilot</li>
                            <li>● API Metadata Exchange</li>
                            <li>● Local Talent Showcase</li>
                            <li>● Venture Partnership</li>
                        </ul>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 6: VISION */}
            <Slide>
                <div className="text-center space-y-10 max-w-3xl mx-auto py-10">
                    <p className="text-2xl md:text-5xl text-gray-300 font-black italic leading-tight uppercase tracking-tighter">
                        Elevate the Unseen. <br/>
                        Scale the Story.
                    </p>
                    <div className="pt-12">
                         <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" alt="Crate TV" className="w-56 h-auto mx-auto mb-6" />
                         <p className="text-red-500 font-black uppercase tracking-[0.6em] text-xs">A New Era of Independent Cinema.</p>
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
            `}</style>
        </div>
    );
};

export default PitchDeckPage;