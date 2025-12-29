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
        className="bg-[#2d3748] rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative border border-gray-700" 
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="md:col-span-1 p-4 sm:p-6 flex flex-col items-center justify-center">
                 <img
                    src={`/api/proxy-image?url=${encodeURIComponent(actor.highResPhoto)}`}
                    alt={actor.name}
                    crossOrigin="anonymous"
                    className={`w-32 h-32 sm:w-48 sm:h-48 rounded-full object-cover shadow-lg border-4 border-gray-600 transition-all duration-500 ease-in-out ${isImageLoaded ? 'opacity-100 blur-0' : 'opacity-50 blur-md'}`}
                    onLoad={() => setIsImageLoaded(true)}
                 />
            </div>
            <div className="md:col-span-2 p-4 sm:p-6 md:pl-0 flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">{actor.name}</h2>
                    {imdbUrl && (
                        <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className="bg-[#f5c518] text-black font-bold text-sm px-3 py-1 rounded-md hover:bg-yellow-400 transition-colors self-center">IMDb</a>
                    )}
                    <button onClick={handleShare} disabled={isSharing} className="text-gray-400 hover:text-white transition-colors self-center p-1 rounded-full hover:bg-gray-700">
                        {isSharing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25(2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 100-2.186m0 2.186c-.18.324-.283.696-.283 1.093s1.03.77.283 1.093m0-2.186l-9.566-5.314" />
                            </svg>
                        )}
                    </button>
                </div>
                <div className="text-gray-300 text-base leading-relaxed">
                    <p>{actor.bio}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ActorBioModal;