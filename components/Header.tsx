import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
}) => {
    const { user, logout } = useAuth();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
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


    const handleNavigate = (e: React.MouseEvent, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        setIsMenuOpen(false);
        setIsProfileMenuOpen(false);
    };

    const handleLogout = async () => {
        await logout();
        setIsProfileMenuOpen(false);
        // The router will handle redirecting to the landing page
    };

    const headerClasses = `fixed top-0 left-0 right-0 z-40 transition-colors duration-300 ${isScrolled || isScrolledProp ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent'}`;
    
    const navLinks = [
        { path: '/', label: 'Home' },
        { path: '/classics', label: 'Classics' },
        { path: '/watchlist', label: 'My List' },
    ];
    
    const logoUrl = "https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png";

    return (
        <header className={headerClasses} style={{ top: topOffset }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <a href="/" onClick={(e) => handleNavigate(e, '/')} className="flex-shrink-0" aria-label="Crate TV Home">
                           <img className="hidden md:block h-10 w-auto" src={`/api/proxy-image?url=${encodeURIComponent(logoUrl)}`} alt="Crate TV" crossOrigin="anonymous" />
                        </a>
                        {showNavLinks && user && (
                            <nav className="hidden md:block ml-10">
                                <div className="flex items-baseline space-x-4">
                                    {navLinks.map(link => (
                                        <a key={link.path} href={link.path} onClick={(e) => handleNavigate(e, link.path)} className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                                            {link.label}
                                        </a>
                                    ))}
                                </div>
                            </nav>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {showSearch && user && (
                            <div className="hidden md:block">
                                <form onSubmit={(e) => { e.preventDefault(); onSearchSubmit?.(searchQuery); }}>
                                    <input
                                        type="search"
                                        value={searchQuery}
                                        onChange={(e) => onSearch(e.target.value)}
                                        placeholder="Search..."
                                        className="bg-gray-700/50 text-white placeholder-gray-400 px-3 py-1.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </form>
                            </div>
                        )}
                        
                        {user ? (
                            <div className="relative" ref={profileMenuRef}>
                                <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-2">
                                    <span className="text-white text-sm font-medium hidden sm:block">{user.name || user.email}</span>
                                </button>
                                {isProfileMenuOpen && (
                                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5">
                                        <a href="/account" onClick={(e) => handleNavigate(e, '/account')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Account</a>
                                        {(user.isActor || user.isFilmmaker) && <a href="/portal" onClick={(e) => handleNavigate(e, '/portal')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Creator Dashboard</a>}
                                        <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Sign out</button>
                                    </div>
                                )}
                            </div>
                        ) : onSignInClick && (
                            <button onClick={onSignInClick} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-4 rounded-md text-sm">Sign In</button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;