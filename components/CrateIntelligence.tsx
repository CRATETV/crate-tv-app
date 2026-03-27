import React, { useState, useEffect, useRef } from 'react';
import { Movie, Recommendation } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Brain, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { MovieCard } from './MovieCard';

interface CrateIntelligenceProps {
  allMovies: Record<string, Movie>;
  onSelectMovie: (movie: Movie) => void;
}

const CrateIntelligence: React.FC<CrateIntelligenceProps> = ({ allMovies, onSelectMovie }) => {
  const { user, watchlist, likedMovies, toggleLikeMovie, toggleWatchlist, watchedMovies } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const response = await fetch('/api/get-recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            watchlist: Array.from(watchlist), 
            likedMovies: Array.from(likedMovies) 
          })
        });
        
        if (!response.ok) throw new Error('Failed to fetch recommendations');
        
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } catch (err: any) {
        console.error('Crate Intelligence Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [user]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.8;
      const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (!user || (!isLoading && recommendations.length === 0)) return null;

  const watchlistSet = new Set(watchlist);
  const likedMoviesSet = new Set(likedMovies);
  const watchedMoviesSet = new Set(watchedMovies);

  return (
    <div className="mb-8 md:mb-12 relative">
      <div className="flex items-center justify-between mb-4 px-2 border-l-4 border-red-600 pl-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg md:text-2xl font-bold text-white uppercase italic tracking-tighter">
            Crate Intelligence
          </h2>
          {isLoading && (
            <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          <Brain className="w-3 h-3 text-red-500" />
          <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">AI Personalized</span>
        </div>
      </div>

      <div className="relative group/carousel-container">
        <div 
          ref={scrollRef}
          className="flex overflow-x-auto space-x-4 pb-8 pt-4 scrollbar-hide -mx-4 px-4 sm:-mx-8 sm:px-8 group/carousel-list snap-x snap-proximity overscroll-x-contain"
        >
          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="flex-shrink-0 w-[40vw] sm:w-[28vw] md:w-[20vw] lg:w-[15vw] aspect-[3/4] bg-white/5 rounded-lg animate-pulse border border-white/5"></div>
            ))
          ) : (
            recommendations.map((rec) => {
              const movie = allMovies[rec.movieKey];
              if (!movie) return null;
              
              return (
                <div key={rec.movieKey} className="flex-shrink-0 w-[40vw] sm:w-[28vw] md:w-[20vw] lg:w-[15vw] transition-all duration-300 group-hover/carousel-list:opacity-50 hover:group-hover/carousel-list:!opacity-100 snap-start relative">
                  <MovieCard
                    movie={movie}
                    onSelectMovie={onSelectMovie}
                    isWatched={watchedMoviesSet.has(movie.key)}
                    isOnWatchlist={watchlistSet.has(movie.key)}
                    isLiked={likedMoviesSet.has(movie.key)}
                    onToggleLike={toggleLikeMovie}
                    onToggleWatchlist={toggleWatchlist}
                  />
                  {/* Reasoning Tooltip on Hover */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[90%] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[60]">
                    <div className="bg-red-600 text-white text-[7px] font-black uppercase p-2 rounded shadow-xl border border-white/20 text-center leading-tight">
                      {rec.reasoning}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!isLoading && recommendations.length > 3 && (
          <>
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-4 rounded-full opacity-0 group-hover/carousel-container:opacity-100 transition-opacity z-20 hidden md:block backdrop-blur-md border border-white/10 ml-2"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-4 rounded-full opacity-0 group-hover/carousel-container:opacity-100 transition-opacity z-20 hidden md:block backdrop-blur-md border border-white/10 mr-2"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CrateIntelligence;
