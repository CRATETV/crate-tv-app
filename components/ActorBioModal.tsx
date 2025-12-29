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

    // Fetch IMDb (Non-blocking)
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
            backgroundColor: '#2d3748',
            useCORS: true,
        });
        
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Could not create image.');

        const file = new File([blob], `${actor.name.replace(/\s/g, '_')}_bio.png`, { type: 'image/png' });
        
        const shareData = {
            title: `About ${actor.name} on Crate TV`,
            text: `Check out this bio for ${actor.name} from Crate TV.`,
            url: profileUrl,
            files: [file]
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else if (navigator.share) {
             await navigator.share({ title: shareData.title, text: shareData.text, url: shareData.url });
        } else {
            await navigator.clipboard.writeText(profileUrl);
            alert("Profile link copied!");
        }
    } catch (error) {
        console.error("Share failed", error);
    } finally {
        setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
      <div 
        ref={modalContentRef}
        className="bg-[#111] rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative border border-white/10" 
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-white z-10 p-2 bg-white/5 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="md:col-span-1 p-8 flex flex-col items-center justify-center bg-white/[0.02]">
                 <img
                    src={`/api/proxy-image?url=${encodeURIComponent(actor.highResPhoto)}`}
                    alt={actor.name}
                    crossOrigin="anonymous"
                    className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full object-cover shadow-2xl border-4 border-red-600 transition-all duration-700 ease-in-out ${isImageLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-xl scale-90'}`}
                    onLoad={() => setIsImageLoaded(true)}
                 />
            </div>
            <div className="md:col-span-2 p-8 md:pl-0 flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                    <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter">{actor.name}</h2>
                    <div className="flex items-center gap-2">
                        {imdbUrl && (
                            <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className="bg-[#f5c518] text-black font-black text-[10px] px-3 py-1 rounded-md hover:bg-yellow-400 transition-colors uppercase tracking-widest">IMDb</a>
                        )}
                        <button onClick={handleShare} disabled={isSharing} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10">
                            {isSharing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 100-2.186m0 2.186c-.18.324-.283.696-.283 1.093s.103.77.283 1.093m0-2.186l-9.566-5.314" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
                <div className="text-gray-300 text-lg leading-relaxed font-medium">
                    <p>{actor.bio}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ActorBioModal;