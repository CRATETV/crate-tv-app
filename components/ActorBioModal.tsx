import React, { useState, useEffect } from 'react';
import { Actor } from '../types';
import { generateActorFact } from '../services/geminiService';

interface ActorBioModalProps {
  actor: Actor;
  onClose: () => void;
}

const ActorBioModal: React.FC<ActorBioModalProps> = ({ actor, onClose }) => {
  const [fact, setFact] = useState<string | null>(null);
  const [isLoadingFact, setIsLoadingFact] = useState<boolean>(true);
  const [factError, setFactError] = useState<string | null>(null);

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

    const fetchFact = async () => {
      try {
        const generatedFact = await generateActorFact(actor.name, actor.bio);
        setFact(generatedFact);
      } catch (error) {
        setFactError(error instanceof Error ? error.message : "Could not load fun fact.");
      } finally {
        setIsLoadingFact(false);
      }
    };

    fetchFact();
  }, [actor]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="md:col-span-1 p-6 flex flex-col items-center justify-center">
                 <img src={actor.highResPhoto} alt={actor.name} className="w-48 h-48 rounded-full object-cover shadow-lg border-4 border-gray-700"/>
            </div>
            <div className="md:col-span-2 p-6 md:pl-0 flex flex-col justify-center">
                <h2 className="text-3xl font-bold text-white mb-2">{actor.name}</h2>
                <div className="text-gray-300 text-base leading-relaxed mb-6">
                    <p>{actor.bio}</p>
                </div>

                {/* AI Fun Fact Section */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
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