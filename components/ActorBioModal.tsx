import React, { useState, useEffect, useRef } from 'react';
import { Actor } from '../types';
import { generateActorFact, findImdbUrl } from '../services/geminiService';
import html2canvas from 'html2canvas';

interface ActorBioModalProps {
  actor: Actor;
  onClose: () => void;
}

const ActorBioModal: React.FC<ActorBioModalProps> = ({ actor, onClose }) => {
  const [fact, setFact] = useState<string | null>(null);
  const [isLoadingFact, setIsLoadingFact] = useState<boolean>(true);
  const [factError, setFactError] = useState<string | null>(null);
  const [imdbUrl, setImdbUrl] = useState<string | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
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
    // Reset state when actor changes
    setIsLoadingFact(true);
    setFact(null);
    setFactError(null);
    setImdbUrl(null);
    setIsImageLoaded(false);
    setCopyStatus('idle');

    const fetchActorData = async () => {
      // Fetch fact
      try {
        const generatedFact = await generateActorFact(actor.name, actor.bio);
        setFact(generatedFact);
      } catch (error) {
        setFactError(error instanceof Error ? error.message : "Could not load fun fact.");
      } finally {
        setIsLoadingFact(false);
      }
      
      // Fetch IMDb URL non-critically.
      findImdbUrl(actor.name).then(url => {
          setImdbUrl(url);
      });
    };

    fetchActorData();
  }, [actor]);

  const handleShare = async () => {
    if (isSharing || !modalContentRef.current) return;
    setIsSharing(true);
    setCopyStatus('idle');

    try {
        const canvas = await html2canvas(modalContentRef.current, {
            backgroundColor: '#2d3748', // Match the modal's background
            useCORS: true, // Important for external images
        });
        
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        
        if (!blob) {
            throw new Error('Could not create image from modal.');
        }

        const file = new File([blob], `${actor.name.replace(/\s/g, '_')}_bio.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: `About ${actor.name}`,
                text: `Check out this bio for ${actor.name} from Crate TV.`,
            });
        } else if (navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2500);
        } else {
            throw new Error('Image sharing is not supported on this browser.');
        }
    } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
             console.error('Sharing failed:', error);
             setCopyStatus('error');
             setTimeout(() => setCopyStatus('idle'), 2500);
        }
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
        
        <img
            src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png"
            alt="Crate TV Logo"
            crossOrigin="anonymous"
            className="absolute top-4 left-6 w-32 h-auto opacity-50 pointer-events-none"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="md:col-span-1 p-4 sm:p-6 flex flex-col items-center justify-center">
                 <img
                    src={`/api/proxy-image?url=${encodeURIComponent(actor.highResPhoto)}`}
                    alt={actor.name}
                    crossOrigin="anonymous"
                    className={`w-32 h-32 sm:w-48 sm:h-48 rounded-full object-cover shadow-lg border-4 border-gray-600 transition-all duration-500 ease-in-out ${isImageLoaded ? 'opacity-100 blur-0' : 'opacity-50 blur-md'}`}
                    onLoad={() => setIsImageLoaded(true)}
                    decoding="async"
                    onContextMenu={(e) => e.preventDefault()}
                 />
            </div>
            <div className="md:col-span-2 p-4 sm:p-6 md:pl-0 flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">{actor.name}</h2>
                    {imdbUrl && (
                        <a
                            href={imdbUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#f5c518] text-black font-bold text-sm px-3 py-1 rounded-md hover:bg-yellow-400 transition-colors self-center"
                            aria-label={`Visit ${actor.name}'s IMDb page`}
                        >
                            IMDb
                        </a>
                    )}
                    <button
                        onClick={handleShare}
                        disabled={isSharing}
                        className="text-gray-400 hover:text-white transition-colors self-center p-1 rounded-full hover:bg-gray-700 disabled:cursor-wait"
                        aria-label="Share actor bio"
                    >
                        {isSharing ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 100-2.186m0 2.186c-.18.324-.283.696-.283 1.093s.103.77.283 1.093m0-2.186l-9.566-5.314" />
                            </svg>
                        )}
                    </button>
                    {copyStatus === 'copied' && (
                        <span className="text-sm text-green-400 transition-opacity animate-[fadeIn_0.3s_ease-out]">Image copied!</span>
                    )}
                    {copyStatus === 'error' && (
                        <span className="text-sm text-red-400 transition-opacity animate-[fadeIn_0.3s_ease-out]">Failed to share.</span>
                    )}
                </div>
                <div className="text-gray-300 text-base leading-relaxed mb-6">
                    <p>{actor.bio}</p>
                </div>

                {/* AI Fun Fact Section */}
                <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-400 mb-2">✨ AI Fun Fact</h3>
                  {isLoadingFact && (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-gray-400"></div>
                      <p className="text-gray-400 text-sm">Generating a fun fact...</p>
                    </div>
                  )}
                  {factError && (
                    <p className="text-yellow-500 text-sm">{factError}</p>
                  )}
                  {fact && !isLoadingFact && (
                     <p className="text-white italic">"{fact}"</p>
                  )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ActorBioModal;