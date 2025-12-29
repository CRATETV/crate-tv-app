import React, { useState, useMemo } from 'react';
import { useFestival } from '../contexts/FestivalContext';

interface PitchDeckManagerProps {
    onSave: (settings: any) => Promise<void>;
    isSaving: boolean;
}

const PitchDeckManager: React.FC<PitchDeckManagerProps> = ({ onSave, isSaving }) => {
    const { settings } = useFestival();
    const [targetCompany, setTargetCompany] = useState(settings.pitchTargetCompany || 'LIFT LABS');
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    const handleSaveDefault = async () => {
        await onSave({ ...settings, pitchTargetCompany: targetCompany.trim() });
    };

    const tailoredLink = useMemo(() => {
        const base = window.location.origin;
        const name = encodeURIComponent(targetCompany.trim());
        return `${base}/pitchdeck?for=${name}`;
    }, [targetCompany]);

    const handleCopyTailoredLink = () => {
        navigator.clipboard.writeText(tailoredLink);
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
    };

    return (
        <div className="space-y-12 pb-20 animate-[fadeIn_0.5s_ease-out]">
            <div className="max-w-4xl mx-auto text-center space-y-6">
                <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-500/20 px-4 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[9px]">Strategic Presentation Engine</p>
                </div>
                <h1 className="text-6xl font-black uppercase tracking-tighter text-white">Pitch Master <span className="text-red-600">V3</span></h1>
                <p className="text-gray-500 font-medium leading-relaxed max-w-2xl mx-auto">
                    Taylor the strategic narrative for specific partners. Generate unique, encrypted-style links that instantly re-brand the entire deck for the recipient.
                </p>
            </div>

            <div className="max-w-3xl mx-auto bg-gray-900 border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <svg className="w-32 h-32 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 block">01. Recipient Configuration</label>
                    <input 
                        type="text" 
                        value={targetCompany}
                        onChange={(e) => setTargetCompany(e.target.value)}
                        placeholder="Company Name (e.g. Netflix)"
                        className="w-full bg-white/5 border border-white/10 text-white p-6 rounded-2xl font-black text-center text-3xl tracking-tighter focus:outline-none focus:border-red-600 transition-all placeholder:text-gray-800"
                    />
                    <div className="flex justify-between items-center px-2">
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Global Default: "{settings.pitchTargetCompany || 'None'}"</p>
                        <button onClick={handleSaveDefault} disabled={isSaving} className="text-[10px] text-red-500 font-black uppercase tracking-widest hover:underline disabled:opacity-20">Set as Global Default</button>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 block">02. Tailored Share Link</label>
                    <div className="bg-black/40 border border-white/10 p-4 rounded-xl flex items-center justify-between gap-4">
                        <code className="text-xs text-gray-400 truncate font-mono">{tailoredLink}</code>
                        <button 
                            onClick={handleCopyTailoredLink}
                            className={`flex-shrink-0 font-black px-6 py-2 rounded-lg uppercase text-[10px] tracking-widest transition-all ${copyStatus === 'copied' ? 'bg-green-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
                        >
                            {copyStatus === 'copied' ? 'Copied!' : 'Copy Link'}
                        </button>
                    </div>
                </div>

                <div className="pt-10 border-t border-white/5 flex flex-col items-center gap-4">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Live Preview</p>
                    <a 
                        href={`/pitchdeck?for=${encodeURIComponent(targetCompany)}`} 
                        target="_blank" 
                        className="group bg-red-600/10 border border-red-500/20 px-8 py-5 rounded-2xl flex items-center gap-4 transition-all hover:bg-red-600/20 hover:scale-[1.02] active:scale-95 shadow-xl"
                    >
                        <span className="text-red-500 text-sm font-black uppercase tracking-widest">Launch Dynamic Presentation</span>
                        <svg className="w-5 h-5 text-red-500 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </a>
                </div>
            </div>
            
            <div className="max-w-2xl mx-auto bg-white/5 border border-white/5 p-6 rounded-2xl">
                <div className="flex gap-4">
                    <div className="bg-blue-600/20 p-2 rounded-lg h-fit text-blue-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xs font-black text-white uppercase">Pro Tip: Deep Branding</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed font-medium">Use the "Set as Global Default" button to update the generic `/pitchdeck` link. Use the specialized generator above for high-stakes 1-on-1 meetings where you want the partner's name visible from the moment they click.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PitchDeckManager;