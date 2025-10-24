import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const avatars: Record<string, string> = {
    'fox': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill="#f97316" d="M20.5 13c-1.5 0-2.5-1.5-4-1.5s-2.5 1.5-4 1.5-2.5-1.5-4-1.5-2.5 1.5-4 1.5v-2c1.5 0 2.5-1.5 4-1.5s2.5 1.5 4 1.5 2.5-1.5 4-1.5 2.5 1.5 4 1.5v2z"/><path fill="#fff" d="M15.5 13c-1.5 0-2.5-1.5-4-1.5s-2.5 1.5-4 1.5S5 11.5 6.5 11.5 9 13 10.5 13s2.5-1.5 4-1.5 2.5 1.5 4-1.5.5-1.5-1-1.5-2.5 1.5-4 1.5-2.5-1.5-4-1.5-2.5 1.5-4 1.5-2.5-1.5-4-1.5c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2zM4.5 3.5l-1 4 2-1 1-4-2 1z"/><path fill="#111827" d="M9.5 8.5a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"/></svg>',
    'astronaut': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#60A5FA" d="M12 2a10 10 0 100 20 10 10 0 000-20z"/><path fill="#FFFFFF" d="M12 4a8 8 0 100 16 8 8 0 000-16z"/><path fill="#1F2937" d="M12 5a7 7 0 100 14 7 7 0 000-14z"/><path fill="#FBBF24" d="M12 5a7 7 0 100 14 7 7 0 000-14z" opacity=".3"/><path fill="#FFFFFF" d="M16 11H8c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h8c.6 0 1-.4 1-1v-2c0-.6-.4-1-1-1z"/></svg>',
    'skull': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="a" gradientUnits="userSpaceOnUse" x1="12" y1="2" x2="12" y2="22"><stop offset="0" stop-color="#EC4899"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient></defs><path fill="url(#a)" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-3 7a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm-3 10c-3 0-5-2-5-5h10c0 3-2 5-5 5z"/></svg>',
    'tv': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#9CA3AF" d="M21 7H3a2 2 0 00-2 2v10a2 2 0 002 2h18a2 2 0 002-2V9a2 2 0 00-2-2z"/><path fill="#4B5563" d="M19 9H5v8h14V9z"/><defs><linearGradient id="b" gradientUnits="userSpaceOnUse" x1="12" y1="9" x2="12" y2="17"><stop offset="0" stop-color="#34D399"/><stop offset=".5" stop-color="#FBBF24"/><stop offset="1" stop-color="#F87171"/></linearGradient></defs><path fill="url(#b)" d="M19 9H5v8h14V9z"/><path fill="#9CA3AF" d="M16 5h-3l1-2h1l1 2zm6 1l-1-2h-3l1 2h3zM7 5H4l1-2h2l-1 2zM9 22h6v-2H9v2z"/></svg>',
    'spraycan': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#3B82F6" d="M15 4H9v2h6V4z"/><path fill="#9CA3AF" d="M17 6H7a1 1 0 00-1 1v13a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1z"/><path fill="#F87171" d="M10 2h4v2h-4z"/><path fill="#FFFFFF" d="M16 11a1 1 0 01-1 1H9a1 1 0 01-1-1V9a1 1 0 011-1h6a1 1 0 011 1v2z"/></svg>',
    'flame': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="d" gradientUnits="userSpaceOnUse" x1="12" y1="5" x2="12" y2="21"><stop offset="0" stop-color="#F97316"/><stop offset="1" stop-color="#FBBF24"/></linearGradient></defs><path fill="url(#d)" d="M12 21c-3.5-2-7-5.5-7-10.5C5 5.5 8.5 2 12 2s7 3.5 7 8.5c0 5-3.5 8.5-7 10.5z"/><path fill="#FFFFFF" opacity=".3" d="M12 6c-2 0-3 2-3 4s1 4 3 4 3-2 3-4-1-4-3-4z"/></svg>',
    'crystal': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="e" gradientUnits="userSpaceOnUse" x1="12" y1="3" x2="12" y2="21"><stop offset="0" stop-color="#A78BFA"/><stop offset="1" stop-color="#3B82F6"/></linearGradient></defs><path fill="url(#e)" d="M12 3l-10 8 10 10 10-10-10-8zm0 2.24L19.76 11 12 18.76 4.24 11 12 5.24z"/></svg>',
    'planet': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#84CC16" d="M12 2a10 10 0 100 20 10 10 0 000-20z"/><path fill="#10B981" d="M12 4a8 8 0 100 16 8 8 0 000-16z"/><path d="M21 15a9 9 0 00-18 0" stroke="#FDE047" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
};

