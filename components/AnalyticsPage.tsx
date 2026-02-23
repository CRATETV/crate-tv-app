import React, { useState, useEffect, useMemo } from 'react';
import { AnalyticsData, Movie, FilmmakerPayout } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

const formatCurrency = (amountInCents: number) => `$${((amountInCents || 0) / 100).toFixed(2)}`;

const StatCard: React.FC<{ title: string; value: string | number; className?: string }> = ({ title, value, className = '' }) => (
    <div className={`bg-white/[0.03] border border-white/5 p-8 rounded-[2rem] text-center hover:bg-white/[0.05] transition-all shadow-xl ${className}`}>
        <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] mb-2">{title}</h3>
        <p className="text-3xl font-black text-white italic tracking-tighter uppercase">{value}</p>
    </div>
);

interface AnalyticsPageProps {
    viewMode: 'full' | 'festival';
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ viewMode }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'audience' | 'financials' | 'roku'>('overview');
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        const password = sessionStorage.getItem('adminPassword');
        if (!password) {
            setError('Authentication session expired.');
            setIsLoading(false);
            return;
        }

        try {
            const analyticsRes = await fetch('/api/get-sales-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            
            const analyticsJson = await analyticsRes.json();
            if (analyticsJson.errors?.critical) throw new Error(analyticsJson.errors.critical);
            setAnalyticsData(analyticsJson.analyticsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (isLoading) return <LoadingSpinner />;
    if (error) return <div className="p-8 text-red-500 font-black uppercase tracking-widest">{error}</div>;
    if (!analyticsData) return null;

    return (
        <div className="space-y-12 pb-24 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex gap-4 p-1.5 bg-black border border-white/5 rounded-2xl w-max overflow-x-auto scrollbar-hide">
                <button onClick={() => setActiveTab('overview')} className={`px-10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'overview' ? 'bg-red-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Platform Overview</button>
                <button onClick={() => setActiveTab('audience')} className={`px-10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'audience' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Audience Intel</button>
                <button onClick={() => setActiveTab('financials')} className={`px-10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'financials' ? 'bg-amber-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>General Ledger</button>
                <button onClick={() => setActiveTab('roku')} className={`px-10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'roku' ? 'bg-purple-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Roku Intelligence</button>
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard title="Gross Platform Yield" value={formatCurrency(analyticsData.totalRevenue)} />
                    <StatCard title="Total Account Nodes" value={analyticsData.totalUsers} />
                    <StatCard title="Live Stream Density" value={analyticsData.liveNodes} />
                    <StatCard title="Total Film views" value={(Object.values(analyticsData.viewCounts) as number[]).reduce((a, b) => a + b, 0)} />
                </div>
            )}

            {activeTab === 'audience' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 italic">Personnel Breakdown</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                <span className="text-sm font-bold text-gray-400">Total Registered Nodes</span>
                                <span className="text-xl font-black text-white">{analyticsData.totalUsers}</span>
                            </div>
                             <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                <span className="text-sm font-bold text-gray-400">Verified Filmmakers</span>
                                <span className="text-xl font-black text-red-500">{analyticsData.filmmakerUsers.length}</span>
                            </div>
                             <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                <span className="text-sm font-bold text-gray-400">Verified Talent</span>
                                <span className="text-xl font-black text-purple-500">{analyticsData.actorUsers.length}</span>
                            </div>
                        </div>
                     </div>
                     <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl flex items-center justify-center text-center">
                         <div className="space-y-4 opacity-30">
                            <p className="text-sm font-black uppercase tracking-[0.5em]">Behavioral heatmap coming soon</p>
                            <div className="w-16 h-16 border-4 border-dashed border-gray-700 rounded-full mx-auto animate-spin"></div>
                         </div>
                     </div>
                </div>
            )}

            {activeTab === 'financials' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard title="Direct Donations" value={formatCurrency(analyticsData.totalDonations)} className="bg-emerald-600/5 border-emerald-500/20" />
                        <StatCard title="VOD / Ticket Sales" value={formatCurrency(analyticsData.totalSales)} className="bg-blue-600/5 border-blue-500/20" />
                        <StatCard title="Platform Earnings" value={formatCurrency(analyticsData.totalCrateTvRevenue)} className="bg-red-600/5 border-red-500/20" />
                    </div>
                </div>
            )}

            {activeTab === 'roku' && (
                <div className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <StatCard title="Linked Roku Devices" value={analyticsData.rokuEngagement?.totalDevices || 0} className="bg-purple-600/5 border-purple-500/20" />
                        <StatCard title="Total Roku Stream Views" value={analyticsData.rokuEngagement?.totalRokuViews || 0} className="bg-purple-600/5 border-purple-500/20" />
                    </div>

                    <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 italic">Roku Engagement by Film</h3>
                        <div className="space-y-4">
                            {analyticsData.rokuEngagement?.viewsByMovie && Object.entries(analyticsData.rokuEngagement.viewsByMovie).length > 0 ? (
                                Object.entries(analyticsData.rokuEngagement.viewsByMovie)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([key, count]) => (
                                        <div key={key} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <span className="text-sm font-bold text-gray-400">{key}</span>
                                            <span className="text-xl font-black text-purple-500">{count} Views</span>
                                        </div>
                                    ))
                            ) : (
                                <p className="text-gray-500 text-center py-10 font-medium italic">No Roku engagement data recorded yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPage;