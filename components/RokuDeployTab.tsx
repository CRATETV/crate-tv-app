
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const ComplianceItem: React.FC<{ rule: string; label: string; desc: string; status: 'pending' | 'verified' }> = ({ rule, label, desc, status }) => (
    <div className="bg-white/5 border border-white/5 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-white/10 transition-all">
        <div className="flex gap-6 items-start">
            <span className="text-red-600 font-black text-xl italic mt-1">{rule}</span>
            <div>
                <h4 className="text-white font-black uppercase text-sm tracking-tight">{label}</h4>
                <p className="text-gray-500 text-xs leading-relaxed max-w-xl mt-1">{desc}</p>
            </div>
        </div>
        <div className="flex-shrink-0">
            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${status === 'verified' ? 'bg-green-600/10 border-green-500/30 text-green-500' : 'bg-amber-600/10 border-amber-500/30 text-amber-500'}`}>
                {status === 'verified' ? 'System Verified' : 'Awaiting Audit'}
            </span>
        </div>
    </div>
);

const RokuDeployTab: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'generating' | 'error'>('idle');
    const [error, setError] = useState('');
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

    const productionUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/roku-feed` : 'https://cratetv.net/api/roku-feed';

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleDownloadZip = async () => {
        setStatus('generating');
        setError('');
        const password = sessionStorage.getItem('adminPassword');

        try {
            const response = await fetch('/api/generate-roku-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate production package.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cratetv-source-v4.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setStatus('idle');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setStatus('error');
        }
    };

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out] pb-24">
            {/* Compliance Checklist */}
            <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[3.5rem] shadow-2xl space-y-10">
                <div className="space-y-4">
                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic">Certification Track</h3>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Verify these critical Roku OS analysis rules before deployment</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                    <ComplianceItem 
                        rule="3.6" 
                        label="8-Second Initiation" 
                        desc="Content must start playing within 8 seconds. Use HLS or MP4 +faststart flags." 
                        status="pending"
                    />
                    <ComplianceItem 
                        rule="4.1" 
                        label="Persistent Identity" 
                        desc="Updates must NOT sign users out. Use Roku roRegistry to store the Hardware ID token." 
                        status="pending"
                    />
                    <ComplianceItem 
                        rule="5.1" 
                        label="Deep Linking Support" 
                        desc="Must support external contentId/mediaType launch commands for all titles." 
                        status="pending"
                    />
                </div>
            </div>

            {/* Source Package */}
            <div className="bg-purple-600/10 border border-purple-500/20 p-10 rounded-[3rem] shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-10">
                <div className="max-w-2xl space-y-4 text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-3">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                        <p className="text-purple-500 font-black uppercase tracking-[0.4em] text-[10px]">Crate TV OS // Step 1</p>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic">Download Source.</h2>
                    <p className="text-gray-400 text-lg font-medium leading-relaxed">
                        Download the raw code package. This is the "source" you will upload to your TV to create the official store-ready <span className="text-white underline underline-offset-4">.pkg</span> file.
                    </p>
                </div>
                <button 
                    onClick={handleDownloadZip}
                    disabled={status === 'generating'}
                    className="bg-white text-black font-black px-12 py-6 rounded-2xl uppercase tracking-widest text-sm shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                >
                    {status === 'generating' ? 'Zipping...' : 'Download Roku Source'}
                </button>
            </div>

            {/* Packaging Workflow */}
            <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[3.5rem] shadow-2xl space-y-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                     <svg className="w-96 h-96 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                </div>
                
                <div className="space-y-4 relative z-10">
                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic">Submission Workflow</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 relative z-10">
                    {[
                        { step: "01", label: "Enter Developer Mode", desc: "On your Roku remote, press: Home (3x), Up (2x), Right, Left, Right, Left, Right. Enable the installer and note your TV's IP address." },
                        { step: "02", label: "Sideload the ZIP", desc: "Open your computer's browser to the TV IP (e.g. 192.168.1.5). Upload the ZIP from Step 1 and click 'Install'." },
                        { step: "03", label: "Establish the Signing Key", desc: "If you haven't yet, use Telnet to access your Roku on port 8080 and run 'genkey'. Note the resulting Dev ID and password." },
                        { step: "04", label: "The Packaging Portal", desc: "On the TV web page, click 'Packager' in the top-right. Enter the password you created and click 'Package'." },
                        { step: "05", label: "Download the .PKG", desc: "A purple link will appear on the TV's web page. Click it to download your signed .pkg file. THIS is what Roku.com requires." },
                        { step: "06", label: "Create Store Entry", desc: "Go to developer.roku.com -> Dashboard -> Add Channel -> Developer SDK. Name it 'Crate TV'." },
                        { step: "07", label: "Upload the .PKG", desc: "In the 'Package Upload' tab of the Roku Dashboard, upload your .pkg file and enter your Dev ID password." },
                        { step: "08", label: "Publish", desc: "Complete the Art and Content Ratings tabs, then submit for certification. Approval takes 24-72 hours." }
                    ].map(s => (
                        <div key={s.step} className="bg-white/5 p-8 rounded-3xl border border-white/5 flex gap-8 items-start hover:bg-white/[0.08] transition-all group">
                            <span className="text-red-600 font-black text-4xl italic group-hover:scale-110 transition-transform">0{s.step.slice(-1)}</span>
                            <div className="space-y-2">
                                <h4 className="text-white font-black uppercase text-xl italic tracking-tight">{s.label}</h4>
                                <p className="text-gray-400 text-sm leading-relaxed max-w-4xl">{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Feed Endpoint */}
            <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[3rem] shadow-xl space-y-6">
                <div>
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">Global Data Relay</h3>
                    <p className="text-[10px] text-gray-700 uppercase font-black tracking-[0.4em] mt-1">This link must be provided in the 'Feed URL' section of your Roku developer portal.</p>
                </div>
                <div className="bg-black border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 shadow-inner">
                    <code className="flex-grow font-mono text-xs text-purple-400 break-all select-all">{productionUrl}</code>
                    <button 
                        onClick={() => handleCopy(productionUrl, 'url')}
                        className={`whitespace-nowrap px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${copyStatus === 'url' ? 'bg-green-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
                    >
                        {copyStatus === 'url' ? 'Copied ✓' : 'Copy Endpoint'}
                    </button>
                </div>
            </div>

            {error && <p className="text-red-500 font-black uppercase text-center bg-red-600/10 p-8 rounded-3xl border border-red-600/20">{error}</p>}
        </div>
    );
};

export default RokuDeployTab;
