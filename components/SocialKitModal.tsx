import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import LoadingSpinner from './LoadingSpinner';

interface SocialKitModalProps {
    title: string;
    synopsis: string;
    director: string;
    onClose: () => void;
}

const CopySection: React.FC<{ label: string; posts: string[] }> = ({ label, posts }) => (
    <div className="space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500">{label}</h4>
        {posts.map((post, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-lg relative group">
                <p className="text-sm text-gray-300 pr-8">{post}</p>
                <button 
                    onClick={() => { navigator.clipboard.writeText(post); alert('Copied!'); }}
                    className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                </button>
            </div>
        ))}
    </div>
);

const SocialKitModal: React.FC<SocialKitModalProps> = ({ title, synopsis, director, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [kit, setKit] = useState<{ copy: any, image: string } | null>(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'social' | 'press'>('social');

    useEffect(() => {
        const generateKit = async () => {
            const password = sessionStorage.getItem('adminPassword');
            try {
                const res = await fetch('/api/generate-social-assets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, synopsis, director, password }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to generate assets.');
                setKit(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error.');
            } finally {
                setIsLoading(false);
            }
        };
        generateKit();
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, [title, synopsis, director]);

    const handleDownloadAll = async () => {
        if (!kit) return;
        const zip = new JSZip();
        zip.file(`${title.replace(/\s/g, '_')}_Promo.png`, kit.image, { base64: true });
        
        const textContent = `
CRATE TV SOCIAL KIT: ${title}
---------------------------------
INSTAGRAM:
${kit.copy.instagram.join('\n\n')}

X (TWITTER):
${kit.copy.twitter.join('\n\n')}

PRESS RELEASE:
${kit.copy.pressRelease}

HASHTAGS:
${kit.copy.hashtags.join(' ')}
        `.trim();
        zip.file(`${title.replace(/\s/g, '_')}_Assets.txt`, textContent);
        
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CrateTV_SocialKit_${title.replace(/\s/g, '_')}.zip`;
        link.click();
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[120] p-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-[#0f0f0f] rounded-[2rem] border border-white/10 shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">AI Press & Social Kit</h2>
                        <div className="flex gap-4 mt-4">
                            <button onClick={() => setActiveTab('social')} className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 ${activeTab === 'social' ? 'text-red-500 border-red-500' : 'text-gray-500 border-transparent'}`}>Social Feed</button>
                            <button onClick={() => setActiveTab('press')} className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 ${activeTab === 'press' ? 'text-red-500 border-red-500' : 'text-gray-500 border-transparent'}`}>Official Press Release</button>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-8 scrollbar-hide">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center space-y-6">
                            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-red-500 font-black uppercase tracking-widest text-xs animate-pulse">Gemini is rendering cinematic assets...</p>
                        </div>
                    ) : kit && (
                        activeTab === 'social' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-[fadeIn_0.5s_ease-out]">
                                <div className="space-y-6">
                                    <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
                                        <img src={`data:image/png;base64,${kit.image}`} className="w-full h-full object-cover" alt="AI Still" />
                                    </div>
                                    <div className="p-6 bg-white/5 rounded-2xl">
                                        <h4 className="text-[10px] font-black uppercase text-gray-500 mb-3">Hashtags</h4>
                                        <p className="text-sm text-gray-400 font-mono">{kit.copy.hashtags.join(' ')}</p>
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    <CopySection label="Instagram Options" posts={kit.copy.instagram} />
                                    <CopySection label="X (Twitter) Options" posts={kit.copy.twitter} />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/5 p-12 rounded-3xl border border-white/5 font-serif text-gray-200 leading-relaxed text-lg max-w-3xl mx-auto shadow-inner">
                                <pre className="whitespace-pre-wrap font-serif">{kit.copy.pressRelease}</pre>
                            </div>
                        )
                    )}
                </div>

                <div className="p-8 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
                    <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed uppercase font-bold tracking-tighter">AI generated press release follows industry AP standards.</p>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-4 text-gray-400 hover:text-white uppercase font-black text-xs">Discard</button>
                        <button onClick={handleDownloadAll} className="bg-red-600 hover:bg-red-700 text-white font-black px-10 py-4 rounded-xl shadow-xl shadow-red-900/20 uppercase tracking-widest text-xs transition-all transform active:scale-95">Download Full Kit (.zip)</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialKitModal;