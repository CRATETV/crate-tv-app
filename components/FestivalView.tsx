
import React, { useState } from 'react';
import { Movie, FestivalDay, FestivalConfig, FilmBlock } from '../types';
import SquarePaymentModal from './SquarePaymentModal';
import FilmBlockCard from './FilmBlockCard';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import Countdown from './Countdown';

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
    purchaseMovie,
    rentals,
    unlockedWatchPartyKeys
  } = useAuth();

  const { activeParties, livePartyMovie } = useFestival();

  const [activeDay, setActiveDay] = useState(1);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentItem, setPaymentItem] = useState<{ type: 'pass' | 'block' | 'movie'; block?: FilmBlock; movie?: Movie } | null>(null);

  const navigateToMovie = (movieKey: string) => {
    const path = `/movie/${movieKey}?play=true`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  };

  const navigateToParty = (key: string) => {
    const path = `/watchparty/${key}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  };

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
            setIsPaymentModalOpen(false);
        } else if (details.paymentType === 'block' && details.itemId) {
            await unlockFestivalBlock(details.itemId);
            setIsPaymentModalOpen(false);
        } else if (details.paymentType === 'movie' && details.itemId) {
            await purchaseMovie(details.itemId);
            setIsPaymentModalOpen(false);
            navigateToMovie(details.itemId);
        }
    } catch (error) {
        console.error("Failed to save purchase to user profile:", error);
    }
  };

  if (!festivalData || festivalData.length === 0) {
      return (
          <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[4rem] mx-4">
              <p className="text-gray-700 font-black uppercase tracking-[0.5em]">Programming manifest pending sync...</p>
          </div>
      );
  }

  const currentDayData = festivalData.find(d => d.day === activeDay) || festivalData[0];
  
  // Find the currently active session for the "Live Now" feature
  const activePartyKey = Object.keys(activeParties).find(key => activeParties[key].status === 'live');
  const activePartyData = activePartyKey ? activeParties[activePartyKey] : null;
  const activePartyEntity = activePartyKey ? (allMovies[activePartyKey] || festivalData.flatMap(d => d.blocks).find(b => b.id === activePartyKey)) : null;

  return (
    <div className="font-sans bg-transparent pb-32">
      {showHero && (
        <div className="relative text-center py-12 sm:py-24 px-4 overflow-hidden mb-12">
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

      {/* Real-time Watch Party Integration */}
      {activePartyKey && activePartyEntity && (
          <div className="max-w-7xl mx-auto px-4 mb-20 animate-[slideInDown_0.6s_ease-out]">
              <div className="bg-gradient-to-r from-red-600 to-indigo-900 rounded-[3rem] p-8 md:p-12 shadow-[0_30px_100px_rgba(239,68,68,0.3)] border border-white/20 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                      <svg className="w-48 h-48 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                  </div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                      <div className="space-y-4 text-center md:text-left">
                          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1 rounded-full border border-white/30">
                              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-white">Transmission Active Now</span>
                          </div>
                          <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic leading-tight">
                              {(activePartyEntity as any).title}
                          </h2>
                          <p className="text-red-100 font-bold uppercase tracking-widest text-xs">Join the synchronized community screening and director talkback.</p>
                      </div>
                      
                      <button 
                        onClick={() => navigateToParty(activePartyKey)}
                        className="bg-white text-black font-black px-12 py-6 rounded-2xl text-xl uppercase tracking-tighter shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                      >
                          Enter Live Party
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-16 flex justify-center">
            <div className="inline-flex p-1.5 bg-black border border-white/5 rounded-2xl shadow-2xl overflow-x-auto scrollbar-hide max-w-full">
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
                      const isBlockLive = activeParties[block.id]?.status === 'live';
                      
                      return (
                          <div key={block.id} className={`bg-white/[0.02] border rounded-[3rem] shadow-2xl overflow-hidden transition-all duration-700 ${isBlockLive ? 'border-red-600 ring-4 ring-red-600/10' : 'border-white/5'}`}>
                            <div className="p-8 md:p-12 bg-white/[0.01] border-b border-white/5">
                               <div className="flex flex-col md:flex-row justify-between md:items-center gap-8">
                                 <div>
                                  <div className="flex items-center gap-3 mb-3">
                                      <p className="text-gray-500 font-black text-[10px] uppercase tracking-[0.4em]">{block.time}</p>
                                      {isBlockLive && (
                                          <span className="bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase animate-pulse">Live Screening</span>
                                      )}
                                  </div>
                                  <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter italic leading-none">{block.title}</h2>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    {isBlockLive && (
                                        <button 
                                            onClick={() => navigateToParty(block.id)}
                                            className="bg-red-600 text-white font-black px-8 py-4 rounded-2xl uppercase text-xs tracking-widest transition-all shadow-xl hover:bg-red-500 active:scale-95"
                                        >
                                            Join Live Session
                                        </button>
                                    )}
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
                            </div>
                            <div className="p-8 md:p-12">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                    {blockMovies.map(movie => {
                                        const isMovieUnlocked = isBlockUnlocked || (rentals[movie.key] && new Date(rentals[movie.key]) > new Date());
                                        const isMovieLive = activeParties[movie.key]?.status === 'live';

                                        return (
                                            <div key={movie.key} className="space-y-3">
                                                <div className="relative">
                                                    <FilmBlockCard
                                                        movie={movie}
                                                        isUnlocked={isMovieUnlocked}
                                                        onWatch={() => navigateToMovie(movie.key)}
                                                        onUnlock={() => handlePurchaseClick('movie', movie)}
                                                    />
                                                    {isMovieLive && (
                                                        <div 
                                                            onClick={() => navigateToParty(movie.key)}
                                                            className="absolute -top-2 -right-2 z-20 bg-red-600 text-white p-2 rounded-full shadow-2xl cursor-pointer animate-bounce hover:scale-110 transition-transform"
                                                            title="Watch Party Live!"
                                                        >
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                                                        </div>
                                                    )}
                                                </div>
                                                {!isMovieUnlocked ? (
                                                    <button 
                                                        onClick={() => handlePurchaseClick('movie', movie)}
                                                        className="w-full bg-white/5 hover:bg-red-600 hover:text-white text-gray-500 font-black py-2 rounded-xl text-[9px] uppercase tracking-widest border border-white/5 transition-all"
                                                    >
                                                        Rent Master $5.00
                                                    </button>
                                                ) : isMovieLive && (
                                                    <button 
                                                        onClick={() => navigateToParty(movie.key)}
                                                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-2 rounded-xl text-[9px] uppercase tracking-widest shadow-lg transition-all animate-pulse"
                                                    >
                                                        Live Party Node
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {blockMovies.length === 0 && (
                                        <p className="col-span-full text-center text-gray-700 font-black uppercase tracking-widest text-xs italic py-10">No films programmed for this block yet.</p>
                                    )}
                                </div>
                            </div>
                          </div>
                      )
                  })}
              </div>
          </div>
      </div>
      {isPaymentModalOpen && paymentItem && (
        <SquarePaymentModal
            paymentType={paymentItem.type as any}
            block={paymentItem.block}
            movie={paymentItem.movie}
            priceOverride={paymentItem.type === 'movie' ? 5.00 : (paymentItem.type === 'block' ? 10.00 : 50.00)}
            onClose={() => setIsPaymentModalOpen(false)}
            onPaymentSuccess={handlePaymentSuccess as any}
        />
       )}
    </div>
  );
};

export default FestivalView;
