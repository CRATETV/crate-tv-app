import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Header from './Header.tsx';
import Footer from './Footer.tsx';
import BackToTopButton from './BackToTopButton.tsx';
import { festivalData as initialFestivalData, moviesData } from '../constants.ts';
import { FilmBlock, Movie } from '../types.ts';
import FilmBlockCard from './FilmBlockCard.tsx';
import FilmBlockDetailsModal from './FilmBlockDetailsModal.tsx';
import StripePaymentModal from './StripePaymentModal.tsx';

interface FestivalPurchases {
  hasFullPass: boolean;
  purchasedBlocks: string[];
  purchasedFilms: string[];
}

// Define the structure for an item being purchased
interface PaymentItem {
  type: 'pass' | 'block' | 'film';
  id: string;
  name: string;
  price: number;
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

  const updatePurchases = (newPurchases: FestivalPurchases) => {
    setPurchases(newPurchases);
    localStorage.setItem('crateTvFestivalPurchases', JSON.stringify(newPurchases));
  };

  const purchaseFullPass = () => {
    updatePurchases({ ...purchases, hasFullPass: true });
  };

  const purchaseBlock = (blockId: string) => {
    if (purchases.purchasedBlocks.includes(blockId)) return;
    updatePurchases({
      ...purchases,
      purchasedBlocks: [...purchases.purchasedBlocks, blockId],
    });
  };
  
  const purchaseFilm = (filmKey: string) => {
    if (purchases.purchasedFilms.includes(filmKey)) return;
    updatePurchases({
      ...purchases,
      purchasedFilms: [...purchases.purchasedFilms, filmKey],
    });
  };

  const isFilmUnlocked = (filmKey: string, blockId: string) => {
    return purchases.hasFullPass || purchases.purchasedBlocks.includes(blockId) || purchases.purchasedFilms.includes(filmKey);
  };
  
  const isBlockUnlocked = (blockId: string) => {
     return purchases.hasFullPass || purchases.purchasedBlocks.includes(blockId);
  }

  return { purchases, purchaseFullPass, purchaseBlock, purchaseFilm, isFilmUnlocked, isBlockUnlocked };
};


const FestivalPage: React.FC = () => {
  const [activeDay, setActiveDay] = useState<number>(1);
  const [selectedBlock, setSelectedBlock] = useState<FilmBlock | null>(null);
  const { purchases, purchaseFullPass, purchaseBlock, purchaseFilm, isFilmUnlocked, isBlockUnlocked } = useFestivalPurchases();
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState('');
  const [festivalData, setFestivalData] = useState(initialFestivalData);
  const [paymentItem, setPaymentItem] = useState<PaymentItem | null>(null);

  useEffect(() => {
    // This effect runs on mount to check for live preview data
    try {
      const storedFestival = localStorage.getItem('crateTvAdmin_festival');
      if (storedFestival) {
        setFestivalData(JSON.parse(storedFestival));
      }
    } catch (error) {
      console.error("Failed to load festival data from localStorage", error);
    }
  }, []);

  const handlePurchase = (type: 'pass' | 'block' | 'film', id: string) => {
    let item: PaymentItem | null = null;
    if (type === 'pass') {
      item = { type: 'pass', id: 'full', name: 'Full Festival Pass', price: 50 };
    } else if (type === 'block') {
      const block = festivalData.flatMap(d => d.blocks).find(b => b.id === id);
      if (block) {
        item = { type: 'block', id, name: `Block: ${block.title}`, price: 12 };
      }
    } else if (type === 'film') {
      const film = moviesData[id];
      if (film) {
        item = { type: 'film', id, name: `Film: ${film.title}`, price: 5 };
      }
    }

    if (item) {
      setPaymentItem(item);
      // Close the details modal if it's open
      if (selectedBlock) setSelectedBlock(null);
    }
  };

  const handlePaymentSuccess = (item: PaymentItem) => {
    if (item.type === 'pass') {
        purchaseFullPass();
        setShowPurchaseConfirmation('Full Festival Pass unlocked!');
    } else if (item.type === 'block') {
        purchaseBlock(item.id);
        setShowPurchaseConfirmation('Film Block unlocked!');
    } else if (item.type === 'film') {
        purchaseFilm(item.id);
        setShowPurchaseConfirmation('Film unlocked!');
    }
    
    setPaymentItem(null);
    setTimeout(() => setShowPurchaseConfirmation(''), 3000);
  };
  
  const handleNavigateToMovie = (movieKey: string) => {
    window.history.pushState({}, '', `/movie/${movieKey}?play=true`);
    window.dispatchEvent(new Event('pushstate'));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] text-white">
      <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

      <main className="flex-grow">
         <div className="relative py-24 md:py-32 bg-gray-900 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-red-900/40 to-black"></div>
            <div className="relative z-10 max-w-4xl mx-auto px-4">
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">Crate TV Film Festival</h1>
                <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
                    Discover the next generation of indie filmmakers. Three days of incredible shorts, exclusive premieres, and unforgettable stories.
                </p>
                {!purchases.hasFullPass ? (
                    <button onClick={() => handlePurchase('pass', 'full')} className="bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg transition-transform transform hover:scale-105">
                        Buy Full Festival Pass - $50
                    </button>
                ) : (
                    <div className="bg-green-500/20 border border-green-400 text-green-300 font-bold py-4 px-8 rounded-lg text-xl inline-block">
                        ✓ Festival Pass Unlocked
                    </div>
                )}
            </div>
        </div>
        
        <div className="max-w-7xl mx-auto p-4 sm:p-8 md:p-12">
            <div className="flex justify-center border-b border-gray-700 mb-8">
                {festivalData.map(day => (
                    <button
                        key={day.day}
                        onClick={() => setActiveDay(day.day)}
                        className={`px-4 sm:px-8 py-4 text-lg font-semibold transition-colors duration-300 border-b-4 ${activeDay === day.day ? 'border-red-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        Day {day.day} <span className="hidden sm:inline-block text-sm text-gray-500">- {day.date}</span>
                    </button>
                ))}
            </div>

            <div>
                {festivalData.filter(day => day.day === activeDay).map(day => (
                    <div key={day.day} className="space-y-10">
                        {day.blocks.map(block => {
                            const blockMovies = block.movieKeys.map(key => moviesData[key]).filter(Boolean);
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
                                            <button onClick={() => handlePurchase('block', block.id)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                                                Unlock Full Block - $12
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
      </main>

      <Footer />
      <BackToTopButton />

      {selectedBlock && (
        <FilmBlockDetailsModal 
            block={selectedBlock}
            onClose={() => setSelectedBlock(null)}
            onPurchaseFilm={(filmKey) => handlePurchase('film', filmKey)}
            onPurchaseBlock={(blockId) => handlePurchase('block', blockId)}
            isFilmUnlocked={isFilmUnlocked}
            isBlockUnlocked={isBlockUnlocked}
            onWatchMovie={handleNavigateToMovie}
        />
      )}
       {paymentItem && (
        <StripePaymentModal 
            item={paymentItem}
            onClose={() => setPaymentItem(null)}
            onSuccess={handlePaymentSuccess}
        />
      )}
      
      {showPurchaseConfirmation && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg z-50 animate-fadeIn animate-bounce">
            {showPurchaseConfirmation}
        </div>
      )}
    </div>
  );
};

export default FestivalPage;