
import React, { useState } from 'react';

const RokuForge: React.FC = () => {
    const [copyStatus, setCopyStatus] = useState(false);

    const REMOTE_FIX_PROMPT = `Act as a Senior Roku SDK Architect. I have a SceneGraph application where the Keyboard node in my SearchScene is unresponsive to remote clicks. 

Please provide the BrightScript logic for SearchScene.brs that:
1. In init(), sets m.keyboard.setFocus(true) so the remote starts there.
2. Sets an observer on m.keyboard.text that triggers a function called onTextChange.
3. Implements an onKeyEvent function that handles the 'OK' and 'Back' buttons. Crucially, ensure that if the keyboard is focused, the function returns false for standard keys so the Keyboard node can process the internal letter selection itself.
4. Add a searchCatalog(query) function that uses roUrlTransfer to hit https://cratetv.net/api/roku-feed?q= + query.`;

    const handleCopy = () => {
        navigator.clipboard.writeText(REMOTE_FIX_PROMPT);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 3000);
    };

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#050505] border border-red-600/20 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-12 scale-150">
                    <h1 className="text-[18rem] font-black italic text-red-600">FORGE</h1>
                </div>
                
                <div className="relative z-10 max-w-4xl space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_#ef4444]"></div>
                            <p className="text-red-500 font-black uppercase tracking-[0.5em] text-[11px]">Hardware Logic Repair</p>
                        </div>
                        <h2 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter italic leading-none">The Forge.</h2>
                        <p className="text-2xl text-gray-500 font-medium leading-relaxed max-w-3xl">
                            Standard web AI models often forget the strict <span className="text-white">Focus Chain</span> requirements of Roku OS. Use the specialized prompts below to fix hardware input issues.
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-6 backdrop-blur-xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest italic">Remote & Keyboard Patch</h3>
                            <button 
                                onClick={handleCopy}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copyStatus ? 'bg-green-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
                            >
                                {copyStatus ? 'Protocol Copied ✓' : 'Copy Fix Prompt'}
                            </button>
                        </div>
                        <div className="bg-black/60 p-6 rounded-2xl border border-white/5 font-mono text-[11px] text-indigo-400 overflow-x-auto leading-relaxed">
                            {REMOTE_FIX_PROMPT}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl space-y-4">
                    <h4 className="text-red-500 font-black uppercase text-xs tracking-widest">Why it breaks</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">Roku's `onKeyEvent` is a bubbling event. If your logic "swallows" the OK button at the Scene level, it never reaches the Keyboard's internal grid. This prompt forces the AI to implement a bypass for the input node.</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl space-y-4">
                    <h4 className="text-indigo-500 font-black uppercase text-xs tracking-widest">Focus Chain Rule</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">A node is only "active" if it has focus. The provided prompt ensures `m.keyboard.setFocus(true)` is called immediately upon the Search Scene entering the viewport.</p>
                </div>
            </div>
        </div>
    );
};

export default RokuForge;
