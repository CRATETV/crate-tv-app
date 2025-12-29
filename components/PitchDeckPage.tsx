
import React from 'react';

const Slide: React.FC<{ 
    id?: string;
    children: React.ReactNode; 
    dark?: boolean; 
    title?: string; 
    subtitle?: string;
    gradient?: string;
}> = ({ id, children, dark = true, title, subtitle, gradient }) => (
    <section id={id} className={`pitch-slide w-full min-h-[100vh] flex flex-col p-8 md:p-20 relative overflow-hidden break-after-page ${gradient ? gradient : (dark ? 'bg-[#050505] text-white' : 'bg-white text-black')}`}>
        <div className="flex justify-between items-center mb-12 border-b border-white/10 pb-6 relative z-10">
            <div className="flex items-center gap-4">
                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" alt="Crate TV" className={`w-20 h-auto ${!dark && 'invert'}`} />
                <div className="h-6 w-px bg-white/20"></div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50">LIFT LABS PITCH 2025</p>
            </div>
            <div className="text-right">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-red-500' : 'text-red-600'}`}>CONFIDENTIAL</p>
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
            <span>© 2025 Crate TV // Independent Cinema Infrastructure</span>
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
    return (
        <div className="bg-black min-h-screen">
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
                <button onClick={() => window.print()} className="bg-white text-black font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest shadow-2xl hover:bg-gray-200 transition-all">Export PDF</button>
                <button onClick={() => window.history.back()} className="bg-white/10 backdrop-blur-md text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest border border-white/20">Close</button>
            </div>

            {/* SLIDE 1: VISION */}
            <Slide title="The Home of the Unseen" subtitle="Vision & Mission" gradient="bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-red-950/20">
                <p className="text-2xl md:text-4xl text-gray-300 max-w-4xl font-medium leading-relaxed">
                    Crate TV is a high-density streaming ecosystem designed to champion independent cinema. We bridge the gap between dedicated creators and a global audience that craves authentic, hand-picked storytelling.
                </p>
            </Slide>

            {/* SLIDE 2: VALUE TO COMCAST */}
            <Slide title="Strategic Value" subtitle="Measurable Value to Comcast NBCUniversal">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard 
                        icon="📟"
                        title="Talent Scouting"
                        desc="Industry Discovery Terminal providing NBCU teams with 'Discovery Scores' to identify high-potential actors and directors early."
                        color="bg-red-900/20"
                    />
                    <FeatureCard 
                        icon="🚰"
                        title="Content Pipeline"
                        desc="A low-risk acquisition funnel for Peacock, surface-area testing indie titles with proven audience retention data."
                        color="bg-blue-900/20"
                    />
                    <FeatureCard 
                        icon="🤖"
                        title="Operational AI"
                        desc="Automated distribution logistics (Social Kits/Press) reducing the cost-per-title for managing large content libraries."
                        color="bg-purple-900/20"
                    />
                </div>
            </Slide>

            {/* SLIDE 3: MARKET VALIDATION */}
            <Slide title="Market Validation" subtitle="Partnerships & Deployment Status">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white/5 p-8 rounded-2xl border border-white/5">
                            <h3 className="text-xl font-black text-red-500 uppercase mb-4">Playhouse West Philadelphia</h3>
                            <p className="text-gray-300">Our primary institutional partner, providing an exclusive pipeline of award-winning independent films and professional adjudication.</p>
                        </div>
                        <div className="bg-white/5 p-8 rounded-2xl border border-white/5">
                            <h3 className="text-xl font-black text-red-500 uppercase mb-4">Roku Ecosystem</h3>
                            <p className="text-gray-300">Successful deployment of a custom SDK-level channel, validating our ability to meet global "Big Screen" OTT standards.</p>
                        </div>
                        <div className="bg-white/5 p-8 rounded-2xl border border-white/5">
                            <h3 className="text-xl font-black text-red-500 uppercase mb-4">Infrastructure Partners</h3>
                            <p className="text-gray-300">Secure operational integration with AWS for high-bitrate delivery and Square for global creator monetization.</p>
                        </div>
                        <div className="bg-white/5 p-8 rounded-2xl border border-white/5">
                            <h3 className="text-xl font-black text-red-500 uppercase mb-4">Professional Jury</h3>
                            <p className="text-gray-300">Catalog vetted by industry professionals, ensuring high "Discovery Scores" for future enterprise acquisitions.</p>
                        </div>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 4: THE TEAM */}
            <Slide title="The Team" subtitle="Hybrid Engineering & Industry Pedigree">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                        <h4 className="text-xl font-bold text-white">Creative-Technical</h4>
                        <p className="text-sm text-gray-400">Founder is an active actor and full-stack engineer, solving actual creator pain points without translation layers.</p>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xl font-bold text-white">Institutional Heritage</h4>
                        <p className="text-sm text-gray-400">Direct access to award-winning pipelines and professional talent development through Playhouse West.</p>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xl font-bold text-white">Full-Stack Autonomy</h4>
                        <p className="text-sm text-gray-400">Agile team managing global distribution across Web, Roku, and AWS with massive operational efficiency.</p>
                    </div>
                </div>
                <div className="mt-12 bg-white/5 p-8 rounded-3xl border border-white/10 text-center">
                    <p className="text-lg text-gray-300 italic">"Building the supply chain for the next generation of cinematic discovery."</p>
                </div>
            </Slide>

            {/* SLIDE 5: TECHNOLOGY */}
            <Slide title="Technology Stack" subtitle="Automated & Scalable" gradient="bg-gradient-to-tr from-black via-[#0a0a0a] to-blue-900/10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-black/60 p-6 rounded-xl border border-white/5 text-center">
                        <p className="text-3xl mb-2">🧠</p>
                        <p className="text-xs font-black uppercase text-blue-400">Gemini AI</p>
                    </div>
                    <div className="bg-black/60 p-6 rounded-xl border border-white/5 text-center">
                        <p className="text-3xl mb-2">📺</p>
                        <p className="text-xs font-black uppercase text-purple-400">Roku SDK</p>
                    </div>
                    <div className="bg-black/60 p-6 rounded-xl border border-white/5 text-center">
                        <p className="text-3xl mb-2">☁️</p>
                        <p className="text-xs font-black uppercase text-gray-400">AWS S3</p>
                    </div>
                    <div className="bg-black/60 p-6 rounded-xl border border-white/5 text-center">
                        <p className="text-3xl mb-2">💳</p>
                        <p className="text-xs font-black uppercase text-green-400">Square</p>
                    </div>
                </div>
            </Slide>

            {/* SLIDE 6: CONTACT */}
            <Slide title="Contact" dark={false} gradient="bg-white">
                <div className="flex flex-col items-center justify-center text-center">
                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" className="w-64 h-auto invert mb-8" />
                    <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Crate TV // Infrastructure</h3>
                    <p className="text-red-600 font-bold mb-8 uppercase tracking-widest">Philadelphia, PA</p>
                    <p className="text-xl font-medium">cratetiv@gmail.com</p>
                    <p className="text-xl font-black mt-2">www.cratetv.net</p>
                </div>
            </Slide>
        </div>
    );
};

export default PitchDeckPage;
