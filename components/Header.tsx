import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { avatars } from './avatars';

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
  onSignInClick?: () => void;
  showNavLinks?: boolean;
}

const Header: React.FC<HeaderProps> = ({ searchQuery, onSearch, isScrolled, onSearchSubmit, isStaging, showSearch = true, isFestivalLive, onSignInClick, showNavLinks = true }) => {
  const [topOffset, setTopOffset] = useState(0);
  const { user, logout } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isDesktopSearchVisible, setIsDesktopSearchVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let offset = 0;
    if (isStaging) offset += 32;
    setTopOffset(offset);
  }, [isStaging]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsAccountMenuOpen(false);
        }
    };
    if (isAccountMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAccountMenuOpen]);

  useEffect(() => {
    if (isDesktopSearchVisible) {
        searchInputRef.current?.focus();
    }
  }, [isDesktopSearchVisible]);

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
    
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  };

  const pathname = window.location.pathname;
  const linkBaseStyles = "px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200";
  const activeLinkStyles = "bg-white/10 text-white";
  const inactiveLinkStyles = "text-gray-300 hover:bg-white/20 hover:text-white";
  
  const hasSolidBg = isScrolled || pathname !== '/';

  const signInButton = (
    <button 
      onClick={onSignInClick} 
      className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded-md transition-colors"
    >
      Sign In
    </button>
  );

  const signInLink = (
    <a 
      href="/login" 
      onClick={(e) => handleNavigate(e, '/login')} 
      className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded-md transition-colors"
    >
      Sign In
    </a>
  );

  return (
    <>
    <header 
      className={`fixed left-0 w-full z-40 px-4 md:px-8 py-3 flex justify-between items-center transition-all duration-300 ${hasSolidBg ? 'bg-[#141414]/80 backdrop-blur-sm border-b border-gray-800' : 'bg-gradient-to-b from-black/70 to-transparent'}`}
      style={{ top: `${topOffset}px` }}
    >
      {/* Left Side: Logo and Desktop Nav */}
      <div className="flex items-center gap-4 md:gap-6">
        <a href="/" onClick={(e) => handleNavigate(e, '/')} aria-label="Crate TV Home">
            <img 
                src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" 
                alt="Crate TV" 
                className="h-8 w-auto"
                onContextMenu={(e) => e.preventDefault()}
            />
        </a>
        {showNavLinks && (
          <nav className="hidden md:flex items-center gap-2 md:gap-4">
            <a href="/classics" onClick={(e) => handleNavigate(e, '/classics')} className={`${linkBaseStyles} ${pathname.startsWith('/classics') ? activeLinkStyles : inactiveLinkStyles}`}>Classics</a>
            {isFestivalLive && <a href="/festival" onClick={(e) => handleNavigate(e, '/festival')} className={`${linkBaseStyles} ${pathname.startsWith('/festival') ? activeLinkStyles : inactiveLinkStyles}`}>Festival</a>}
          </nav>
        )}
      </div>
      
      {/* Right Side (Desktop only) */}
      <div className="hidden md:flex items-center gap-2 sm:gap-4">
        {showSearch && (
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className={`relative transition-all duration-300 ${isDesktopSearchVisible ? 'w-64' : 'w-0'}`}>
              <input 
                ref={searchInputRef}
                type="text" 
                name="search" 
                value={searchQuery} 
                onChange={handleSearch} 
                placeholder="Search..." 
                className={`w-full py-2 pl-4 pr-4 bg-black/50 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/80 focus:bg-black/70 transition-opacity duration-300 ${isDesktopSearchVisible ? 'opacity-100' : 'opacity-0'}`}
                onBlur={() => { if (!searchQuery) setIsDesktopSearchVisible(false); }}
              />
            </form>
             <button onClick={() => setIsDesktopSearchVisible(!isDesktopSearchVisible)} className="p-2 text-white" aria-label="Toggle search">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
             </button>
          </div>
        )}

        {user ? (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)} className="flex items-center justify-center h-8 w-8 rounded-full text-white bg-gray-700 hover:bg-white/10" aria-label="Open user menu">
              {user.avatar && avatars[user.avatar] ? (
                <div className="h-full w-full p-1" dangerouslySetInnerHTML={{ __html: avatars[user.avatar] }} />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" /></svg>
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
           onSignInClick ? signInButton : signInLink
        )}
      </div>
    </header>
    </>
  );
};

export default Header;