import React, { useState, useEffect } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import ActorPortalView from './ActorPortalView';
import FilmmakerDashboardView from './FilmmakerDashboardView';
import IndustryPortalView from './IndustryPortalView';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { useFestival } from '../contexts/FestivalContext';

type DashboardRole = 'filmmaker' | 'actor' | 'industry';

const CreatorDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [activeView, setActiveView] = useState<DashboardRole>(() => {
        if (user?.isIndustryPro) return 'industry';
        if (user?.isFilmmaker) return 'filmmaker';
        return 'actor';
    });
    
    const [isPrivacyMode, setIsPrivacyMode] = useState(false);

    useEffect(() => {
        if (user) {
            if (!user.isIndustryPro && activeView === 'industry') {
                 setActiveView(user.isFilmmaker ? 'filmmaker' : 'actor');
            }
        }
    }, [user]);

    if (!user || !user.name) {
        return <LoadingSpinner />;
    }

    const roles: { id: DashboardRole; label: string; icon: string; access: boolean }[] = [
        { id: 'filmmaker', label: 'Filmmaker', icon: '🎥', access: !!user.isFilmmaker },
        { id: 'actor', label: 'Actor', icon: '🎭', access: !!user.isActor },
        { id: 'industry', label: 'Industry Terminal', icon: '📟', access: !!user.isIndustryPro || user.email === 'cratetiv@gmail.com' },
    ];

    const visibleRoles = roles.filter(r => r.access);

    return (
        <div className="flex flex-col min-h-screen text-white bg-black">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} showNavLinks={false} />
            <main className="flex-grow pt-24 pb-24 md:pb-0">
                <div className="max-w-[1400px] mx-auto px-4 md:px-12">
                     <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-1.5 h-10 bg-red-600 absolute -left-4 top-1/2 -translate-y-1/2 rounded-full"></div>
                                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">Studio <span className="text-gray-500">Center</span></h1>
                                <p className="text-gray-500 mt-2 font-black uppercase text-[10px] tracking-[0.4em]">Operational Identity: {user.name}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all uppercase text-[9px] font-black tracking-widest ${isPrivacyMode ? 'bg-red-600/10 border-red-500 text-red-500' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
                                title={isPrivacyMode ? "Disable Privacy Mode" : "Enable Privacy Mode"}
                            >
                                {isPrivacyMode ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.022 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                                {isPrivacyMode ? 'Privacy On' : 'Privacy Off'}
                            </button>
                            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-green-500">Cloud Connected</span>
                            </div>
                        </div>
                    </div>

                    {visibleRoles.length > 1 && (
                        <div className="mb-12 flex gap-2 p-1 bg-white/5 border border-white/5 rounded-2xl w-max">
                            {visibleRoles.map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => setActiveView(role.id)}
                                    className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-3 ${activeView === role.id ? 'bg-red-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <span>{role.icon}</span>
                                    {role.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className={`animate-[fadeIn_0.5s_ease-out] ${isPrivacyMode ? 'privacy-mask' : ''}`}>
                        {activeView === 'filmmaker' && <FilmmakerDashboardView />}
                        {activeView === 'actor' && <ActorPortalView />}
                        {activeView === 'industry' && <IndustryPortalView />}
                    </div>
                </div>
            </main>
            <CollapsibleFooter showActorLinks={true} />
            <BottomNavBar onSearchClick={() => {}} />
            <style>{`
                .privacy-mask .text-3xl, 
                .privacy-mask .text-2xl, 
                .privacy-mask .font-bold.text-green-500,
                .privacy-mask .text-sm.font-bold.text-green-500 {
                    filter: blur(8px);
                    user-select: none;
                    pointer-events: none;
                    transition: filter 0.3s ease;
                }
            `}</style>
        </div>
    );
};

export default CreatorDashboardPage;