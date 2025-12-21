
import React, { useState, useEffect, useRef } from 'react';
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
    showNavLinks?: boolean;
    topOffset?: string;
    isStaging?: boolean;
    autoFocus?: boolean;
}

const Header: React.FC<HeaderProps> = ({
    searchQuery,
    onSearch,
    onSearchSubmit,
    onMobileSearchClick,
    isScrolled: isScrolledProp,
    showSearch = true,
    onSignInClick,
    showNavLinks = true,
    topOffset = '0px',
    isStaging,
    autoFocus,
}) => {
    const { user, logout } = useAuth();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);


    const handleNavigate = (e: React.MouseEvent, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        setIsProfileMenuOpen(false);
    };

    const handleLogout = async () => {
        await logout();
        setIsProfileMenuOpen(false);
    };

    const headerClasses = `fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${isScrolled || isScrolledProp ? 'bg-black/85 backdrop-blur-xl border-b border-white/5 py-3' : 'bg-transparent py-5'}`;
    
    const navLinks = [
        { path: '/', label: 'Home' },
        { path: '/classics', label: 'Vintage' },
        { path: '/watchlist', label: 'My List' },
    ];
    
    return (
        <header className={headerClasses} style={{ top: topOffset }}>
            <div className="max-w-[1800px] mx-auto px-4 md:px-12 flex items-center justify-between">
                <div className="flex items-center gap-10">
                    {/* Logo intentionally removed for cinematic focus */}
                    {showNavLinks && user && (
                        <nav className="hidden md:flex items-center gap-6">
                            {navLinks.map(link => (
                                <a key={link.path} href={link.path} onClick={(e) => handleNavigate(e, link.path)} className="text-gray-300 hover:text-white transition-colors text-sm font-medium tracking-wide">
                                    {link.label}
                                </a>
                            ))}
                        </nav>
                    )}
                </div>

                <div className="flex items-center gap-6">
                    {showSearch && user && (
                        <div className="hidden md:block relative group">
                            <form onSubmit={(e) => { e.preventDefault(); onSearchSubmit?.(searchQuery); }}>
                                <input
                                    ref={inputRef}
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => onSearch(e.target.value)}
                                    placeholder="Titles, people, genres"
                                    className="bg-black/40 border border-white/20 text-white placeholder-gray-400 px-4 py-1.5 pl-10 rounded-full text-xs w-48 focus:w-64 focus:border-red-500/50 focus:bg-black/60 focus:outline-none transition-all duration-300"
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </form>
                        </div>
                    )}
                    
                    {user ? (
                        <div className="relative" ref={profileMenuRef}>
                            <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-3 transition-opacity hover:opacity-80">
                                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-red-600 to-purple-700 overflow-hidden border border-white/10" dangerouslySetInnerHTML={{ __html: avatars[user.avatar || 'fox'] }} />
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isProfileMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {isProfileMenuOpen && (
                                <div className="origin-top-right absolute right-0 mt-3 w-52 rounded-md shadow-2xl py-2 bg-black border border-white/10 ring-1 ring-black ring-opacity-5 z-50 animate-[fadeIn_0.2s_ease-out]">
                                    <div className="px-4 py-2 border-b border-white/10 mb-2">
                                        <p className="text-xs text-gray-500">Logged in as</p>
                                        <p className="text-sm font-bold text-white truncate">{user.name || user.email}</p>
                                    </div>
                                    <a href="/account" onClick={(e) => handleNavigate(e, '/account')} className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">Account</a>
                                    {(user.isActor || user.isFilmmaker) && <a href="/portal" onClick={(e) => handleNavigate(e, '/portal')} className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">Creator Dashboard</a>}
                                    <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">Sign out</button>
                                </div>
                            )}
                        </div>
                    ) : onSignInClick && (
                        <button onClick={onSignInClick} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-5 rounded text-sm transition-transform active:scale-95 shadow-lg">Sign In</button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
