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

    // Role Toggles
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
                <div className="max-w-7xl mx-auto px-4 md:px-12">
                     <div className="mb-8 flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter">Command Center</h1>
                            <p className="text-gray-400 mt-2 font-bold uppercase text-[10px] tracking-widest">Active Operator: {user.name}</p>
                        </div>
                    </div>

                    {visibleRoles.length > 1 && (
                        <div className="mb-10 flex gap-2 p-1 bg-white/5 border border-white/5 rounded-2xl w-max">
                            {visibleRoles.map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => setActiveView(role.id)}
                                    className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-3 ${activeView === role.id ? 'bg-red-600 text-white shadow-xl shadow-red-900/20' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    <span>{role.icon}</span>
                                    {role.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="animate-[fadeIn_0.5s_ease-out]">
                        {activeView === 'filmmaker' && <FilmmakerDashboardView />}
                        {activeView === 'actor' && <ActorPortalView />}
                        {activeView === 'industry' && <IndustryPortalView />}
                    </div>
                </div>
            </main>
            <CollapsibleFooter showActorLinks={true} />
            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export default CreatorDashboardPage;