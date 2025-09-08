import React from 'react';

interface HeaderProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  isScrolled: boolean;
  onMobileSearchClick: () => void;
  onSearchSubmit?: (query: string) => void;
  isStaging?: boolean;
  showSearch?: boolean;
}

const Header: React.FC<HeaderProps> = ({ searchQuery, onSearch, isScrolled, onMobileSearchClick, onSearchSubmit, isStaging, showSearch = true }) => {
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(event.target.value);
  };
  
  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit(searchQuery);
    }
  };

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    // Use relative path directly to avoid issues in sandboxed environments
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  };

  return (
    <header className={`fixed left-0 w-full z-40 px-4 md:px-8 py-4 flex justify-between items-center transition-all duration-500 ${isStaging ? 'top-8' : 'top-0'} ${isScrolled ? 'bg-[#141414]' : 'bg-gradient-to-b from-black/70 to-transparent'}`}>
      <div className="flex items-center gap-4 md:gap-6">
        <a href="/" onClick={(e) => handleNavigate(e, '/')} className="text-white font-medium hover:text-gray-300 transition-colors">Home</a>
        <a href="/classics" onClick={(e) => handleNavigate(e, '/classics')} className="text-white font-medium hover:text-gray-300 transition-colors">Classics</a>
      </div>
      <div className="flex items-center gap-4">
        {showSearch && (
          <>
            {/* Desktop Search */}
            <form onSubmit={handleSearchSubmit} className="relative w-full max-w-[150px] sm:max-w-xs hidden md:block">
              <input
                type="text"
                name="search"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search..."
                className="w-full py-2 pl-10 pr-4 bg-black/50 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/80 focus:bg-black/70 transition-all"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </form>
            
            {/* Mobile Search Button */}
            <div className="md:hidden flex items-center">
                <button 
                  onClick={onMobileSearchClick}
                  className="p-2 text-white"
                  aria-label="Open search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;