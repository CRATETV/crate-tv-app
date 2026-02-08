
import React from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <pre className="bg-black/60 border border-white/10 rounded-xl p-6 my-4 overflow-x-auto shadow-inner group relative">
        <code className="text-xs text-indigo-400 font-mono leading-relaxed">{children}</code>
        <button 
            onClick={() => { navigator.clipboard.writeText(children?.toString() || ''); alert('Protocol Copied'); }}
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white text-white hover:text-black font-black text-[8px] px-2 py-1 rounded uppercase tracking-widest"
        >
            Copy
        </button>
    </pre>
);

const RoleCard: React.FC<{ title: string; name?: string; duties: string[]; tool: string; color: string }> = ({ title, name, duties, tool, color }) => (
    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 hover:border-white/20 transition-all">
        <div className="flex justify-between items-start">
            <div>
                <h4 className={`text-sm font-black uppercase tracking-widest ${color}`}>{title}</h4>
                {name && <p className="text-white font-bold text-lg mt-1 italic">{name}</p>}
            </div>
            <span className="text-[8px] font-black text-gray-600 bg-black px-2 py-1 rounded border border-white/5 uppercase tracking-widest">Core Node</span>
        </div>
        <ul className="space-y-2">
            {duties.map((d, i) => (
                <li key={i} className="text-[11px] text-gray-400 flex gap-2">
                    <span className={color}>●</span> {d}
                </li>
            ))}
        </ul>
        <div className="pt-4 border-t border-white/5">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Primary Workspace</p>
            <p className="text-[10px] text-gray-300 font-mono mt-1">{tool}</p>
        </div>
    </div>
);

const DeveloperGuidePage: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen text-white bg-black">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
            />

            <main className="flex-grow pt-24 px-4 md:px-12 pb-32">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="text-red-500 font-black uppercase tracking-[0.5em] text-[10px] mb-4">Infrastructure V4.5</p>
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 uppercase tracking-tighter italic">Dev Guide.</h1>
                        <p className="text-lg text-gray-400">
                           Technical protocols for packaging, signing, and deploying cinematic assets.
                        </p>
                    </div>

                    <div className="space-y-16">
                        {/* The PKG signing Section */}
                        <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-10 h-10 bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/30">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tight italic text-red-500">The .PKG Pipeline (Signing)</h2>
                            </div>
                            
                            <div className="space-y-8 text-gray-400 text-sm leading-relaxed">
                                <p>Roku.com strictly prohibits the upload of standard .zip files for SDK channels. To create a production-ready application, you must use your <strong className="text-white">Physical Roku Device</strong> as a signing node.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-black border border-white/5 p-6 rounded-2xl">
                                        <h4 className="text-white font-bold mb-2">1. Ingest Source</h4>
                                        <p>Download the source ZIP from the 'Deploy' tab. Upload it to your TV's developer IP address in a web browser.</p>
                                    </div>
                                    <div className="bg-black border border-white/5 p-6 rounded-2xl">
                                        <h4 className="text-white font-bold mb-2">2. Execute Packager</h4>
                                        <p>On the TV's browser interface, click 'Packager'. Enter your developer key password and generate the signed .pkg binary.</p>
                                    </div>
                                </div>
                                
                                <p className="bg-red-600/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-xs font-black uppercase tracking-widest text-center">
                                    Notice: The resulting .pkg is the only file accepted by the Roku Channel Store.
                                </p>
                            </div>
                        </section>

                        {/* Transcoding Section */}
                        <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-10 h-10 bg-cyan-600/10 rounded-full flex items-center justify-center border border-cyan-500/30">
                                    <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tight italic">Transcoding Lab</h2>
                            </div>
                            
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Single File Mastery (FFmpeg)</h4>
                                    <CodeBlock>ffmpeg -i input.mp4 -c:v libx264 -profile:v high -level:4.1 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k output_roku.mp4</CodeBlock>
                                </div>
                            </div>
                        </section>

                        {/* Personnel Protocol Section */}
                        <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-10 h-10 bg-indigo-600/10 rounded-full flex items-center justify-center border border-indigo-500/30">
                                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tight italic">Personnel Manifest</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <RoleCard 
                                    title="Chief Infrastructure Architect"
                                    name="Salome Denoon"
                                    duties={["Stack Integrity (AWS/Vercel)", "Product Roadmap & UI/UX", "Final Transmission Gatekeeping"]}
                                    color="text-red-500"
                                    tool="Admin Hub"
                                />
                                <RoleCard 
                                    title="Chief Patronage Officer"
                                    name="Tathia MomPremier"
                                    duties={["Strategic Board Advisory", "Festival Fund Oversight", "Philly Institutional Bridge"]}
                                    color="text-amber-500"
                                    tool="Admin Hub"
                                />
                                <RoleCard 
                                    title="Chief Selection Officer"
                                    duties={["Pipeline Review & Adjudication", "High-Bitrate Asset Ingestion", "Watch Party Scheduling"]}
                                    color="text-purple-500"
                                    tool="Admin Hub"
                                />
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            <Footer />
            <BackToTopButton />
        </div>
    );
};

export default DeveloperGuidePage;
