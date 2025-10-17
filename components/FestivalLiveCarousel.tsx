import React, { useMemo } from 'react';
import { Movie, Category } from '../types';
import MovieCarousel from './MovieCarousel';

interface FestivalLiveCarouselProps {
  allMovies: Movie[];
  allCategories: Record<string, Category>;
  onSelectMovie: (movie: Movie) => void;
}

const FestivalLiveCarousel: React.FC<FestivalLiveCarouselProps> = ({ allMovies, allCategories, onSelectMovie }) => {
  const festivalMovies = useMemo(() => {
    const festivalCategory = allCategories['pwff12thAnnual'];
    if (!festivalCategory || !festivalCategory.movieKeys) {
      return [];
    }
    return festivalCategory.movieKeys
      .map(key => allMovies.find(m => m.key === key))
      .filter((m): m is Movie => !!m);
  }, [allMovies, allCategories]);

  const handleNavigateToFestival = () => {
    window.history.pushState({}, '', '/festival');
    window.dispatchEvent(new Event('pushstate'));
  };

  if (festivalMovies.length === 0) {
    return null; // Don't render if there are no festival movies to show
  }

  const TitleComponent = () => (
    <div className="flex items-center gap-4 mb-4 cursor-pointer" onClick={handleNavigateToFestival}>
      <h2 className="text-lg md:text-2xl font-bold text-white hover:text-gray-300 transition-colors">
        Film Festival
      </h2>
      <div className="flex items-center gap-2 bg-red-600 text-white font-bold text-sm px-3 py-1 rounded-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <span>LIVE NOW</span>
      </div>
    </div>
  );

  return (
    <MovieCarousel
        title={<TitleComponent />}
        movies={festivalMovies}
        onSelectMovie={onSelectMovie}
    />
  );
};

export default FestivalLiveCarousel;