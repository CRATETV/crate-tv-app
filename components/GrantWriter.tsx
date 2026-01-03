
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const GrantWriter: React.FC = () => {
    const [type, setType] = useState('tech');
    const [organization, setOrganization] = useState('');
    const [draft, setDraft] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const generateDraft = async () => {
        setIsLoading(true);
        setDraft('');
        const password = sessionStorage.getItem('adminPassword');

        try {
            const res = await fetch('/api/generate-grant-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, type, organization }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Generation failed");
            setDraft(data.draft);
        } catch (e) {
            alert("Uplink failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-white/5 p-8 md:p-12 rounded-[2.5rem] shadow-2xl space-y-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">AI Grant Application Assistant</h2>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Convert platform metadata into funding proposals</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <label className="form-label">Funding Category</label>
                            <select 
                                value={type} 
                                onChange={e => setType(e.target.value)}
                                className="form-input bg-black/40 border-white/10"
                            >
                                <option value="tech">Technology / Cloud Credits (AWS/Google)</option>
                                <option value="arts">Arts & Culture (NEA / Sundance)</option>
                                <option value="diversity">Diversity & Small Biz (Amber Grant)</option>
                                <option value="local">Philadelphia Regional Development</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Target Organization Name</label>
                            <input 
                                type="text" 
                                value={organization} 
                                onChange={e => setOrganization(e.target.value)}
                                placeholder="e.g. Amazon Web Services"
                                className="form-input bg-black/40 border-white/10"
                            />
                        </div>
                        <button 
                            onClick={generateDraft}
                            disabled={isLoading || !organization}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 disabled:opacity-30"
                        >
                            {isLoading ? 'Synthesizing Narrative...' : 'Generate Formal Proposal'}
                        </button>
                    </div>

                    <div className="bg-black/60 border border-white/5 rounded-3xl p-8 relative overflow-hidden min-h-[400px]">
                        {!draft && !isLoading ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-20 space-y-4">
                                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                <p className="text-sm font-black uppercase tracking-widest">Awaiting Parameter Selection</p>
                            </div>
                        ) : isLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <LoadingSpinner />
                            </div>
                        ) : (
                            <div className="animate-[fadeIn_0.5s_ease-out] space-y-6">
                                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Formal Draft Manifest</span>
                                    <button onClick={() => { navigator.clipboard.writeText(draft); alert('Proposal copied.'); }} className="text-red-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Copy to Clipboard</button>
                                </div>
                                <div className="prose prose-invert prose-sm max-w-none text-gray-300 font-serif leading-relaxed">
                                    <pre className="whitespace-pre-wrap font-serif">{draft}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GrantWriter;
