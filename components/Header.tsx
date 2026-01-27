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
}) => {
    const { user, logout } = useAuth();
    const { categories, movies } = useFestival();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const nowStreamingMovie = useMemo(() => {
        const key = categories.nowStreaming?.movieKeys?.[0];
        return key ? movies[key] : null;
    }, [categories, movies]);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
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

    // VISUAL UPDATE: ULTIMATE TRANSPARENCY
    // Removed all background tints (bg-transparent) and shadows to make the area completely transparent.
    const headerClasses = `sticky top-0 z-40 transition-all duration-700 ${isScrolled || isScrolledProp ? 'bg-transparent backdrop-blur-xl py-3' : 'bg-transparent py-5'}`;
    
    const navLinks = [
        { path: '/', label: 'Home' }, 
        { path: '/public-square', label: 'Public Square' }
    ];
    if (user && (user.isActor || user.isFilmmaker)) navLinks.push({ path: '/portal', label: 'Creator Hub' });
    
    const spotlightPath = isLiveSpotlight && nowStreamingMovie 
        ? `/watchparty/${nowStreamingMovie.key}`
        : nowStreamingMovie ? `/movie/${nowStreamingMovie.key}?play=true` : '/';

    return (
        <header className={headerClasses} style={{ marginTop: topOffset, paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
            <div className="max-w-[1800px] mx-auto px-4 md:px-12 flex items-center justify-between">
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-4">
                        {nowStreamingMovie && (
                            <button 
                                onClick={(e) => handleNavigate(e, spotlightPath)}
                                className={`group flex items-center gap-3 ${isLiveSpotlight ? 'bg-red-600' : 'bg-red-600/5 border border-red-600/10'} hover:bg-red-600 transition-all px-4 py-2 rounded-full shadow-lg`}
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="relative flex h-2 w-2">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLiveSpotlight ? 'bg-white' : 'bg-red-400'} opacity-75`}></span>
                                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveSpotlight ? 'bg-white' : 'bg-red-600'}`}></span>
                                    </span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isLiveSpotlight ? 'text-white' : 'text-red-500'} group-hover:text-white transition-colors`}>
                                        {isLiveSpotlight ? 'Join Live Party' : 'Now Streaming'}
                                    </span>
                                </div>
                                <span className="text-white font-black text-xs uppercase tracking-tighter hidden sm:inline">{nowStreamingMovie.title}</span>
                            </button>
                        )}
                    </div>

                    {showNavLinks && user && (
                        <nav className="hidden md:flex items-center gap-8">
                            {navLinks.map(link => (
                                <a 
                                    key={link.path} 
                                    href={link.path} 
                                    onClick={(e) => handleNavigate(e, link.path)} 
                                    className={`transition-all duration-300 text-sm font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 ${link.label === 'Creator Hub' ? 'text-red-500 hover:text-white' : link.label === 'Public Square' ? 'text-emerald-400 hover:text-white' : 'text-gray-300 hover:text-white'}`}
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
                                    className="bg-white/5 border border-white/5 text-white placeholder-gray-600 px-4 py-1.5 pl-10 rounded-full text-xs w-48 focus:w-64 focus:border-red-500/30 focus:outline-none transition-all duration-300 shadow-inner"
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
                                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-red-600 to-purple-700 overflow-hidden border border-white/10" dangerouslySetInnerHTML={{ __html: avatars[user.avatar || 'fox'] }} />
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isProfileMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {isProfileMenuOpen && (
                                <div className="origin-top-right absolute right-0 mt-3 w-52 rounded-md shadow-2xl py-2 bg-black/90 backdrop-blur-3xl border border-white/10 ring-1 ring-black ring-opacity-5 z-50 animate-[fadeIn_0.2s_ease-out]">
                                    <div className="px-4 py-2 border-b border-white/5 mb-2">
                                        <p className="text-xs text-gray-500 uppercase font-black tracking-widest">Operator</p>
                                        <p className="text-sm font-bold text-white truncate">{user.name || user.email}</p>
                                    </div>
                                    <a href="/account" onClick={(e) => handleNavigate(e, '/account')} className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">Account Settings</a>
                                    <button onClick={logout} className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">Terminate Session</button>
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