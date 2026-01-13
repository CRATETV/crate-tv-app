import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import LoadingSpinner from './LoadingSpinner';

interface SocialKitModalProps {
    title: string;
    synopsis: string;
    director: string;
    poster: string;
    onClose: () => void;
    isEditorialRepurpose?: boolean;
}

const CopySection: React.FC<{ label: string; posts: string[] }> = ({ label, posts }) => (
    <div className="space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500">{label}</h4>
        {posts.map((post, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-lg relative group">
                <p className="text-sm text-gray-300 pr-8 leading-relaxed">{post}</p>
                <button 
                    onClick={() => { navigator.clipboard.writeText(post); alert('Copied!'); }}
                    className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                </button>
            </div>
        ))}
    </div>
);

const SocialKitModal: React.FC<SocialKitModalProps> = ({ title, synopsis, director, poster, onClose, isEditorialRepurpose = false }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [kit, setKit] = useState<{ copy: any } | null>(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'social' | 'story' | 'press'>(isEditorialRepurpose ? 'story' : 'social');

    useEffect(() => {
        const generateKit = async () => {
            const password = sessionStorage.getItem('adminPassword');
            try {
                const res = await fetch('/api/generate-social-assets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, synopsis, director, password, isEditorialRepurpose }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to generate assets.');
                setKit(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Uplink failed.');
            } finally {
                setIsLoading(false);
            }
        };
        generateKit();
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, [title, synopsis, director, isEditorialRepurpose]);

    const handleDownloadAll = async () => {
        if (!kit) return;
        const zip = new JSZip();
        
        try {
            const posterRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(poster)}`);
            if (posterRes.ok) {
                const blob = await posterRes.blob();
                zip.file(`${title.replace(/\s/g, '_')}_Official_Art.png`, blob);
            }
        } catch (e) {
            console.warn("Poster fetch failed for zip export.");
        }
        
        const textContent = `
CRATE TV SOCIAL KIT: ${title}
TYPE: ${isEditorialRepurpose ? 'EDITORIAL REPURPOSE' : 'WATCH PARTY PROMO'}
---------------------------------
${isEditorialRepurpose ? 'INSTAGRAM CAROUSEL SLIDES:' : 'STORY SLIDE MANIFEST (FOR CANVA):'}
${(kit.copy.storySlides || []).map((s: string, i: number) => `SLIDE ${i+1}:\n${s}`).join('\n\n')}

INSTAGRAM DISPATCHES:
${(kit.copy.instagram || []).join('\n\n')}

X (TWITTER) DISPATCHES:
${(kit.copy.twitter || []).join('\n\n')}

${isEditorialRepurpose ? '' : `PRESS RELEASE MASTER:\n${kit.copy.pressRelease || '---'}`}

COMMUNITY HASHTAGS:
${(kit.copy.hashtags || []).join(' ')}
        `.trim();
        zip.file(`${title.replace(/\s/g, '_')}_Campaign_Manifest.txt`, textContent);
        
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CrateTV_${isEditorialRepurpose ? 'Repurpose' : 'Promo'}_${title.replace(/\s/g, '_')}.zip`;
        link.click();
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[120] p-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-[#0f0f0f] rounded-[2rem] border border-white/10 shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                            {isEditorialRepurpose ? 'AI Narrative Repurposer' : 'AI Press & Social Kit'}
                        </h2>
                        {!error && !isLoading && (
                            <div className="flex gap-4 mt-4">
                                <button onClick={() => setActiveTab('story')} className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'story' ? 'text-red-500 border-red-500' : 'text-gray-500 border-transparent hover:text-white'}`}>
                                    {isEditorialRepurpose ? 'Carousel Slides' : 'Story Slides'}
                                </button>
                                <button onClick={() => setActiveTab('social')} className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'social' ? 'text-red-500 border-red-500' : 'text-gray-500 border-transparent hover:text-white'}`}>Feed Captions</button>
                                {!isEditorialRepurpose && (
                                    <button onClick={() => setActiveTab('press')} className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'press' ? 'text-red-500 border-red-500' : 'text-gray-500 border-transparent hover:text-white'}`}>Official Press Dispatch</button>
                                )}
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-8 scrollbar-hide">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center space-y-6">
                            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-red-500 font-black uppercase tracking-widest text-xs animate-pulse">
                                {isEditorialRepurpose ? 'Gemini is dissecting the narrative...' : 'Gemini is synthesizing viral dispatches...'}
                            </p>
                        </div>
                    ) : error ? (
                        <div className="p-12 text-center text-red-500 uppercase font-black tracking-widest border border-red-500/20 rounded-3xl">{error}</div>
                    ) : kit && (
                        activeTab === 'social' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-[fadeIn_0.5s_ease-out]">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                         <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Master Key Art</label>
                                         <div className="aspect-[2/3] max-w-[300px] mx-auto bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl group relative">
                                            <img src={poster} className="w-full h-full object-cover" alt="Official Poster" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                                        <h4 className="text-[10px] font-black uppercase text-gray-500 mb-3 tracking-widest">Recommended Hashtags</h4>
                                        <p className="text-sm text-gray-400 font-mono leading-relaxed">{(kit.copy.hashtags || []).join(' ')}</p>
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    <CopySection label="Instagram Optimized Captions" posts={kit.copy.instagram} />
                                    <CopySection label="X (Twitter) Short-Form" posts={kit.copy.twitter} />
                                    {kit.copy.facebook && kit.copy.facebook.length > 0 && <CopySection label="Facebook Community Posts" posts={kit.copy.facebook} />}
                                </div>
                            </div>
                        ) : activeTab === 'story' ? (
                            <div className="max-w-4xl mx-auto space-y-10 animate-[fadeIn_0.5s_ease-out]">
                                <div className="bg-red-600/10 border border-red-500/20 p-6 rounded-2xl text-center">
                                    <p className="text-xs font-black uppercase tracking-widest text-red-500">
                                        {isEditorialRepurpose ? 'Carousel Sequence Protocol' : 'Canva Manifest Core'}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">Copy these segments into your visual templates.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {(kit.copy.storySlides || []).map((slide: string, i: number) => (
                                        <div key={i} className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl relative group flex flex-col justify-between">
                                            <div>
                                                <span className="text-[8px] font-black text-gray-800 uppercase tracking-widest mb-4 block">SLIDE 0{i+1}</span>
                                                <p className="text-lg font-black text-white uppercase italic tracking-tight leading-relaxed text-center px-4">
                                                    {slide}
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => { navigator.clipboard.writeText(slide); alert('Slide content copied!'); }}
                                                className="mt-6 w-full py-2 bg-white/5 hover:bg-white text-gray-500 hover:text-black font-black uppercase text-[9px] tracking-widest rounded-lg transition-all border border-white/5"
                                            >
                                                Copy Slide Text
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/5 p-12 rounded-3xl border border-white/5 font-serif text-gray-200 leading-relaxed text-lg max-w-3xl mx-auto shadow-inner">
                                <p className="text-[10px] font-black uppercase text-gray-600 mb-8 tracking-[0.6em] text-center">OFFICIAL PRESS RELEASE // FOR IMMEDIATE DISPATCH</p>
                                <pre className="whitespace-pre-wrap font-serif text-gray-300">{kit.copy.pressRelease}</pre>
                                <div className="mt-12 pt-8 border-t border-white/5 text-center">
                                    <p className="text-[10px] font-black uppercase text-gray-700 tracking-widest">Authorized by Crate TV Editorial Core</p>
                                </div>
                            </div>
                        )
                    )}
                </div>

                <div className="p-8 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                         <p className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">
                            {isEditorialRepurpose ? 'Conversion logic: NARRATIVE -> SOCIAL_CAROUSEL' : 'AI synthesis is currently focusing on semantic payload optimization.'}
                         </p>
                         <p className="text-[8px] text-gray-700 uppercase font-bold tracking-widest">Aesthetic Audit: {isEditorialRepurpose ? 'PASSED' : 'SUCCESSFUL'}</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-4 text-gray-500 hover:text-white transition-colors uppercase font-black text-xs tracking-widest">Cancel</button>
                        {!error && !isLoading && (
                            <button 
                                onClick={handleDownloadAll} 
                                className="bg-red-600 hover:bg-red-700 text-white font-black px-10 py-4 rounded-xl shadow-[0_20px_50px_rgba(239,68,68,0.3)] uppercase tracking-widest text-xs transition-all transform active:scale-95 flex items-center gap-3"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                {isEditorialRepurpose ? 'Export Campaign Bundle' : 'Export Kit Bundle (.zip)'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialKitModal;