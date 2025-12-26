import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import PlayFinder from './PlayFinder';
import ActorProfileEditor from './ActorProfileEditor';
import MonologueGenerator from './MonologueGenerator';
import LoadingSpinner from './LoadingSpinner';

const ActorPortalView: React.FC = () => {
    const { user } = useAuth();

    if (!user || !user.name) {
        return <LoadingSpinner />; 
    }
    
    return (
        <div className="animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tighter uppercase">Actor Hub</h1>
                    <p className="text-gray-400 mt-2 font-bold uppercase text-[10px] tracking-widest">Elevate your performance profile.</p>
                </div>
                 <a 
                    href="/actors-directory" 
                    target="_blank" 
                    className="bg-white/5 hover:bg-white/10 text-white font-black py-3 px-6 rounded-xl border border-white/10 transition-all uppercase text-[10px] tracking-widest flex items-center gap-3"
                >
                    Directory View
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">
                    <ActorProfileEditor actorName={user.name} />
                    <MonologueGenerator />
                </div>

                <div className="space-y-12">
                    <PlayFinder />
                    
                    <div className="bg-gradient-to-br from-red-600/10 to-transparent p-8 rounded-3xl border border-white/5 space-y-4 shadow-xl">
                        <h3 className="text-lg font-black uppercase tracking-tighter text-white">Crate Talent Network</h3>
                        <p className="text-sm text-gray-400 leading-relaxed font-medium">Your profile is automatically made available to verified talent agents in our new <span className="text-green-500 font-bold">Industry Terminal</span>. Keep your headshots and bio updated to increase your Discovery Score.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActorPortalView;