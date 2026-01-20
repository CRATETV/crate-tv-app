
import React, { useState } from 'react';
import { Movie, FestivalDay, FestivalConfig, FilmBlock } from '../types';
import SquarePaymentModal from './SquarePaymentModal';
import FilmBlockCard from './FilmBlockCard';
import { useAuth } from '../contexts/AuthContext';

interface FestivalViewProps {
    festivalData: FestivalDay[];
    festivalConfig: FestivalConfig;
    allMovies: Record<string, Movie>;
    showHero?: boolean;
}

const FestivalView: React.FC<FestivalViewProps> = ({ 
    festivalData, 
    festivalConfig, 
    allMovies,
    showHero = true 
}) => {
  const { 
    unlockedFestivalBlockIds, 
    hasFestivalAllAccess, 
    unlockFestivalBlock, 
    grantFestivalAllAccess,
    purchaseMovie
  } = useAuth();

  const [activeDay, setActiveDay] = useState(1);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentItem, setPaymentItem] = useState<{ type: 'pass' | 'block' | 'movie'; block?: FilmBlock; movie?: Movie } | null>(null);

  const handlePurchaseClick = (type: 'pass' | 'block' | 'movie', item?: FilmBlock | Movie) => {
    if (type === 'block') {
      setPaymentItem({ type, block: item as FilmBlock });
    } else if (type === 'movie') {
      setPaymentItem({ type, movie: item as Movie });
    } else {
      setPaymentItem({ type });
    }
    setIsPaymentModalOpen(true);
  };
  
  const handlePaymentSuccess = async (details: any) => {
    try {
        if (details.paymentType === 'pass') {
            await grantFestivalAllAccess();
        } else if (details.paymentType === 'block' && details.itemId) {
            await unlockFestivalBlock(details.itemId);
        } else if (details.paymentType === 'movie' && details.itemId) {
            await purchaseMovie(details.itemId);
        }
    } catch (error) {
        console.error("Failed to save purchase to user profile:", error);
    }
  };

  const navigateToMovie = (movieKey: string) => {
    const movie = allMovies[movieKey];
    if (movie && (movie.fullMovie.startsWith('http://') || movie.fullMovie.startsWith('https://'))) {
        window.open(movie.fullMovie, '_blank', 'noopener,noreferrer');
    } else {
        const path = `/movie/${movieKey}?play=true`;
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    }
  };

  if (!festivalData || festivalData.length === 0) {
      return (
          <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[4rem] mx-4">
              <p className="text-gray-700 font-black uppercase tracking-[0.5em]">Global programming manifest pending synchronization...</p>
          </div>
      );
  }

  const currentDayData = festivalData.find(d => d.day === activeDay) || festivalData[0];

  return (
    <div className="font-sans bg-gray-950 text-gray-200">
      {showHero && (
        <div className="relative bg-gradient-to-br from-[#111] via-[#050505] to-[#111] text-center py-12 sm:py-24 px-4 overflow-hidden border-b border-white/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)]"></div>
            <div className="relative z-10 max-w-4xl mx-auto animate-fadeInHeroContent">
                <div className="space-y-4 mb-8">
                    <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-none">{festivalConfig.title}</h1>
                    {festivalConfig.subheader && (
                        <p className="text-red-500 font-black uppercase tracking-[0.6em] text-xs md:text-sm">
                            {festivalConfig.subheader}
                        </p>
                    )}
                </div>
                <p className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
                    {festivalConfig.description}
                </p>
                {!hasFestivalAllAccess && (
                  <button
                    onClick={() => handlePurchaseClick('pass')}
                    className="inline-block bg-white text-black font-black py-4 px-10 rounded-2xl text-base uppercase tracking-widest shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                  >
                    Buy All-Access Pass // $50.00
                  </button>
                )}
            </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="mb-16 flex justify-center">
            <div className="inline-flex p-1 bg-black border border-white/5 rounded-2xl shadow-2xl overflow-x-auto scrollbar-hide max-w-full">
                {festivalData.map(day => (
                    <button
                        key={day.day}
                        onClick={() => setActiveDay(day.day)}
                        className={`flex-shrink-0 whitespace-nowrap px-10 py-4 text-sm font-black uppercase tracking-widest transition-all rounded-xl ${activeDay === day.day ? 'bg-red-600 text-white shadow-xl' : 'text-gray-600 hover:text-gray-300'}`}
                    >
                        Day {day.day}
                    </button>
                ))}
            </div>
          </div>

          <div className="space-y-16 animate-[fadeIn_0.5s_ease-out]">
              <div className="text-center mb-16">
                   <h2 className="text-6xl sm:text-8xl font-black text-white uppercase italic tracking-tighter leading-none mb-4">
                       Day 0{currentDayData.day}.
                   </h2>
                   <p className="text-red-500 font-black uppercase tracking-[0.5em] text-[10px] md:text-xs">
                       {currentDayData.date}
                   </p>
              </div>

              <div className="space-y-12">
                  {currentDayData.blocks.map(block => {
                      const blockMovies = block.movieKeys.map(key => allMovies[key]).filter(Boolean);
                      const isBlockUnlocked = hasFestivalAllAccess || unlockedFestivalBlockIds.has(block.id);
                      return (
                          <div key={block.id} className="bg-white/[0.02] border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden">
                            <div className="p-8 md:p-12 bg-white/[0.01] border-b border-white/5">
                               <div className="flex flex-col md:flex-row justify-between md:items-center gap-8">
                                 <div>
                                  <p className="text-gray-500 font-black text-[10px] uppercase tracking-[0.4em] mb-3">{block.time}</p>
                                  <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter italic leading-none">{block.title}</h2>
                                </div>
                                {!isBlockUnlocked && (
                                  <button
                                    onClick={() => handlePurchaseClick('block', block)}
                                    className="bg-white text-black font-black px-8 py-4 rounded-2xl uppercase text-xs tracking-widest transition-all shadow-xl hover:bg-gray-200 active:scale-95"
                                  >
                                    Unlock Block // $10.00
                                  </button>
                                )}
                               </div>
                            </div>
                            <div className="p-8 md:p-12">
                                <div className="flex overflow-x-auto space-x-8 pb-8 scrollbar-hide -mx-2 px-2 snap-x">
                                    {blockMovies.map(movie => (
                                        <div key={movie.key} className="flex-shrink-0 w-[55vw] sm:w-[35vw] md:w-[25vw] lg:w-[18vw] snap-start">
                                            <FilmBlockCard
                                                movie={movie}
                                                isUnlocked={isBlockUnlocked}
                                                onWatch={() => navigateToMovie(movie.key)}
                                                onUnlock={() => handlePurchaseClick('movie', movie)}
                                            />
                                        </div>
                                    ))}
                                    {blockMovies.length === 0 && (
                                        <p className="text-gray-700 font-black uppercase tracking-widest text-xs italic py-10 px-4">Selections pending synchronization...</p>
                                    )}
                                </div>
                            </div>
                          </div>
                      )
                  })}
                  {currentDayData.blocks.length === 0 && (
                      <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[4rem]">
                          <p className="text-gray-700 font-black uppercase tracking-[0.5em]">No blocks programmed for Day {activeDay}</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
      {isPaymentModalOpen && paymentItem && (
        <SquarePaymentModal
            paymentType={paymentItem.type as any}
            block={paymentItem.block}
            movie={paymentItem.movie}
            onClose={() => setIsPaymentModalOpen(false)}
            onPaymentSuccess={handlePaymentSuccess as any}
        />
       )}
    </div>
  );
};

export default FestivalView;
