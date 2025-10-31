import React, { useEffect } from 'react';
import { Movie, FestivalDay, FestivalConfig } from '../types';
import FestivalView from './FestivalView';

interface FestivalModalProps {
    festivalData: FestivalDay[];
    festivalConfig: FestivalConfig;
    allMovies: Record<string, Movie>;
    onClose: () => void;
}

const FestivalModal: React.FC<FestivalModalProps> = ({ festivalData, festivalConfig, allMovies, onClose }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-[fadeIn_0.3s_ease-out]" 
            onClick={onClose}
        >
            <div 
                className="bg-[#181818] rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative scrollbar-hide border border-gray-700" 
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 bg-black/50 rounded-full p-1.5 hover:text-white z-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                
                <FestivalView
                    festivalData={festivalData}
                    festivalConfig={festivalConfig}
                    allMovies={allMovies}
                    showHero={true}
                />
            </div>
        </div>
    );
};

export default FestivalModal;