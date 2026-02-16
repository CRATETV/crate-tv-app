
import React from 'react';

interface DeepLinkUtilityProps {
    movieKey: string;
    onClose: () => void;
}

const DeepLinkUtility: React.FC<DeepLinkUtilityProps> = ({ movieKey, onClose }) => {
    const baseUrl = window.location.origin;
    
    // Command for standard movie launch (Cold Start)
    const coldStartCommand = `curl -d "" "http://[YOUR_TV_IP]:8060/launch/dev?contentId=${movieKey}&mediaType=movie"`;
    
    // Command for input event (Hot Resume)
    const hotResumeCommand = `curl -d "" "http://[YOUR_TV_IP]:8060/input?contentId=${movieKey}&mediaType=movie"`;

    const displayTitle = movieKey.charAt(0).toUpperCase() + movieKey.slice(1).replace(/_/g, ' ');

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Protocol copied to clipboard.');
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Deep Link Protocol</h2>
                        <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-1">Target Identity: {movieKey}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto scrollbar-hide">
                    
                    {/* Requirement 5.1 Testing Section */}
                    <div className="bg-indigo-600/10 border border-indigo-500/30 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="text-indigo-400 font-bold">🛠️</span>
                            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Roku Hardware Validation (Rule 5.1)</h3>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed uppercase font-bold">
                            Run these commands in your computer's Terminal to verify that "{displayTitle}" launches directly on your Roku TV.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">Test Cold Start (App Closed)</label>
                                <div className="bg-black/60 border border-white/5 p-4 rounded-xl relative group">
                                    <code className="block text-[10px] text-indigo-300 font-mono break-all">{coldStartCommand}</code>
                                    <button onClick={() => copyToClipboard(coldStartCommand)} className="absolute top-2 right-2 p-1 bg-white/5 hover:bg-white/10 rounded">
                                        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">Test Hot Resume (App Already Open)</label>
                                <div className="bg-black/60 border border-white/5 p-4 rounded-xl relative group">
                                    <code className="block text-[10px] text-green-300 font-mono break-all">{hotResumeCommand}</code>
                                    <button onClick={() => copyToClipboard(hotResumeCommand)} className="absolute top-2 right-2 p-1 bg-white/5 hover:bg-white/10 rounded">
                                        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Standard Mapping for Roku Dashboard */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">📋</span>
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Metadata Mapping</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">contentId</label>
                                <div className="flex bg-black p-3 rounded-xl border border-white/5 justify-between items-center group cursor-pointer" onClick={() => copyToClipboard(movieKey)}>
                                    <code className="text-xs text-white font-mono">{movieKey}</code>
                                    <span className="text-[8px] font-black text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">COPY</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">mediaType</label>
                                <div className="flex bg-black p-3 rounded-xl border border-white/5 justify-between items-center group cursor-pointer" onClick={() => copyToClipboard('movie')}>
                                    <code className="text-xs text-white font-mono">movie</code>
                                    <span className="text-[8px] font-black text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">COPY</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-black/40 border-t border-white/5 text-center">
                    <p className="text-[8px] font-black text-gray-700 uppercase tracking-[0.3em]">Crate TV Deep Linking Architecture // SECURE_HUB</p>
                </div>
            </div>
        </div>
    );
};

export default DeepLinkUtility;
