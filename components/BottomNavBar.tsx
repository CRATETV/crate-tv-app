
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
             <NavItem
                path="/top-ten"
                activePath={activePath}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                label="Top 10"
            />
             <NavItem
                path="/portal"
                activePath={activePath}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H5v-2H3v-2H1v-4a1 1 0 011-1h2V7a1 1 0 011-1h2V3a1 1 0 011-1h2a1 1 0 011 1v2h2a1 1 0 011 1v2z" /></svg>}
                label="Portal"
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
                path="/watchlist" 
                activePath={activePath} 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
                label="My List" 
            />
        </div>
    );
};

export default BottomNavBar;