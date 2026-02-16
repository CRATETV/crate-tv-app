
import React, { useEffect, useRef } from 'react';
import { Movie } from '../types';
import { MovieCard } from './MovieCard';

interface SearchOverlayProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onClose: () => void;
  onSubmit?: (query: string) => void;
  results: Movie[];
  onSelectMovie: (movie: Movie) => void;
}

const SUGGESTED_GENRES = [
    { label: 'Documentary', icon: '📽️' },
    { label: 'Romance', icon: '❤️' },
    { label: 'Comedy', icon: '🍿' },
    { label: 'Thriller', icon: '⚡' },
    { label: 'Experimental', icon: '🧬' }
];

const SearchOverlay: React.FC<SearchOverlayProps> = ({ searchQuery, onSearch, onClose, onSubmit, results, onSelectMovie }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(event.target.value);
  };

  const handleGenreClick = (genre: string) => {
    onSearch(genre);
    inputRef.current?.focus();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (onSubmit) {
      onSubmit(searchQuery);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex flex-col animate-[fadeIn_0.2s_ease-out]"
      role="dialog"
      aria-modal="true"
    >
      {/* Header with safe area padding */}
      <div className="flex items-center justify-between p-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Search.</h2>
        <button
          onClick={onClose}
          className="bg-white/10 hover:bg-red-600 p-2 rounded-full transition-all text-white"
          aria-label="Close search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-6 space-y-8">
          <form onSubmit={handleSubmit} className="relative group">
            <input
              ref={inputRef}
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Titles, creators, or genres"
              className="w-full py-6 pl-16 pr-6 bg-white/5 border border-white/10 rounded-2xl text-white text-2xl placeholder-gray-700 focus:outline-none focus:border-red-600/50 transition-all shadow-2xl font-bold uppercase tracking-tight"
            />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-red-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </form>

          {/* Suggested Genres */}
          {!searchQuery && (
              <div className="animate-[fadeIn_0.5s_ease-out]">
                  <p className="text-[10px] font-black uppercase text-gray-600 tracking-[0.4em] mb-4 ml-2">Quick Discovery</p>
                  <div className="flex flex-wrap gap-3">
                      {SUGGESTED_GENRES.map(genre => (
                          <button
                            key={genre.label}
                            onClick={() => handleGenreClick(genre.label)}
                            className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/30 px-6 py-3 rounded-xl transition-all flex items-center gap-3 group"
                          >
                            <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{genre.icon}</span>
                            <span className="text-sm font-black uppercase tracking-widest text-gray-400 group-hover:text-white">{genre.label}</span>
                          </button>
                      ))}
                  </div>
              </div>
          )}
      </div>
      
      <div className="flex-grow overflow-y-auto px-6 mt-10 pb-32 scrollbar-hide">
        {searchQuery && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8 animate-[fadeIn_0.4s_ease-out]">
            {results.map(movie => (
              <div key={movie.key} className="animate-slide-in-up">
                <MovieCard movie={movie} onSelectMovie={onSelectMovie} />
              </div>
            ))}
          </div>
        )}
        {searchQuery && results.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 text-center space-y-6 opacity-50">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-xl font-black uppercase tracking-widest text-gray-500 italic">No nodes matching "{searchQuery}"</p>
          </div>
        )}
        {!searchQuery && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none">
                <p className="text-sm font-black uppercase tracking-[1em] text-gray-400 mr-[-1em]">Enter Inquiry</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
