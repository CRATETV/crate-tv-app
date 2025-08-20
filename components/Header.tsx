
import React from 'react';

interface HeaderProps {
  searchQuery: string;
  onSearch: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ searchQuery, onSearch }) => {
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(event.target.value);
  };
  
  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <header className="absolute top-0 left-0 w-full z-40 p-4 flex justify-end items-center bg-gradient-to-b from-black/80 to-transparent">
      <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xs">
        <input
          type="text"
          name="search"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search movies or actors..."
          className="w-full py-2 pl-4 pr-10 bg-gray-800/70 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
        />
        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </button>
      </form>
    </header>
  );
};

export default Header;
