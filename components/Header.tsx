import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { avatars } from './avatars.ts';

interface HeaderProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  isScrolled: boolean;
  onMobileSearchClick: () => void;
  onSearchSubmit?: (query: string) => void;
  isStaging?: boolean;
  showSearch?: boolean;
  isFestivalLive?: boolean;
}

// FIX: Removed the unused `isOffline` prop.
const Header: React.FC<HeaderProps> = ({ searchQuery, onSearch, isScrolled, onMobileSearchClick, onSearchSubmit, isStaging, showSearch = true, isFestivalLive }) => {
  const [topOffset, setTopOffset] = useState(0);
  const { user, logout } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let offset = 0;
    if (isStaging) offset += 32;
    setTopOffset(offset);
  }, [isStaging]);
  
  // Effect to handle clicks outside of the account menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        // If the menu is open and the click is not inside the menu's DOM tree, close it.
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsAccountMenuOpen(false);
        }
    };
    // Add the event listener when the menu is open
    if (isAccountMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    // Clean up the event listener when the menu is closed or the component unmounts
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAccountMenuOpen]);

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
    setIsAccountMenuOpen(false);
    const url = new URL(path, window.location.origin);

    if (window.location.pathname === url.pathname && url.hash) {
      const element = document.querySelector(url.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', path);
      }
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('pushstate'));
    }
  };

  const pathname = window.location.pathname;
  const linkBaseStyles = "px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200";
  const activeLinkStyles = "bg-white/10 text-white";
  const inactiveLinkStyles = "text-gray-300 hover:bg-white/20 hover:text-white";
  
  // Determine if the header should have a solid background. It's solid if scrolled, on login/about pages,
  // or if the user is logged out on the landing page.
  const hasSolidBg = isScrolled || pathname.startsWith('/login') || pathname.startsWith('/about') || (pathname === '/' && !user);

  return (
    <header 
      className={`fixed left-0 w-full z-40 px-4 md:px-8 py-3 flex justify-between items-center transition-all duration-300 ${hasSolidBg ? 'bg-[#141414]/80 backdrop-blur-sm border-b border-gray-800' : 'bg-gradient-to-b from-black/70 to-transparent'}`}
      style={{ top: `${topOffset}px` }}
    >
      <div className="flex items-center gap-2 md:gap-4">
        {user ? (
            // --- Logged-in view ---
            <>
                <a 
                  href="/" 
                  onClick={(e) => handleNavigate(e, '/')} 
                  className={`${linkBaseStyles} ${pathname === '/' ? activeLinkStyles : inactiveLinkStyles}`}
                >
                  Home
                </a>
                <a 
                  href="/watchlist" 
                  onClick={(e) => handleNavigate(e, '/watchlist')} 
                  className={`${linkBaseStyles} ${pathname.startsWith('/watchlist') ? activeLinkStyles : inactiveLinkStyles}`}
                >
                  My List
                </a>
                <a 
                  href="/classics" 
                  onClick={(e) => handleNavigate(e, '/classics')} 
                  className={`${linkBaseStyles} ${pathname.startsWith('/classics') ? activeLinkStyles : inactiveLinkStyles}`}
                >
                  Classics
                </a>
                {isFestivalLive && (
                    <a 
                      href="/festival" 
                      onClick={(e) => handleNavigate(e, '/festival')} 
                      className={`${linkBaseStyles} ${pathname.startsWith('/festival') ? activeLinkStyles : inactiveLinkStyles}`}
                    >
                      Festival
                    </a>
                )}
            </>
        ) : (
            // --- Logged-out view (All pages) ---
            <a 
                href="/about" 
                onClick={(e) => handleNavigate(e, '/about')} 
                className={`${linkBaseStyles} ${pathname.startsWith('/about') ? activeLinkStyles : inactiveLinkStyles}`}
            >
                About Us
            </a>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {showSearch && (
          <>
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
            <div className="md:hidden flex items-center">
                <button onClick={onMobileSearchClick} className="p-2 text-white" aria-label="Open search">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </button>
            </div>
          </>
        )}

        {user ? (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)} className="flex items-center justify-center h-8 w-8 rounded-full text-white bg-gray-700 hover:bg-white/10" aria-label="Open user menu">
              {user.avatar && avatars[user.avatar] ? (
                <div className="h-full w-full p-1" dangerouslySetInnerHTML={{ __html: avatars[user.avatar] }} />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            {isAccountMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 border border-gray-700">
                <a href="/account" onClick={(e) => handleNavigate(e, '/account')} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">My Account</a>
                <button onClick={logout} className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Sign Out</button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default Header;