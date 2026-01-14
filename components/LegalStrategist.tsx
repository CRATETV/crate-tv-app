
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const LegalStrategist: React.FC = () => {
    const [title, setTitle] = useState('');
    const [director, setDirector] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [proposal, setProposal] = useState('');
    const [error, setError] = useState('');
    const [mode, setMode] = useState<'licensing' | 'grant'>('grant');

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsAnalyzing(true);
        setError('');
        setProposal('');

        try {
            const res = await fetch('/api/generate-legal-strategy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password: sessionStorage.getItem('adminPassword'),
                    title: title.trim(),
                    director: director.trim(),
                    isGrantMode: mode === 'grant'
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Strategy synthesis failed.');
            setProposal(data.proposal);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Uplink failed.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_red]"></span>
                        <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px]">Crate Acquisition Core</p>
                    </div>
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic mb-4">Strategic Offers.</h2>
                    <p className="text-xl text-gray-400 font-medium leading-relaxed mb-10">Generate curated proposals for high-priority acquisitions like <span className="text-white">Tino</span>.</p>
                    
                    <div className="flex gap-2 mb-8 p-1 bg-black rounded-xl border border-white/5 w-max">
                        <button onClick={() => setMode('grant')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'grant' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Sundance Submission Offer</button>
                        <button onClick={() => setMode('licensing')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'licensing' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>Standard 70/30 License</button>
                    </div>

                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Film Title (e.g. Tino)..." className="form-input !bg-black/40 border-white/10" required />
                            <input type="text" value={director} onChange={e => setDirector(e.target.value)} placeholder="Director (Optional)..." className="form-input !bg-black/40 border-white/10" />
                        </div>
                        <button type="submit" disabled={isAnalyzing} className={`w-full text-black font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 ${mode === 'grant' ? 'bg-amber-500 hover:bg-amber-400' : 'bg-white hover:bg-red-600 hover:text-white'}`}>
                            {isAnalyzing ? 'Analyzing Intellectual Property...' : mode === 'grant' ? 'Synthesize Sundance Offer' : 'Generate Partnership Proposal'}
                        </button>
                    </form>
                </div>
            </div>

            {isAnalyzing && (
                <div className="py-20 flex flex-col items-center justify-center space-y-6 animate-pulse">
                    <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-red-500 font-black uppercase tracking-[0.3em] text-xs">Synthesizing High-Stakes Narrative...</p>
                </div>
            )}

            {proposal && (
                <div className="bg-white/5 border border-white/10 p-12 rounded-[3.5rem] shadow-2xl space-y-8 animate-[fadeIn_0.5s_ease-out]">
                    <div className="flex justify-between items-center border-b border-white/5 pb-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Proposed Outreach Manifest</h3>
                        <div className="flex gap-4">
                             <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 uppercase">Sundance Fee Included</span>
                             <button onClick={() => { navigator.clipboard.writeText(proposal); alert('Proposal Copied.'); }} className="text-red-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors underline underline-offset-4">Copy to Clipboard</button>
                        </div>
                    </div>
                    <div className="prose prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap font-serif text-lg text-gray-300 leading-relaxed bg-black/40 p-8 rounded-3xl border border-white/5 shadow-inner">
                            {proposal}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LegalStrategist;
