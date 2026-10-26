import React from 'react';

// "Want this for your festival?" — shown at the bottom of the PWFF page and
// every partner festival page (Oct 2026). People who watch a festival
// include other organizers and filmmakers, so each festival CRATE hosts
// points the next one to /host (and filmmakers to /premiere).
const go = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
};

const HostWithCrateCta: React.FC<{ className?: string }> = ({ className = '' }) => (
    <aside className={`rounded-2xl border border-white/10 bg-gradient-to-br from-red-600/[0.12] to-transparent p-6 md:p-8 text-center ${className}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-2">Run a film festival?</p>
        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">Want this for your festival?</h3>
        <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">CRATE puts festivals online: tickets, passes, live screenings and payouts. No setup fee.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-5">
            <a href="/host" onClick={e => go(e, '/host')} className="bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-colors">Host your festival on CRATE</a>
            <a href="/premiere" onClick={e => go(e, '/premiere')} className="border border-white/15 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-colors">Premiere your film</a>
        </div>
    </aside>
);

export default HostWithCrateCta;
