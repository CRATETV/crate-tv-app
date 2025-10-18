import React, { useState } from 'react';
import { Movie, FestivalDay, FestivalConfig } from '../types';
import SquarePaymentModal from './SquarePaymentModal';

interface FestivalViewProps {
    festivalData: FestivalDay[];
    festivalConfig: FestivalConfig;
    allMovies: Record<string, Movie>;
    showHero?: boolean;
}

const FestivalView: React.FC<FestivalViewProps> = ({ festivalData, festivalConfig, allMovies, showHero = true }) => {
  const [activeDay, setActiveDay] = useState(1);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'pass' | 'block' | null>(null);

  const handlePurchaseClick = (type: 'pass' | 'block') => {
    setPaymentType(type);
    setIsPaymentModalOpen(true);
  };
  
  const handlePaymentSuccess = () => {
    // In a real app, you would unlock the content here.
    console.log("Payment successful!");
  };

  if (!festivalData || festivalData.length === 0) {
      return null;
  }

  const navigateToMovie = (movieKey: string) => {
    const path = `/movie/${movieKey}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  };

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
      
      {/* Hero Section */}
      {showHero && (
        <div className="relative bg-gradient-to-br from-[#2c1a4d] via-[#1a2c4d] to-[#141414] text-center py-12 sm:py-20 px-4 overflow-hidden">
            <div className="absolute inset-0 bg-black/30"></div>
            <div className="relative z-10 max-w-4xl mx-auto">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{festivalConfig.title}</h1>
                <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto mb-8">
                    {festivalConfig.description}
                </p>
                <button
                onClick={() => handlePurchaseClick('pass')}
                className="inline-block bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-lg text-base sm:text-lg shadow-lg transform transition-transform hover:scale-105"
                >
                Buy All-Access Pass - $50.00
                </button>
            </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-8 sm:py-12">
          {/* Day Selector Tabs - Mobile Responsive */}
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

          {/* Schedule View */}
          <div>
              {festivalData.filter(day => day.day === activeDay).map(day => (
                  <div key={day.day} className="space-y-12 animate-fadeIn">
                      {day.blocks.map(block => {
                          const blockMovies = block.movieKeys.map(key => allMovies[key]).filter(Boolean);
                          return (
                              <div key={block.id} className="bg-gradient-to-br from-gray-900 to-[#101010] border border-gray-800 rounded-xl shadow-lg overflow-hidden">
                                <div className="p-4 sm:p-6 bg-black/20">
                                   <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                     <div>
                                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-0">{block.title}</h2>
                                      <p className="font-semibold text-purple-300">{block.time}</p>
                                    </div>
                                    <button
                                      onClick={() => handlePurchaseClick('block')}
                                      className="w-full sm:w-auto flex-shrink-0 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105 shadow-md text-sm"
                                    >
                                      Unlock Block - $10.00
                                    </button>
                                   </div>
                                </div>
                                <div className="p-4 sm:p-6">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                                        {blockMovies.map(movie => (
                                            <div
                                                key={movie.key}
                                                className="group relative aspect-[3/4] rounded-md overflow-hidden bg-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                onClick={() => handlePurchaseClick('block')}
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`Unlock block to watch ${movie.title}`}
                                                onKeyPress={(e) => e.key === 'Enter' && handlePurchaseClick('block')}
                                            >
                                                <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent flex flex-col items-center justify-center p-2 sm:p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white mb-2" viewBox="0 0 20 20" fill="currentColor">
                                                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                                    </svg>
                                                    <h4 className="text-white text-xs sm:text-sm font-semibold mb-1">{movie.title}</h4>
                                                    <p className="text-purple-300 text-xs font-bold">Click to Unlock Block</p>
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
      {isPaymentModalOpen && paymentType && (
        <SquarePaymentModal
            paymentType={paymentType}
            onClose={() => setIsPaymentModalOpen(false)}
            onPaymentSuccess={handlePaymentSuccess}
        />
       )}
    </div>
  );
};

export default FestivalView;