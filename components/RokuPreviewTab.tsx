
import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { RokuFeed } from '../types';

const RokuPreviewTab: React.FC = () => {
    const [feed, setFeed] = useState<RokuFeed | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadFeed = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/roku-feed?t=' + Date.now());
            if (!res.ok) throw new Error("Feed Node Offline");
            const data = await res.json();
            setFeed(data);
        } catch (err) {
            setError('Failed to established link with Feed API.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadFeed(); }, []);

    if (isLoading) return <div className="h-64 flex items-center justify-center"><LoadingSpinner /></div>;

    if (error) return (
        <div className="p-12 text-center bg-red-600/10 border border-red-500/20 rounded-[3rem]">
            <p className="text-red-500 font-black uppercase tracking-widest">{error}</p>
            <button onClick={loadFeed} className="mt-6 text-white font-black uppercase text-[10px] tracking-widest underline underline-offset-4">Retry Uplink</button>
        </div>
    );

    const totalMovies = feed?.categories?.reduce((s, c) => s + c.children.length, 0) || 0;
    const isHealthy = totalMovies > 0;

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] text-center shadow-xl">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Categorical Rows</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">{feed?.categories?.length || 0}</p>
                </div>
                <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] text-center shadow-xl">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Payload Weight</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">{totalMovies} Films</p>
                </div>
                <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] text-center shadow-xl">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Spotlight Nodes</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">{feed?.heroItems?.length || 0}</p>
                </div>
                <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] text-center shadow-xl">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Feed Status</p>
                    <p className={`text-4xl font-black italic tracking-tighter ${isHealthy ? 'text-green-500' : 'text-red-500'}`}>
                        {isHealthy ? 'HEALTHY' : 'CRITICAL'}
                    </p>
                </div>
            </div>

            <div className={`p-8 rounded-[2.5rem] border flex items-center justify-between gap-10 ${isHealthy ? 'bg-green-600/10 border-green-500/20' : 'bg-red-600/10 border-red-500/20'}`}>
                <div className="space-y-1">
                    <h3 className={`text-2xl font-black uppercase tracking-tighter italic ${isHealthy ? 'text-green-500' : 'text-red-500'}`}>
                        {isHealthy ? 'Manifest Integrity Verified ✓' : 'Empty Manifest Alert ⚠️'}
                    </h3>
                    <p className="text-gray-500 text-sm font-medium">
                        {isHealthy ? `Platform is broadcasting ${totalMovies} cinematic nodes correctly.` : 'Current configuration yields zero visible films. Emergency fallback will be triggered for end-users.'}
                    </p>
                </div>
                <button onClick={loadFeed} className="bg-white text-black font-black px-10 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Refresh Node</button>
            </div>

            <div className="space-y-6">
                <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-[0.4em] px-4">Categorical Depth Map</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {feed?.categories?.map((cat, i) => (
                        <div key={i} className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-between group hover:border-white/20 transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <h4 className="text-xl font-black text-white uppercase tracking-tight italic">{cat.title}</h4>
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{cat.children.length} Nodes</span>
                            </div>
                            <div className="flex -space-x-4 overflow-hidden py-2">
                                {cat.children.slice(0, 8).map((m, j) => (
                                    <div key={j} className="w-12 h-16 rounded-lg border-2 border-black overflow-hidden shadow-2xl flex-shrink-0 relative group/poster">
                                        <img src={m.poster} className="w-full h-full object-cover" alt="" />
                                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/poster:opacity-100 transition-opacity flex items-center justify-center p-1">
                                            <p className="text-[5px] font-black text-white uppercase text-center leading-none">{m.title}</p>
                                        </div>
                                    </div>
                                ))}
                                {cat.children.length > 8 && (
                                    <div className="w-12 h-16 rounded-lg border-2 border-black bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-500">+ {cat.children.length - 8}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RokuPreviewTab;
