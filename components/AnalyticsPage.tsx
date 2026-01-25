
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
    const isFestivalView = viewMode === 'festival';
    const [activeTab, setActiveTab] = useState<'overview' | 'film_festival' | 'crate_fest'>(isFestivalView ? 'film_festival' : 'overview');
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payoutStatus, setPayoutStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

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

    const handleWithdraw = async (amount: number) => {
        if (!analyticsData) return;
        
        if (amount <= 100) {
            alert("No significant net entitlement available for disbursement at this time.");
            return;
        }

        if (!window.confirm(`AUTHORIZE DISPATCH: Confirm transfer of ${formatCurrency(amount)} to your linked card? This strictly represents your 70% share.`)) return;

        setPayoutStatus('processing');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/process-festival-payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (res.ok) {
                setPayoutStatus('success');
                fetchData();
            } else {
                throw new Error('Disbursement rejected by core.');
            }
        } catch (e) {
            setPayoutStatus('error');
            alert("Disbursement handshake failed.");
        }
    };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <div className="p-8 text-red-500 font-black uppercase tracking-widest">{error}</div>;
    if (!analyticsData) return null;

    // Entitlement Logic
    const filmFestivalNetEntitlement = (Number(analyticsData.totalFestivalRevenue || 0) * 0.70) - (analyticsData.totalAdminPayouts || 0);
    const crateFestNetEntitlement = (Number(analyticsData.totalCrateFestRevenue || 0) * 0.70); // Current logic might only payout from main fund, showing net potential here

    return (
        <div className="space-y-12 pb-24">
            {!isFestivalView && (
                <div className="flex gap-4 p-1.5 bg-black border border-white/5 rounded-2xl w-max">
                    <button onClick={() => setActiveTab('overview')} className={`px-10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'overview' ? 'bg-red-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Platform Overview</button>
                    <button onClick={() => setActiveTab('film_festival')} className={`px-10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'film_festival' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Film Festival Ledger</button>
                    <button onClick={() => setActiveTab('crate_fest')} className={`px-10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'crate_fest' ? 'bg-amber-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Crate Fest Ledger</button>
                </div>
            )}

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-[fadeIn_0.5s_ease-out]">
                    <StatCard title="Gross Platform Yield" value={formatCurrency(analyticsData.totalRevenue)} />
                    <StatCard title="Total Account Nodes" value={analyticsData.totalUsers} />
                    <StatCard title="Live Stream Density" value={analyticsData.liveNodes} />
                    <StatCard title="Total Film views" value={(Object.values(analyticsData.viewCounts) as number[]).reduce((a, b) => a + b, 0)} />
                </div>
            )}

            {(activeTab === 'film_festival' || activeTab === 'crate_fest') && (
                <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
                    <div className={`bg-[#0f0f0f] border border-white/5 p-10 md:p-14 rounded-[4rem] shadow-2xl relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 p-14 opacity-[0.03] pointer-events-none rotate-12 scale-150">
                             <h2 className={`text-[15rem] font-black italic ${activeTab === 'film_festival' ? 'text-indigo-500' : 'text-amber-500'}`}>LEDGER</h2>
                        </div>
                        <div className="relative z-10 space-y-16">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${activeTab === 'film_festival' ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
                                        <p className={`font-black uppercase tracking-[0.6em] text-[10px] ${activeTab === 'film_festival' ? 'text-indigo-500' : 'text-amber-500'}`}>
                                            {activeTab === 'film_festival' ? 'Annual Film Festival Sector' : 'Crate Fest Session Sector'}
                                        </p>
                                    </div>
                                    <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter italic leading-none">
                                        {activeTab === 'film_festival' ? 'Film Festival.' : 'Crate Fest.'}
                                    </h2>
                                    <p className="text-gray-500 text-sm font-bold uppercase tracking-[0.3em] mt-4">Verified Financial Manifest // 70/30 Split</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <StatCard 
                                    title="Gross Generated" 
                                    value={formatCurrency(activeTab === 'film_festival' ? analyticsData.totalFestivalRevenue : analyticsData.totalCrateFestRevenue)} 
                                    className={`${activeTab === 'film_festival' ? 'bg-indigo-600/5 border-indigo-500/20' : 'bg-amber-600/5 border-amber-500/20'}`} 
                                />
                                <StatCard 
                                    title="Platform Overhead (30%)" 
                                    value={formatCurrency((activeTab === 'film_festival' ? analyticsData.totalFestivalRevenue : analyticsData.totalCrateFestRevenue) * 0.30)} 
                                    className="bg-red-600/5 border-red-500/20 !text-red-500" 
                                />
                                <StatCard 
                                    title="Partner Net Share (70%)" 
                                    value={formatCurrency((activeTab === 'film_festival' ? analyticsData.totalFestivalRevenue : analyticsData.totalCrateFestRevenue) * 0.70)} 
                                    className="bg-green-600/5 border-green-500/20 !text-green-500" 
                                />
                            </div>

                            <div className="bg-black/60 p-10 md:p-16 rounded-[4rem] border border-white/10 flex flex-col items-center text-center space-y-10 shadow-inner">
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[1em]">Authorized for Withdrawal</p>
                                    <p className="text-7xl md:text-[8rem] font-black text-white italic tracking-tighter leading-none">
                                        {formatCurrency(activeTab === 'film_festival' ? filmFestivalNetEntitlement : crateFestNetEntitlement)}
                                    </p>
                                    {activeTab === 'film_festival' && (
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest max-w-sm mx-auto pt-4 leading-relaxed">
                                            Includes ${formatCurrency(analyticsData.totalAdminPayouts)} already dispatched from this node.
                                        </p>
                                    )}
                                </div>
                                
                                {activeTab === 'film_festival' && (
                                    <button
                                        onClick={() => handleWithdraw(filmFestivalNetEntitlement)}
                                        disabled={payoutStatus === 'processing' || filmFestivalNetEntitlement <= 100}
                                        className="bg-white text-black font-black px-20 py-8 rounded-3xl text-2xl uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-[0_30px_60px_rgba(255,255,255,0.1)] disabled:opacity-20"
                                    >
                                        {payoutStatus === 'processing' ? 'Authorizing Dispatch...' : 'Disburse Net Funds'}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-8">
                                <h3 className={`text-sm font-black text-gray-500 uppercase tracking-[0.4em] border-l-4 pl-6 ${activeTab === 'film_festival' ? 'border-indigo-600' : 'border-amber-600'}`}>
                                    Detailed Resource Yield
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {activeTab === 'film_festival' ? (
                                        <>
                                            <div className="p-8 bg-white/[0.02] rounded-3xl border border-white/5 space-y-4">
                                                <p className="text-[9px] font-black text-indigo-500 uppercase">All-Access Passes</p>
                                                <p className="text-3xl font-black text-white">{analyticsData.festivalPassSales.units}</p>
                                                <p className="text-xs text-gray-600 font-bold">{formatCurrency(analyticsData.festivalPassSales.revenue)} Gross</p>
                                            </div>
                                            <div className="p-8 bg-white/[0.02] rounded-3xl border border-white/5 space-y-4">
                                                <p className="text-[9px] font-black text-indigo-500 uppercase">Individual Block Tickets</p>
                                                <p className="text-3xl font-black text-white">{analyticsData.festivalBlockSales.units}</p>
                                                <p className="text-xs text-gray-600 font-bold">{formatCurrency(analyticsData.festivalBlockSales.revenue)} Gross</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="p-8 bg-white/[0.02] rounded-3xl border border-white/5 space-y-4">
                                                <p className="text-[9px] font-black text-amber-500 uppercase">Session Passes</p>
                                                <p className="text-3xl font-black text-white">{analyticsData.crateFestPassSales.units}</p>
                                                <p className="text-xs text-gray-600 font-bold">{formatCurrency(analyticsData.crateFestPassSales.revenue)} Gross</p>
                                            </div>
                                            <div className="p-8 bg-white/[0.02] rounded-3xl border border-white/5 space-y-4">
                                                <p className="text-[9px] font-black text-amber-500 uppercase">Block Tickets</p>
                                                <p className="text-3xl font-black text-white">{analyticsData.crateFestBlockSales.units}</p>
                                                <p className="text-xs text-gray-600 font-bold">{formatCurrency(analyticsData.crateFestBlockSales.revenue)} Gross</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPage;
