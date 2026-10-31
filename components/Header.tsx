import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
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
    isLiveSpotlight?: boolean;
    hideLiveSpotlight?: boolean;
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
    isLiveSpotlight = false,
    hideLiveSpotlight = false,
}) => {
    const { user, logout } = useAuth();
    const { categories, movies, activeParties, livePartyMovie } = useFestival();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const nowStreamingMovie = useMemo(() => {
        const key = categories.nowStreaming?.movieKeys?.[0];
        return key ? movies[key] : null;
    }, [categories, movies]);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
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

    const handleNavigate = (e: React.MouseEvent, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        setIsProfileMenuOpen(false);
    };

    const headerClasses = `fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${isScrolled || isScrolledProp ? 'py-3 bg-black/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl' : 'py-8 bg-transparent'}`;
    
    const navLinks = [
        { path: '/', label: 'Home' },
        { path: '/public-square', label: 'Public Square' }
    ];
    if (user && (user.isActor || user.isFilmmaker)) navLinks.push({ path: '/portal', label: 'Creator Hub' });
    

    return (
        <header className={headerClasses} style={{ top: topOffset, paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}>
            <div className="max-w-[1800px] mx-auto px-6 md:px-12 flex items-center justify-between">
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-4">
                        {/* No watch party chip here: parties are announced by the
                            "Watch parties" cards at the top of the home page (Oct 26 2026). */}

                        {/* No logo in the top menu (Oct 2026, by choice). */}

                        {/* Phones: a way back home on every page except home itself. */}
                        {window.location.pathname !== '/' && (
                            <a
                                href="/"
                                onClick={(e) => handleNavigate(e, '/')}
                                className="md:hidden flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-gray-300 hover:text-white transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                                Home
                            </a>
                        )}
                    </div>

                    {/* Signed in: the full menu. Signed out: just a way back home,
                        except on the home page itself, where it would do nothing. */}
                    {((user && showNavLinks) || window.location.pathname !== '/') && (
                        <nav className="hidden md:flex items-center gap-10">
                            {(user && showNavLinks ? navLinks : navLinks.slice(0, 1)).map(link => (
                                <a 
                                    key={link.path} 
                                    href={link.path} 
                                    onClick={(e) => handleNavigate(e, link.path)} 
                                    className={`transition-all duration-300 text-[11px] font-black uppercase tracking-[0.25em] ${window.location.pathname === link.path ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                                >
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
                                    className="bg-white/5 border border-white/10 text-white placeholder-gray-600 px-4 py-2 pl-10 rounded-full text-xs w-48 focus:w-64 focus:border-red-500/30 focus:outline-none transition-all duration-300 shadow-inner"
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </form>
                        </div>
                    )}
                    
                    {user ? (
                        <div className="relative hidden md:block" ref={profileMenuRef}>
                            <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-3 transition-opacity hover:opacity-80">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-purple-700 overflow-hidden border border-white/10 shadow-lg" dangerouslySetInnerHTML={{ __html: avatars[user.avatar || 'fox'] }} />
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isProfileMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {isProfileMenuOpen && (
                                <div className="origin-top-right absolute right-0 mt-4 w-56 rounded-[1.5rem] shadow-2xl py-3 bg-black/95 backdrop-blur-3xl border border-white/10 ring-1 ring-black ring-opacity-5 z-[110] animate-[fadeIn_0.2s_ease-out]">
                                    <div className="px-5 py-3 border-b border-white/5 mb-2">
                                        <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">Signed in as</p>
                                        <p className="text-sm font-black text-white truncate uppercase italic">{user.name || user.email}</p>
                                    </div>
                                    <a href="/account" onClick={(e) => handleNavigate(e, '/account')} className="block px-5 py-2.5 text-xs font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-colors uppercase tracking-widest">Account Hub</a>
                                    <button onClick={logout} className="w-full text-left block px-5 py-2.5 text-xs font-bold text-gray-400 hover:bg-white/5 hover:text-red-500 transition-colors uppercase tracking-widest">Logout</button>
                                </div>
                            )}
                        </div>
                    ) : onSignInClick && (
                        <button onClick={onSignInClick} className="bg-red-600 hover:bg-red-700 text-white font-black py-2 px-6 rounded-full text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-xl">Login</button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;