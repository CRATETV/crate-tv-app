import React, { useState, useEffect, useRef } from 'react';
import { Actor } from '../types';
import { findImdbUrl } from '../services/geminiService';

interface ActorBioModalProps {
  actor: Actor;
  onClose: () => void;
}

const ActorBioModal: React.FC<ActorBioModalProps> = ({ actor, onClose }) => {
  const [imdbUrl, setImdbUrl] = useState<string | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    setImdbUrl(null);
    setIsImageLoaded(false);

    findImdbUrl(actor.name).then(url => {
        setImdbUrl(url);
    }).catch(() => null);
  }, [actor]);

  const handleShare = async () => {
    if (isSharing || !modalContentRef.current) return;
    setIsSharing(true);

    const slug = actor.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
    const profileUrl = `${window.location.origin}/actors-directory/${slug}`;

    try {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(modalContentRef.current, {
            backgroundColor: '#111827',
            useCORS: true,
            scale: 2,
        });
        
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Could not create image.');

        const file = new File([blob], `${actor.name.replace(/\s/g, '_')}_profile.png`, { type: 'image/png' });
        
        const shareData = {
            title: `${actor.name} on Crate TV`,
            text: `Check out the professional profile for ${actor.name} on Crate TV.`,
            url: profileUrl,
            files: [file]
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(profileUrl);
            alert("Profile link copied to clipboard!");
        }
    } catch (error) {
        console.error("Share failed", error);
        // Fallback to simple link copy
        navigator.clipboard.writeText(profileUrl);
        alert("Profile link copied!");
    } finally {
        setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
      <div 
        ref={modalContentRef}
        className="bg-[#0a0a0a] rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative border border-white/10" 
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white z-10 p-2 bg-white/5 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="grid grid-cols-1 md:grid-cols-5 h-full">
            <div className="md:col-span-2 p-10 flex flex-col items-center justify-center bg-white/[0.02] border-r border-white/5">
                 <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
                    <img
                        src={`/api/proxy-image?url=${encodeURIComponent(actor.highResPhoto)}`}
                        alt={actor.name}
                        crossOrigin="anonymous"
                        className={`relative w-48 h-48 md:w-64 md:h-64 rounded-full object-cover shadow-2xl border-4 border-black transition-all duration-1000 ease-in-out ${isImageLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-xl scale-95'}`}
                        onLoad={() => setIsImageLoaded(true)}
                    />
                 </div>
                 <div className="mt-8 space-y-4 w-full">
                    <button 
                        onClick={handleShare} 
                        disabled={isSharing}
                        className="w-full flex items-center justify-center gap-3 bg-white text-black font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all transform active:scale-95 shadow-xl"
                    >
                        {isSharing ? (
                            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        )}
                        {isSharing ? 'Capturing...' : 'Share Profile'}
                    </button>
                    {imdbUrl && (
                        <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center bg-[#f5c518] text-black font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-yellow-400 transition-all shadow-lg">
                            Professional IMDb
                        </a>
                    )}
                 </div>
            </div>
            <div className="md:col-span-3 p-10 flex flex-col justify-center">
                <div className="mb-8">
                    <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px] mb-2">Featured Talent</p>
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">{actor.name}</h2>
                </div>
                <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 text-lg md:text-xl leading-relaxed font-medium">
                        {actor.bio}
                    </p>
                </div>
                <div className="mt-10 pt-8 border-t border-white/5">
                     <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Available for Casting via Crate Terminal</p>
                     </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ActorBioModal;