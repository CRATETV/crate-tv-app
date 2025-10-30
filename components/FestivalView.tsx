import React, { useState } from 'react';
import { Movie, FestivalDay, FestivalConfig, FilmBlock } from '../types';
import SquarePaymentModal from './SquarePaymentModal';
import FilmBlockCard from './FilmBlockCard';

interface FestivalViewProps {
    festivalData: FestivalDay[];
    festivalConfig: FestivalConfig;
    allMovies: Record<string, Movie>;
    unlockedBlockIds: Set<string>;
    hasAllAccessPass: boolean;
    onUnlockBlock: (blockId: string) => void;
    onGrantAllAccess: () => void;
    showHero?: boolean;
}

const FestivalView: React.FC<FestivalViewProps> = ({ 
    festivalData, 
    festivalConfig, 
    allMovies,
    unlockedBlockIds,
    hasAllAccessPass,
    onUnlockBlock,
    onGrantAllAccess,
    showHero = true 
}) => {
  const [activeDay, setActiveDay] = useState(1);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentItem, setPaymentItem] = useState<{ type: 'pass' | 'block'; block?: FilmBlock } | null>(null);

  const handlePurchaseClick = (type: 'pass' | 'block', block?: FilmBlock) => {
    setPaymentItem({ type, block });
    setIsPaymentModalOpen(true);
  };
  
  const handlePaymentSuccess = (details: { paymentType: 'pass' | 'block' | 'subscription' | 'donation', itemId?: string }) => {
    if (details.paymentType === 'pass') {
      onGrantAllAccess();
    } else if (details.paymentType === 'block' && details.itemId) {
      onUnlockBlock(details.itemId);
    }
  };

  const navigateToMovie = (movieKey: string) => {
    const path = `/movie/${movieKey}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  };

  if (!festivalData || festivalData.length === 0) {
      return null;
  }

  return (
    <div className="font-sans bg-gray-950 text-gray-200">
       <style>
        {`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        `}
      </style>
      
      {showHero && (
        <div className="relative bg-gradient-to-br from-[#2c1a4d] via-[#1a2c4d] to-[#141414] text-center py-12 sm:py-20 px-4 overflow-hidden">
            <div className="absolute inset-0 bg-black/30"></div>
            <div className="relative z-10 max-w-4xl mx-auto">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{festivalConfig.title}</h1>
                <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto mb-8">
                    {festivalConfig.description}
                </p>
                {!hasAllAccessPass && (
                  <button
                    onClick={() => handlePurchaseClick('pass')}
                    className="inline-block bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-lg text-base sm:text-lg shadow-lg transform transition-transform hover:scale-105"
                  >
                    Buy All-Access Pass - $50.00
                  </button>
                )}
            </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-8 sm:py-12">
          <div className="border-b-2 border-gray-800 mb-8 sm:mb-12">
            <div className="flex overflow-x-auto scrollbar-hide -mb-0.5">
                {festivalData.map(day => (
                    <button
                        key={day.day}
                        onClick={() => setActiveDay(day.day)}
                        className={`flex-shrink-0 whitespace-nowrap px-4 sm:px-8 py-3 text-base sm:text-lg font-semibold transition-all duration-300 relative border-b-4 ${activeDay === day.day ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Day {day.day}
                    </button>
                ))}
            </div>
          </div>

          <div>
              {festivalData.filter(day => day.day === activeDay).map(day => (
                  <div key={day.day} className="space-y-12 animate-fadeIn">
                      {day.blocks.map(block => {
                          const blockMovies = block.movieKeys.map(key => allMovies[key]).filter(Boolean);
                          const isBlockUnlocked = hasAllAccessPass || unlockedBlockIds.has(block.id);
                          return (
                              <div key={block.id} className="bg-gradient-to-br from-gray-900 to-[#101010] border border-gray-800 rounded-xl shadow-lg overflow-hidden">
                                <div className="p-4 sm:p-6 bg-black/20">
                                   <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                     <div>
                                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-0">{block.title}</h2>
                                      <p className="font-semibold text-purple-300">{block.time}</p>
                                    </div>
                                    {!isBlockUnlocked && (
                                      <button
                                        onClick={() => handlePurchaseClick('block', block)}
                                        className="w-full sm:w-auto flex-shrink-0 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105 shadow-md text-sm"
                                      >
                                        Unlock Block - $10.00
                                      </button>
                                    )}
                                   </div>
                                </div>
                                <div className="p-4 sm:p-6">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                                        {blockMovies.map(movie => (
                                            <FilmBlockCard
                                                key={movie.key}
                                                movie={movie}
                                                isUnlocked={isBlockUnlocked}
                                                onWatch={() => navigateToMovie(movie.key)}
                                                onUnlock={() => handlePurchaseClick('block', block)}
                                            />
                                        ))}
                                    </div>
                                </div>
                              </div>
                          )
                        })}
                  </div>
              ))}
          </div>
      </div>
      {isPaymentModalOpen && paymentItem && (
        <SquarePaymentModal
            paymentType={paymentItem.type}
            block={paymentItem.block}
            onClose={() => setIsPaymentModalOpen(false)}
            onPaymentSuccess={handlePaymentSuccess}
        />
       )}
    </div>
  );
};

export default FestivalView;