interface HeaderProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  isScrolled: boolean;
  onMobileSearchClick: () => void;
  onSearchSubmit?: (query: string) => void;
  isStaging?: boolean;
  isOffline?: boolean;
  showSearch?: boolean;
  isFestivalLive?: boolean;
  isLandingPage?: boolean;
}

const Header: React.FC<HeaderProps> = ({ searchQuery, onSearch, isScrolled, onMobileSearchClick, onSearchSubmit, isStaging, isOffline, showSearch = true, isFestivalLive, isLandingPage = false }) => {
  const [topOffset, setTopOffset] = useState(0);
  const { user, logout } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  useEffect(() => {
    let offset = 0;
    if (isStaging) offset += 32;
    setTopOffset(offset);
  }, [isStaging]);
  
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
  const isLoginPage = pathname.startsWith('/login');
  const isAboutPage = pathname.startsWith('/about');
  const isHomePage = pathname === '/';
  const linkBaseStyles = "px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200";
  const activeLinkStyles = "bg-white/10 text-white";
  const inactiveLinkStyles = "text-gray-300 hover:bg-white/20 hover:text-white";

  return (
    <header 
      className={`fixed left-0 w-full z-40 px-4 md:px-8 py-3 flex justify-between items-center transition-all duration-300 ${isScrolled || isLoginPage || isAboutPage || isLandingPage ? 'bg-[#141414]/80 backdrop-blur-sm border-b border-gray-800' : 'bg-gradient-to-b from-black/70 to-transparent'}`}
      style={{ top: `${topOffset}px` }}
    >
      <div className="flex items-center gap-2 md:gap-4">
        {isLandingPage ? (
            <a 
              href="/about" 
              onClick={(e) => handleNavigate(e, '/about')} 
              className={`${linkBaseStyles} ${inactiveLinkStyles}`}
            >
              About Us
            </a>
        ) : isLoginPage ? (
            <a 
              href="/about" 
              onClick={(e) => handleNavigate(e, '/about')} 
              className={`${linkBaseStyles} ${pathname.startsWith('/about') ? activeLinkStyles : inactiveLinkStyles}`}
            >
              About Us
            </a>
        ) : (
          <>
            {user && (
                <a 
                  href="/" 
                  onClick={(e) => handleNavigate(e, '/')} 
                  className={`${linkBaseStyles} ${pathname === '/' ? activeLinkStyles : inactiveLinkStyles}`}
                >
                  Home
                </a>
            )}
            {!isAboutPage && !isLandingPage && (
              <a 
                href="/classics" 
                onClick={(e) => handleNavigate(e, '/classics')} 
                className={`${linkBaseStyles} ${pathname.startsWith('/classics') ? activeLinkStyles : inactiveLinkStyles}`}
              >
                Classics
              </a>
            )}
            {!isAboutPage && !isHomePage && (
              <a 
                href="/about" 
                onClick={(e) => handleNavigate(e, '/about')} 
                className={`${linkBaseStyles} ${pathname.startsWith('/about') ? activeLinkStyles : inactiveLinkStyles}`}
              >
                About Us
              </a>
            )}
            {isFestivalLive && !isHomePage && (
                <a 
                  href="/festival" 
                  onClick={(e) => handleNavigate(e, '/festival')} 
                  className={`${linkBaseStyles} ${pathname.startsWith('/festival') ? activeLinkStyles : inactiveLinkStyles}`}
                >
                  Festival
                </a>
            )}
          </>
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
          <div className="relative">
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
        ) : (
          !isLoginPage && !isLandingPage && (
             <a href="/login" onClick={(e) => handleNavigate(e, '/login')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">
              Sign In
            </a>
          )
        )}
      </div>
    </header>
  );
};

export default Header;