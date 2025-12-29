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
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Search</h2>
        <button
          onClick={onClose}
          className="bg-white/10 hover:bg-red-600 p-2 rounded-full transition-all"
          aria-label="Close search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-6">
          <form onSubmit={handleSubmit} className="relative group">
            <input
              ref={inputRef}
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Titles, creators, or keywords"
              className="w-full py-5 pl-14 pr-6 bg-white/5 border border-white/10 rounded-2xl text-white text-xl placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-all shadow-2xl"
            />
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </form>
      </div>
      
      <div className="flex-grow overflow-y-auto px-6 mt-10 pb-24 scrollbar-hide">
        {searchQuery && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 animate-[fadeIn_0.4s_ease-out]">
            {results.map(movie => (
              <div key={movie.key} className="animate-slide-in-up">
                <MovieCard movie={movie} onSelectMovie={onSelectMovie} />
              </div>
            ))}
          </div>
        )}
        {searchQuery && results.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 text-center space-y-4 opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-xl font-bold uppercase tracking-widest text-gray-500">Zero matches for "{searchQuery}"</p>
          </div>
        )}
        {!searchQuery && (
            <div className="flex flex-col items-center justify-center pt-20 text-center opacity-20">
                <p className="text-sm font-black uppercase tracking-[0.5em] text-gray-400">Discover Something New</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;