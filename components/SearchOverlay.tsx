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
    // Focus the input when the overlay opens
    inputRef.current?.focus();
    // Prevent body scrolling
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
    // Don't close, let the user see the results
  };

  const handleSelect = (movie: Movie) => {
    onSelectMovie(movie);
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col p-4 animate-[fadeIn_0.2s_ease-out]"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-white">Search</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
          aria-label="Close search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="search"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Titles, actors, genres..."
          className="w-full py-4 pl-12 pr-4 bg-gray-800 border-2 border-gray-600 rounded-lg text-white text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
      </form>
      
      {/* Search Results Section */}
      <div className="flex-grow overflow-y-auto mt-6 scrollbar-hide">
        {searchQuery && results.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {results.map(movie => (
              <MovieCard key={movie.key} movie={movie} onSelectMovie={handleSelect} />
            ))}
          </div>
        )}
        {searchQuery && results.length === 0 && (
          <div className="text-center text-gray-400 pt-16">
            <p>No results found for "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
