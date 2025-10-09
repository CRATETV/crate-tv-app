import React, { useState } from 'react';
import { Movie, FestivalDay, FestivalConfig } from '../types';

interface FestivalViewProps {
    festivalData: FestivalDay[];
    festivalConfig: FestivalConfig;
    allMovies: Record<string, Movie>;
    showHero?: boolean;
}

// FIX: Added 'export' to create a named export for this component, as it was not being exported before.
export const FestivalView: React.FC<FestivalViewProps> = ({ festivalData, festivalConfig, allMovies, showHero = true }) => {
  const [activeDay, setActiveDay] = useState(1);
  
  // This is a placeholder. In a real app, this would redirect to a checkout page.
  const handlePurchaseClick = () => {
    // For now, it does nothing as payments are disabled.
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
        <div className="relative bg-gradient-to-br from-[#2c1a4d] via-[#1a2c4d] to-[#141414] text-center py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="relative z-10 max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{festivalConfig.title}</h1>
              <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
                  {festivalConfig.description}
              </p>
              <div 
                className="inline-block bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-4 px-8 rounded-lg text-xl shadow-lg transform transition-transform hover:scale-105 cursor-not-allowed"
                title="Payments are temporarily unavailable"
                onClick={handlePurchaseClick}
              >
                Buy All-Access Pass - $50.00
              </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Day Selector */}
          <div className="flex justify-center border-b-2 border-gray-800 mb-8 sm:mb-12">
              {festivalData.map(day => (
                  <button
                      key={day.day}
                      onClick={() => setActiveDay(day.day)}
                      className={`px-4 sm:px-8 py-3 text-lg font-semibold transition-all duration-300 relative ${activeDay === day.day ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                      Day {day.day}
                      {activeDay === day.day && <div className="absolute bottom-[-2px] left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-purple-500 rounded-t-full"></div>}
                  </button>
              ))}
          </div>

          {/* Schedule View */}
          <div>
              {festivalData.filter(day => day.day === activeDay).map(day => (
                  <div key={day.day} className="space-y-12 animate-fadeIn">
                      {day.blocks.map(block => {
                          const blockMovies = block.movieKeys.map(key => allMovies[key]).filter(Boolean);
                          return (
                              <div key={block.id} className="bg-gradient-to-br from-gray-900 to-[#101010] border border-gray-800 rounded-xl shadow-lg overflow-hidden">
                                <div className="p-6 bg-black/20">
                                   <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                                     <div>
                                      <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">{block.title}</h2>
                                      <p className="font-semibold text-purple-300">{block.time}</p>
                                    </div>
                                    <div 
                                      className="flex-shrink-0 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105 cursor-not-allowed shadow-md text-sm"
                                      title="Payments are temporarily unavailable"
                                      onClick={handlePurchaseClick}
                                    >
                                      Unlock Block - $10.00
                                    </div>
                                   </div>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {blockMovies.map(movie => (
                                            <div key={movie.key} className="group relative aspect-[3/4] rounded-md overflow-hidden bg-gray-800 cursor-pointer" onClick={() => window.location.href = `/movie/${movie.key}`}>
                                                <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                                    <h4 className="text-white text-sm font-semibold">{movie.title}</h4>
                                                </div>
                                            </div>
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
    </div>
  );
};

export default FestivalView;