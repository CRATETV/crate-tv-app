

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface BottomNavBarProps {
  onSearchClick: () => void;
  isFestivalLive?: boolean;
}

// FIX: Changed JSX.Element to React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
const NavItem: React.FC<{ path: string; activePath: string; icon: React.ReactElement; label: string; onClick?: () => void; }> = ({ path, activePath, icon, label, onClick }) => {
    const isActive = activePath === path;

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (onClick) {
            onClick();
        } else {
            window.history.pushState({}, '', path);
            window.dispatchEvent(new Event('pushstate'));
        }
    };
    
    return (
        <a href={path} onClick={handleNavigate} className="flex flex-col items-center justify-center text-center flex-1">
            <div className={`transition-colors ${isActive ? 'text-white' : 'text-gray-400'}`}>
                {icon}
            </div>
            <span className={`text-xs mt-1 transition-colors ${isActive ? 'text-white' : 'text-gray-400'}`}>{label}</span>
        </a>
    );
};


const BottomNavBar: React.FC<BottomNavBarProps> = ({ onSearchClick, isFestivalLive }) => {
    const { user } = useAuth();
    const [activePath, setActivePath] = useState(window.location.pathname);

    useEffect(() => {
        const onNavigate = () => {
            setActivePath(window.location.pathname);
        };
        
        window.addEventListener('popstate', onNavigate);
        window.addEventListener('pushstate', onNavigate);

        return () => {
            window.removeEventListener('popstate', onNavigate);
            window.removeEventListener('pushstate', onNavigate);
        };
    }, []);

    const accountPath = user ? '/account' : '/login';

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-sm border-t border-gray-800 z-40 flex justify-around items-center">
            <NavItem 
                path="/" 
                activePath={activePath} 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                label="Home" 
            />
            <NavItem 
                path="/search" 
                activePath={activePath} 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                label="Search"
                onClick={onSearchClick}
            />
            {isFestivalLive && (
                <NavItem 
                    path="/festival" 
                    activePath={activePath} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>}
                    label="Festival" 
                />
            )}
             <NavItem 
                path="/portal" 
                activePath={activePath} 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                label="Portals" 
            />
            {user && (
                <NavItem 
                    path="/watchlist" 
                    activePath={activePath} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
                    label="My List" 
                />
            )}
             {user && (
                <NavItem 
                    path={accountPath} 
                    activePath={activePath} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                    label={'Account'}
                />
            )}
        </div>
    );
};

export default BottomNavBar;