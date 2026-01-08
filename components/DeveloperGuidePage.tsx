import React from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <pre className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 my-4 overflow-x-auto">
        <code className="text-sm text-gray-300 font-mono">{children}</code>
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
                        <p className="text-red-500 font-black uppercase tracking-[0.5em] text-[10px] mb-4">Infrastructure V4.0</p>
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 uppercase tracking-tighter italic">Dev Guide.</h1>
                        <p className="text-lg text-gray-400">
                           Technical protocols for scaling Crate TV and mastering cinematic assets.
                        </p>
                    </div>

                    <div className="space-y-16">
                        {/* Personnel Protocol Section */}
                        <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-10 h-10 bg-indigo-600/10 rounded-full flex items-center justify-center border border-indigo-500/30">
                                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tight italic">Personnel Manifest: The First Five</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <RoleCard 
                                    title="Chief Infrastructure Architect"
                                    name="Salome Denoon"
                                    duties={["Stack Integrity (AWS/Vercel)", "Product Roadmap & UI/UX", "Final Transmission Gatekeeping"]}
                                    tool="Admin → Pulse / Security / Fallback"
                                    color="text-red-500"
                                />
                                <RoleCard 
                                    title="Chief Patronage Officer"
                                    name="Tathia MomPremier"
                                    duties={["Strategic Board Advisory", "Festival Fund Oversight", "Philly Institutional Bridge"]}
                                    tool="Admin → Analytics / Vault / Users"
                                    color="text-amber-500"
                                />
                                <RoleCard 
                                    title="Chief Selection Officer"
                                    duties={["Pipeline Review & Adjudication", "High-Bitrate Asset Ingestion", "Watch Party Scheduling"]}
                                    tool="Admin → Pipeline / Jury / Catalog"
                                    color="text-purple-500"
                                />
                                <RoleCard 
                                    title="Director of Resource Acquisition"
                                    duties={["Grant Narrative Drafting", "Technology Credit Harvesting", "Regional Funding Research"]}
                                    tool="Admin → Fund Strategist / Grant Writer"
                                    color="text-green-500"
                                />
                                <RoleCard 
                                    title="Editorial Dispatcher"
                                    duties={["Crate Zine Direction", "Studio Mail Broadcasts", "AI Social Kit Management"]}
                                    tool="Admin → Editorial / Dispatch / Mail"
                                    color="text-blue-500"
                                />
                            </div>

                            <div className="mt-12 bg-indigo-900/10 border border-indigo-500/20 p-8 rounded-3xl">
                                <h4 className="font-black text-indigo-500 uppercase tracking-widest text-[10px] mb-4">Onboarding Protocol</h4>
                                <p className="mb-4 text-xs text-gray-400">To authorize a new Sector Lead without compromising the Master Key:</p>
                                <ol className="list-decimal list-inside space-y-2 text-[11px] text-gray-400 leading-relaxed">
                                    <li>Navigate to <strong>Admin → Permissions</strong>.</li>
                                    <li>Click <strong>"Issue Key"</strong> and enter the Lead's name.</li>
                                    <li>Select only the tabs listed in their <strong>"Primary Workspace"</strong> above.</li>
                                    <li>Forward the unique <code>CRATE-XXXXXX</code> key to the member.</li>
                                </ol>
                            </div>
                        </section>

                        {/* Media Ops Section */}
                        <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/30">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tight italic">Media Ops: Master Pathing</h2>
                            </div>
                            
                            <div className="space-y-8 text-gray-300 text-sm leading-relaxed">
                                <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-2xl">
                                    <h4 className="font-black text-blue-500 uppercase tracking-widest text-[10px] mb-4">Meridian Dataset Map</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                            <span className="text-xs font-mono">audio/</span>
                                            <span className="text-[10px] font-black text-gray-500 uppercase">Contains Sound Masters (.wav)</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                            <span className="text-xs font-mono">*.mp4</span>
                                            <span className="text-[10px] font-black text-gray-500 uppercase">Silent Video Master</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                            <span className="text-xs font-mono">subtitles/</span>
                                            <span className="text-[10px] font-black text-gray-500 uppercase">SRT/VTT Caption Assets</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-mono">tiffs/</span>
                                            <span className="text-[10px] font-black text-gray-500 uppercase">Raw Frames (Ignore for Muxing)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-red-600/10 border border-red-500/20 p-6 rounded-2xl">
                                    <h4 className="font-black text-red-500 uppercase tracking-widest text-[10px] mb-4">Quick Start: Meridian One-Liner</h4>
                                    <p className="mb-4 text-xs">Copy and paste this exact command into Terminal to mux the 4K video and WAV audio from your Desktop:</p>
                                    <CodeBlock>{`ffmpeg -i ~/Desktop/Meridian_UHD4k5994_HDR_P3PQ.mp4 -i ~/Desktop/audio/meridian_audio_ltrt.wav -c copy -map 0:v:0 -map 1:a:0 ~/Desktop/Meridian_Final.mp4`}</CodeBlock>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Commit Philosophy</h2>
                            <p className="text-gray-300 mb-4 font-medium">
                                To keep our infrastructure history readable, follow the <strong>One Feature, One Commit</strong> rule. Squash your local history before merging to main.
                            </p>
                            <CodeBlock>
{`# Interactive squash example
git rebase -i HEAD~4`}
                            </CodeBlock>
                        </section>
                        
                        <section>
                            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Roku Deployment</h2>
                            <p className="text-gray-300 mb-4 font-medium">
                                Our Roku channel is a native SDK build. Content updates in the Admin Panel propagate to Roku via the live JSON feed.
                            </p>
                             <ul className="list-decimal list-inside space-y-4 text-gray-400 text-sm">
                                <li><strong>Package:</strong> Download the .pkg from the Admin Dashboard.</li>
                                <li><strong>Sign:</strong> Sideload to your dev Roku to generate a signed build.</li>
                                <li><strong>Publish:</strong> Upload the signed build to the Roku Developer Console.</li>
                            </ul>
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