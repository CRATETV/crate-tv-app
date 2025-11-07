import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { avatars } from './avatars';

interface HeaderProps {
    searchQuery: string;
    onSearch: (query: string) => void;
    onSearchSubmit?: (query: string) => void;
    onMobileSearchClick: () => void;
    isScrolled?: boolean;
    showSearch?: boolean;
    onSignInClick?: () => void;
    isStaging?: boolean;
    showNavLinks?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
    searchQuery, 
    onSearch, 
    onSearchSubmit,
    onMobileSearchClick,
    isScrolled: propScrolled,
    showSearch = true,
    onSignInClick,
    isStaging,
    showNavLinks = true,
}) => {
    const { user } = useAuth();
    const [isScrolled, setIsScrolled] = useState(propScrolled || false);
    const [isSearchActive, setIsSearchActive] = useState(false);

    useEffect(() => {
        if (propScrolled !== undefined) {
            setIsScrolled(propScrolled);
            return;
        };
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [propScrolled]);

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <header className={`fixed top-0 left-0 right-0 z-30 transition-colors duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent'}`}>
            {isStaging && <div className="bg-yellow-500 text-black text-center py-1 text-sm font-bold">Staging Environment</div>}
            <div className={`flex items-center justify-between px-4 md:px-12 transition-all duration-300 ${isStaging ? 'h-14' : 'h-16'}`}>
                <div className="flex items-center gap-8">
                    <a href="/" onClick={(e) => handleNavigate(e, '/')}>
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" className="w-24 h-auto" />
                    </a>
                     {showNavLinks && (
                        <nav className="hidden md:flex items-center gap-6">
                            <a href="/" onClick={(e) => handleNavigate(e, '/')} className="text-sm font-medium text-white hover:text-gray-300 transition-colors">Home</a>
                            <a href="/classics" onClick={(e) => handleNavigate(e, '/classics')} className="text-sm font-medium text-white hover:text-gray-300 transition-colors">Classics</a>
                            <a href="/top-ten" onClick={(e) => handleNavigate(e, '/top-ten')} className="text-sm font-medium text-white hover:text-gray-300 transition-colors">Top 10</a>
                             <a href="/portal" onClick={(e) => handleNavigate(e, '/portal')} className="text-sm font-medium text-white hover:text-gray-300 transition-colors">Portals</a>
                        </nav>
                     )}
                </div>
                <div className="flex items-center gap-4">
                    {showSearch && (
                        <div className="hidden md:flex items-center gap-2">
                             <form onSubmit={(e) => { e.preventDefault(); onSearchSubmit?.(searchQuery); }}>
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => onSearch(e.target.value)}
                                    placeholder="Search..."
                                    className={`bg-black/50 border border-gray-600 rounded-md py-1 px-3 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${isSearchActive || searchQuery ? 'w-48 opacity-100' : 'w-0 opacity-0'}`}
                                    onFocus={() => setIsSearchActive(true)}
                                    onBlur={() => { if(!searchQuery) setIsSearchActive(false);}}
                                />
                            </form>
                            <button onClick={() => setIsSearchActive(!isSearchActive)} className="text-white hover:text-gray-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </button>
                        </div>
                    )}
                    {showSearch && (
                        <button onClick={onMobileSearchClick} className="text-white hover:text-gray-300 md:hidden">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </button>
                    )}
                    {user ? (
                        <a href="/account" onClick={(e) => handleNavigate(e, '/account')} className="w-8 h-8 rounded-full bg-gray-700 p-1" dangerouslySetInnerHTML={{ __html: avatars[user.avatar || 'fox'] }} />
                    ) : onSignInClick ? (
                        <button onClick={onSignInClick} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-4 rounded-md text-sm">Sign In</button>
                    ) : (
                         <a href="/login" onClick={(e) => handleNavigate(e, '/login')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-4 rounded-md text-sm">Sign In</a>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
