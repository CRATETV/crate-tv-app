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
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDownloadLedger = () => {
        if (!analyticsData) return;
        const csvRows = [
            ["Crate TV Financial Audit - Festival Entity"],
            ["Generated Date", new Date().toLocaleString()],
            [""],
            ["Metric", "Value"],
            ["Gross Festival Yield", formatCurrency(analyticsData.totalFestivalRevenue)],
            ["Partner Share (70%)", formatCurrency(analyticsData.totalFestivalRevenue * 0.70)],
            ["Platform Overhead (30%)", formatCurrency(analyticsData.totalFestivalRevenue * 0.30)],
            ["Total All-Access Passes", analyticsData.festivalPassSales.units],
            ["Total Block Tickets", analyticsData.festivalBlockSales.units],
            [""]
        ];

        // FIX: Cast stats to correct type to resolve "Property 'revenue' does not exist on type 'unknown'" on line 80
        Object.entries(analyticsData.salesByBlock).forEach(([title, stats]) => {
            const s = stats as { units: number; revenue: number };
            csvRows.push([`Block: ${title}`, formatCurrency(s.revenue)]);
        });

        const csvString = csvRows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `FESTIVAL_LEDGER_${Date.now()}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <div className="p-8 text-red-500 font-black uppercase tracking-widest">{error}</div>;

    return (
        <div className="space-y-12">
            {!isFestivalView && (
                <div className="flex gap-4">
                    <button onClick={() => setActiveTab('overview')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'overview' ? 'bg-red-600 text-white shadow-xl' : 'bg-white/5 text-gray-500'}`}>Platform Overview</button>
                    <button onClick={() => setActiveTab('festival')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'festival' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-white/5 text-gray-500'}`}>Festival Ledger</button>
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
                    {/* PARTNER TRANSPARENCY BLOCK */}
                    <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12">
                             <h2 className="text-[10rem] font-black italic text-indigo-500">LEDGER</h2>
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-12">
                                <div>
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Festival Financial Ledger</h2>
                                    <p className="text-xs text-gray-600 font-bold uppercase tracking-widest mt-1">Authorized Partner Review Session</p>
                                </div>
                                <button 
                                    onClick={handleDownloadLedger}
                                    className="bg-white/5 hover:bg-white text-gray-400 hover:text-black font-black px-6 py-3 rounded-xl border border-white/10 transition-all uppercase text-[10px] tracking-widest"
                                >
                                    Download Financial Audit (.csv)
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                <StatCard title="Gross Festival Yield" value={formatCurrency(analyticsData.totalFestivalRevenue)} className="bg-indigo-600/5 border-indigo-500/20" />
                                <StatCard title="Partner Share (70%)" value={formatCurrency(analyticsData.totalFestivalRevenue * 0.70)} className="text-green-500 border-green-500/20" />
                                <StatCard title="Crate Platform Fee" value={formatCurrency(analyticsData.totalFestivalRevenue * 0.30)} className="text-red-500 border-red-500/20" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.4em]">Sales Performance by Block</h3>
                                    <div className="space-y-3">
                                        {Object.entries(analyticsData.salesByBlock).map(([title, stats]) => {
                                            // FIX: Cast stats to correct type to resolve "Property 'units/revenue' does not exist on type 'unknown'" on lines 151 and 153
                                            const s = stats as { units: number; revenue: number };
                                            return (
                                                <div key={title} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                                                    <div>
                                                        <p className="text-sm font-bold text-white uppercase">{title}</p>
                                                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{s.units} Tickets Sold</p>
                                                    </div>
                                                    <p className="text-lg font-black text-white italic">{formatCurrency(s.revenue)}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.4em]">Pass Distribution</h3>
                                    <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-8">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-600 uppercase mb-2">All-Access Activations</p>
                                            <p className="text-5xl font-black text-indigo-500">{analyticsData.festivalPassSales.units}</p>
                                        </div>
                                        <div className="pt-6 border-t border-white/5">
                                            <p className="text-xs text-gray-400 font-medium leading-relaxed">
                                                All financial dispatches are processed via the linked Square card in the config tab. Dispatches occur on a 14-day rolling window post-event.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-8">
                         <button onClick={() => setShowOnboarding(true)} className="bg-white text-black font-black px-12 py-5 rounded-2xl uppercase tracking-widest text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all">Link Payout Card</button>
                    </div>
                </div>
            )}
            
            {showOnboarding && <FinancialOnboardingModal onClose={() => setShowOnboarding(false)} onSuccess={() => { setShowOnboarding(false); fetchData(); }} />}
        </div>
    );
};

export default AnalyticsPage;