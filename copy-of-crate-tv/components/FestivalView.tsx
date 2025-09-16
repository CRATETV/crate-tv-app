import React, { useState, useEffect } from 'react';
import { FilmBlock, Movie, FestivalDay, FestivalConfig } from '../types.ts';
import FilmBlockCard from './FilmBlockCard.tsx';
import FilmBlockDetailsModal from './FilmBlockDetailsModal.tsx';

interface FestivalPurchases {
  hasFullPass: boolean;
  purchasedBlocks: string[];
  purchasedFilms: string[];
}

const useFestivalPurchases = () => {
  const [purchases, setPurchases] = useState<FestivalPurchases>({
    hasFullPass: false,
    purchasedBlocks: [],
    purchasedFilms: [],
  });

  useEffect(() => {
    try {
      const storedPurchases = localStorage.getItem('crateTvFestivalPurchases');
      if (storedPurchases) {
        setPurchases(JSON.parse(storedPurchases));
      }
    } catch (error) {
      console.error("Failed to load festival purchases from localStorage", error);
    }
  }, []);

  const isFilmUnlocked = (filmKey: string, blockId: string) => {
    return purchases.hasFullPass || purchases.purchasedBlocks.includes(blockId) || purchases.purchasedFilms.includes(filmKey);
  };
  
  const isBlockUnlocked = (blockId: string) => {
     return purchases.hasFullPass || purchases.purchasedBlocks.includes(blockId);
  }

  return { purchases, isFilmUnlocked, isBlockUnlocked };
};


interface FestivalViewProps {
  festivalData: FestivalDay[];
  festivalConfig: FestivalConfig;
  allMovies: Record<string, Movie>;
}

const FestivalView: React.FC<FestivalViewProps> = ({ festivalData, festivalConfig, allMovies }) => {
  const [activeDay, setActiveDay] = useState<number>(1);
  const [selectedBlock, setSelectedBlock] = useState<FilmBlock | null>(null);
  const { purchases, isFilmUnlocked, isBlockUnlocked } = useFestivalPurchases();

  const handleNavigateToMovie = (movieKey: string) => {
    window.history.pushState({}, '', `/movie/${movieKey}?play=true`);
    window.dispatchEvent(new Event('pushstate'));
  };

  if (!festivalData || festivalData.length === 0) {
      return null;
  }

  return (
    <>
      <div className="relative py-24 md:py-32 bg-gray-900 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-red-900/40 to-black"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">{festivalConfig.title}</h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
                {festivalConfig.description}
            </p>
            {!purchases.hasFullPass ? (
                <div className="bg-gray-800/50 border border-gray-700 text-gray-400 font-bold py-4 px-8 rounded-lg text-xl inline-block cursor-not-allowed" title="Payments are temporarily unavailable">
                    Buy Full Festival Pass - $50
                </div>
            ) : (
                <div className="bg-green-500/20 border border-green-400 text-green-300 font-bold py-4 px-8 rounded-lg text-xl inline-block">
                    ✓ Festival Pass Unlocked
                </div>
            )}
        </div>
      </div>
        
      <div className="max-w-7xl mx-auto p-4 sm:p-8 md:p-12">
          <div className="flex justify-center border-b border-gray-700 mb-8 overflow-x-auto scrollbar-hide">
              {festivalData.map(day => (
                  <button
                      key={day.day}
                      onClick={() => setActiveDay(day.day)}
                      className={`flex-shrink-0 px-4 sm:px-8 py-4 text-lg font-semibold transition-colors duration-300 border-b-4 ${activeDay === day.day ? 'border-red-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                      Day {day.day} <span className="hidden sm:inline-block text-sm text-gray-500">- {day.date}</span>
                  </button>
              ))}
          </div>

          <div>
              {festivalData.filter(day => day.day === activeDay).map(day => (
                  <div key={day.day} className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
                      {day.blocks.map(block => {
                          const blockMovies = block.movieKeys.map(key => allMovies[key]).filter(Boolean);
                          return (
                              <div key={block.id}>
                                   <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">{block.title}</h2>
                                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                      {blockMovies.map(movie => (
                                          <FilmBlockCard 
                                              key={movie.key}
                                              movie={movie}
                                              isUnlocked={isFilmUnlocked(movie.key, block.id)}
                                              onWatch={() => handleNavigateToMovie(movie.key)}
                                              onUnlock={() => setSelectedBlock(block)}
                                          />
                                      ))}
                                  </div>
                                  <div className="mt-4 text-center">
                                      {isBlockUnlocked(block.id) ? (
                                           <span className="text-green-400 font-semibold">✓ You have access to this block</span>
                                      ) : (
                                          <div className="bg-gray-700 text-gray-400 font-bold py-2 px-6 rounded-lg inline-block cursor-not-allowed" title="Payments are temporarily unavailable">
                                              Unlock Full Block - $10
                                          </div>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              ))}
          </div>
      </div>

      {selectedBlock && (
        <FilmBlockDetailsModal 
            block={selectedBlock}
            onClose={() => setSelectedBlock(null)}
            isFilmUnlocked={isFilmUnlocked}
            isBlockUnlocked={isBlockUnlocked}
            onWatchMovie={handleNavigateToMovie}
            allMovies={allMovies}
        />
      )}
    </>
  );
};

export default FestivalView;
