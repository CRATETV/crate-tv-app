import React, { useState, useEffect, useMemo } from 'react';
import { AnalyticsData, Movie, AdminPayout, FilmmakerPayout } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';
import FinancialOnboardingModal from './FinancialOnboardingModal';
import { getDbInstance } from '../services/firebaseClient';

const formatCurrency = (amountInCents: number) => `$${((amountInCents || 0) / 100).toFixed(2)}`;
const formatNumber = (num: number) => num.toLocaleString();

const StatCard: React.FC<{ title: string; value: string | number; className?: string }> = ({ title, value, className = '' }) => (
    <div className={`bg-gray-800/50 border border-gray-700 p-6 rounded-2xl text-center ${className}`}>
        <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest">{title}</h3>
        <p className="text-3xl font-black text-white mt-2 italic tracking-tighter uppercase">{value}</p>
    </div>
);

interface AnalyticsPageProps {
    viewMode: 'full' | 'festival';
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ viewMode }) => {
    const isFestivalView = viewMode === 'festival';
    const [activeTab, setActiveTab] = useState(isFestivalView ? 'festival' : 'overview');
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        const password = sessionStorage.getItem('adminPassword');
        if (!password) {
            setError('Authentication error.');
            setIsLoading(false);
            return;
        }

        try {
            const [analyticsRes, liveDataRes] = await Promise.all([
                fetch('/api/get-sales-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                }),
                fetchAndCacheLiveData({ force: true })
            ]);
            
            const analyticsJson: { analyticsData: AnalyticsData, errors: any } = await analyticsRes.json();
            if (analyticsJson.errors?.critical) throw new Error(analyticsJson.errors.critical);
            
            setAnalyticsData(analyticsJson.analyticsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (isLoading) return <LoadingSpinner />;
    if (error) return <div className="p-8 text-red-500 font-black uppercase tracking-widest">{error}</div>;

    return (
        <div className="space-y-12">
            {!isFestivalView && (
                <div className="flex gap-4">
                    <button onClick={() => setActiveTab('overview')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'overview' ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500'}`}>Platform Overview</button>
                    <button onClick={() => setActiveTab('festival')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'festival' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-500'}`}>Financial Ledgers</button>
                </div>
            )}

            {analyticsData && activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-[fadeIn_0.5s_ease-out]">
                    <StatCard title="Grand Yield" value={formatCurrency(analyticsData.totalRevenue)} />
                    <StatCard title="Global reach" value={(Object.values(analyticsData.viewCounts) as number[]).reduce((a, b) => a + (b || 0), 0)} />
                    <StatCard title="Node velocity" value={analyticsData.liveNodes} />
                    <StatCard title="Total users" value={analyticsData.totalUsers} />
                </div>
            )}

            {analyticsData && activeTab === 'festival' && (
                <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
                    {/* PWFF FESTIVAL LEDGER */}
                    <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12">
                             <h2 className="text-[10rem] font-black italic">PWFF</h2>
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-8">Playhouse West Festival Ledger</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard title="Gross PWFF Yield" value={formatCurrency(analyticsData.totalFestivalRevenue)} />
                                <StatCard title="Partner Share (70%)" value={formatCurrency(analyticsData.totalFestivalRevenue * 0.70)} className="text-green-500" />
                                <StatCard title="Crate Platform Fee" value={formatCurrency(analyticsData.totalFestivalRevenue * 0.30)} className="text-red-500" />
                            </div>
                        </div>
                    </div>

                    {/* CRATE FEST LEDGER */}
                    <div className="bg-[#0f0f0f] border border-red-600/20 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12">
                             <h2 className="text-[10rem] font-black italic text-red-600">CRATE</h2>
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-3xl font-black text-red-500 uppercase tracking-tighter italic mb-8">Crate Fest 2026 Ledger</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <StatCard title="Gross Crate Fest Yield" value={formatCurrency(analyticsData.totalCrateFestRevenue)} />
                                <StatCard title="Total Passes Sold" value={analyticsData.crateFestPassSales.units} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-8">
                         <button onClick={() => setShowOnboarding(true)} className="bg-white text-black font-black px-12 py-5 rounded-2xl uppercase tracking-widest text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all">Configure Payout Handshake</button>
                    </div>
                </div>
            )}
            
            {showOnboarding && <FinancialOnboardingModal onClose={() => setShowOnboarding(false)} onSuccess={() => { setShowOnboarding(false); fetchData(); }} />}
        </div>
    );
};

export default AnalyticsPage;