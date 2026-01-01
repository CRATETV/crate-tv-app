import React from 'react';
import { CrateFestConfig } from '../types';

interface CrateFestBannerProps {
    config: CrateFestConfig;
    hasPass: boolean;
}

const CrateFestBanner: React.FC<CrateFestBannerProps> = ({ config, hasPass }) => {
    const handleNavigate = () => {
        window.history.pushState({}, '', '/cratefest');
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div 
            onClick={handleNavigate}
            className="w-full bg-gradient-to-r from-red-600 via-red-800 to-black h-12 flex items-center justify-between px-4 md:px-12 cursor-pointer group hover:opacity-95 transition-all border-b border-white/10 relative z-[60] overflow-hidden"
        >
            {/* Subtle background text for "event" feel */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none select-none">
                <span className="text-5xl font-black uppercase tracking-[1em] whitespace-nowrap italic">{config.title} // OFFICIAL EVENT</span>
            </div>

            <div className="flex items-center gap-6 relative z-10">
                <div className="flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white shadow-[0_0_10px_white]"></span>
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white">LIVE SESSION</span>
                </div>
                <div className="h-5 w-px bg-white/20 hidden sm:block"></div>
                <p className="text-xs font-black text-white tracking-tight uppercase italic truncate max-w-[200px] sm:max-w-none">
                    {config.title}
                </p>
            </div>

            <div className="flex items-center gap-6 relative z-10">
                <span className="hidden md:block text-[9px] font-black uppercase tracking-[0.3em] text-white/50 italic">Limited Availability</span>
                <button className="bg-white text-black font-black px-6 py-1.5 rounded-full text-[10px] uppercase tracking-tighter group-hover:scale-105 transition-transform shadow-xl">
                    {hasPass ? 'Enter Portal' : 'Get Digital Pass'}
                </button>
            </div>
        </div>
    );
};

export default CrateFestBanner;