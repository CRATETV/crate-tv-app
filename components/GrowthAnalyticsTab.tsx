
import React, { useState, useEffect, useRef } from 'react';
import { GrowthAnalyticsData, AiGrowthAdvice, Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import BarChart from './BarChart';

const formatCurrency = (amount: number) => `$${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatNumber = (num: number) => num.toLocaleString();

const TrendBadge: React.FC<{ value: number | string }> = ({ value }) => {
    if (!value) return null;
    const isPositive = typeof value === 'number' ? value > 0 : value.startsWith('+');
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {isPositive ? '↑' : '↓'} {typeof value === 'number' ? `${Math.abs(value).toFixed(1)}%` : value}
        </span>
    );
};

const StatCard: React.FC<{ title: string; value: string | number; trend?: number | string; className?: string }> = ({ title, value, trend, className = '' }) => (
    <div className={`bg-gray-800/40 border border-gray-700/50 p-5 rounded-xl text-left transition-all hover:bg-gray-800/60 ${className}`}>
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
            {trend && <TrendBadge value={trend} />}
        </div>
        <p className="text-3xl font-black text-white">{value}</p>
    </div>
);

const GrowthAnalyticsTab: React.FC = () => {
    const [analytics, setAnalytics] = useState<GrowthAnalyticsData | null>(null);
    const [aiAdvice, setAiAdvice] = useState<(AiGrowthAdvice & { advertisingSuggestions?: string[] }) | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const snapshotRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError('');
            const password = sessionStorage.getItem('adminPassword');
            try {
                const response = await fetch('/api/get-growth-analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to load growth data.');
                setAnalytics(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleGenerateAdvice = async () => {
        setIsGenerating(true);
        setError('');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/generate-growth-advice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, metrics: analytics?.keyMetrics }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to generate advice.');
            setAiAdvice(data.advice);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred while getting advice.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrintSnapshot = () => {
        window.print();
    };


    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error && !analytics) {
        return <div className="text-red-400 text-center p-8">{error}</div>;
    }

    if (!analytics) {
        return <div className="text-gray-400 text-center p-8">No analytics data available.</div>;
    }

    const { keyMetrics, historical, projections, aboutData, avgMoMUserGrowth } = analytics;

    return (
        <div className="space-y-12 animate-[fadeIn_0.6s_ease-out]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Growth Dashboard</h2>
                    <p className="text-gray-400 mt-1">Intelligence & predictive modeling for Crate TV.</p>
                </div>
                <div className="bg-gray-800/80 px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Real-time Data Active</span>
                </div>
            </div>
            
            {/* Key Metrics */}
            <div className="no-print">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                    <StatCard title="Visitors" value={formatNumber(keyMetrics.totalVisitors)} trend="+5.2%" />
                    <StatCard title="Users" value={formatNumber(keyMetrics.totalUsers)} trend={avgMoMUserGrowth} />
                    <StatCard title="Conversion" value={`${keyMetrics.conversionRate.toFixed(1)}%`} trend="+1.2%" />
                    <StatCard title="DAU/WAU" value={`${(keyMetrics.dailyActiveUsers / keyMetrics.weeklyActiveUsers * 100).toFixed(0)}%`} className="bg-blue-950/20 border-blue-900/50" />
                    <StatCard title="Revenue" value={formatCurrency(keyMetrics.totalRevenue)} trend="+18.4%" />
                    <StatCard title="ARPU" value={formatCurrency(keyMetrics.avgRevenuePerUser)} />
                </div>
            </div>

             {/* Detailed Metrics */}
             <div className="no-print space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-700/50">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                             Audience Segments
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                                <span className="text-gray-400">Total Registered</span>
                                <span className="font-black text-white">{formatNumber(keyMetrics.audienceBreakdown.total)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                                <span className="text-gray-400">Actors</span>
                                <span className="font-black text-purple-400">{formatNumber(keyMetrics.audienceBreakdown.actors)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                                <span className="text-gray-400">Filmmakers</span>
                                <span className="font-black text-blue-400">{formatNumber(keyMetrics.audienceBreakdown.filmmakers)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-700/50">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             Earnings Context
                        </h3>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                                <span className="text-gray-400">Donations (Net)</span>
                                <span className="font-black text-green-400">{formatCurrency(keyMetrics.totalDonations * 0.7)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                                <span className="text-gray-400">Platform Fees (30%)</span>
                                <span className="font-black text-gray-300">{formatCurrency(keyMetrics.totalDonations * 0.3)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                                <span className="text-gray-400">VOD & Festival Sales</span>
                                <span className="font-black text-white">{formatCurrency(keyMetrics.totalSales)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Top Viewership Markets</h3>
                        <div className="bg-gray-800/20 p-2 rounded-2xl border border-gray-700/30">
                             <ul className="space-y-1">
                                {keyMetrics.topCountries.map((item, i) => (
                                    <li key={item.country} className={`flex justify-between items-center p-3 rounded-xl transition-colors ${i === 0 ? 'bg-purple-900/10' : 'hover:bg-white/5'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-600 w-4">{i + 1}</span>
                                            <span className="font-bold text-gray-200">{item.country}</span>
                                        </div>
                                        <span className="font-mono text-sm text-gray-400">{formatNumber(item.views)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                     <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Highest Yielding Titles</h3>
                         <div className="bg-gray-800/20 p-2 rounded-2xl border border-gray-700/30">
                             <ul className="space-y-1">
                                {keyMetrics.topEarningFilms.map((item, i) => (
                                    <li key={item.title} className={`flex justify-between items-center p-3 rounded-xl transition-colors ${i === 0 ? 'bg-green-900/10' : 'hover:bg-white/5'}`}>
                                        <span className="font-bold text-gray-200 truncate pr-4">{item.title}</span>
                                        <span className="font-black text-green-400 whitespace-nowrap">{formatCurrency(item.totalRevenue)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>


            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print">
                <div className="bg-gray-800/30 p-8 rounded-3xl border border-gray-700/50">
                    <h3 className="text-xl font-black text-white mb-6">User Acquisition</h3>
                    <BarChart
                        historicalData={historical.users}
                        projectedData={projections.users}
                        label="New Users"
                    />
                </div>
                <div className="bg-gray-800/30 p-8 rounded-3xl border border-gray-700/50">
                    <h3 className="text-xl font-black text-white mb-6">Revenue Forecasting</h3>
                    <BarChart
                        historicalData={historical.revenue}
                        projectedData={projections.revenue}
                        label="Revenue"
                        isCurrency={true}
                    />
                </div>
            </div>

            {/* AI Growth Advisor */}
            <div className="bg-gradient-to-br from-indigo-900/40 via-gray-900 to-black p-8 rounded-3xl border border-indigo-500/30 shadow-2xl no-print">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                            <span className="bg-indigo-500/20 p-2 rounded-lg">✨</span>
                            AI Growth Advisor
                        </h3>
                        <p className="text-gray-400 mt-2">Strategic narrative & roadmap based on the "Creator-Loop" model.</p>
                    </div>
                    <button
                        onClick={handleGenerateAdvice}
                        disabled={isGenerating}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-8 rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95 disabled:bg-indigo-800"
                    >
                        {isGenerating ? 'Synthesizing Strategy...' : 'Update Growth Strategy'}
                    </button>
                </div>

                {isGenerating && <div className="py-12"><LoadingSpinner /></div>}
                
                {aiAdvice ? (
                    <div className="space-y-12 animate-[fadeIn_0.8s_ease-out]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <div className="h-1 w-full bg-blue-500/50 rounded-full mb-6"></div>
                                <h4 className="font-black text-white uppercase tracking-tighter text-lg">Scale Users</h4>
                                <ul className="space-y-3">
                                    {aiAdvice.userGrowth.map((item, i) => (
                                        <li key={i} className="text-gray-300 text-sm leading-relaxed flex gap-3">
                                            <span className="text-blue-400 font-bold">•</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <div className="h-1 w-full bg-green-500/50 rounded-full mb-6"></div>
                                <h4 className="font-black text-white uppercase tracking-tighter text-lg">Optimize Revenue</h4>
                                <ul className="space-y-3">
                                    {aiAdvice.revenueGrowth.map((item, i) => (
                                        <li key={i} className="text-gray-300 text-sm leading-relaxed flex gap-3">
                                            <span className="text-green-400 font-bold">•</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <div className="h-1 w-full bg-purple-500/50 rounded-full mb-6"></div>
                                <h4 className="font-black text-white uppercase tracking-tighter text-lg">Retain Community</h4>
                                <ul className="space-y-3">
                                    {aiAdvice.communityEngagement.map((item, i) => (
                                        <li key={i} className="text-gray-300 text-sm leading-relaxed flex gap-3">
                                            <span className="text-purple-400 font-bold">•</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {aiAdvice.advertisingSuggestions && (
                            <div className="bg-black/40 border border-indigo-500/20 p-6 rounded-2xl">
                                <h4 className="font-black text-white uppercase tracking-tighter mb-4 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                                    Advertising Experiments
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {aiAdvice.advertisingSuggestions.map((suggestion, i) => (
                                        <div key={i} className="bg-white/5 p-4 rounded-xl text-sm text-indigo-100 border border-white/5">
                                            {suggestion}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : !isGenerating && (
                    <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-2xl">
                        <p className="text-gray-500 font-medium">Ready to analyze your platform's potential.</p>
                    </div>
                )}
            </div>

             {/* Snapshot for Investors */}
            <div className="pt-8">
                <div className="flex justify-between items-center mb-6 no-print">
                    <h2 className="text-3xl font-black text-white">Investor Relations</h2>
                    <button onClick={handlePrintSnapshot} className="bg-white text-black font-black py-2 px-6 rounded-lg hover:bg-gray-200 transition-colors">Export PDF</button>
                </div>
                <div ref={snapshotRef} className="printable-area bg-white text-black p-12 rounded-3xl shadow-2xl">
                     <div className="flex justify-between items-center mb-12">
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" className="w-48 h-auto invert" />
                        <div className="text-right">
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Performance Audit</h2>
                            <p className="text-gray-500 font-bold">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12 border-y border-gray-100 py-10">
                        <div>
                            <p className="text-gray-400 text-xs font-black uppercase mb-1">Growth Index</p>
                            <p className="text-4xl font-black text-red-600">{avgMoMUserGrowth > 10 ? 'A+' : avgMoMUserGrowth > 5 ? 'A' : 'B'}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-black uppercase mb-1">User Base</p>
                            <p className="text-4xl font-black">{formatNumber(keyMetrics.totalUsers)}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-black uppercase mb-1">Active Rate</p>
                            <p className="text-4xl font-black">{((keyMetrics.weeklyActiveUsers / keyMetrics.totalUsers) * 100).toFixed(0)}%</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-black uppercase mb-1">ARPU</p>
                            <p className="text-4xl font-black">{formatCurrency(keyMetrics.avgRevenuePerUser)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                        <div className="space-y-6">
                            <h4 className="text-lg font-black uppercase border-b-2 border-black pb-2">Platform Scalability</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="font-bold text-gray-600">Total Catalog (Films)</span>
                                    <span className="font-black">{formatNumber(keyMetrics.totalFilms)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-gray-600">Total Impressions (Views)</span>
                                    <span className="font-black">{formatNumber(keyMetrics.totalViews)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-gray-600">Primary Market</span>
                                    <span className="font-black">{keyMetrics.topCountries[0]?.country || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-lg font-black uppercase border-b-2 border-black pb-2">Operational Integrity</h4>
                            <ul className="list-disc list-inside space-y-2 text-gray-600 font-medium">
                                <li>Proprietary Automated Roku Packaging Engine</li>
                                <li>Direct Filmmaker Payout & Analytics Portal</li>
                                <li>Real-time Community Interaction via Watch Parties</li>
                                <li>AI-Enhanced Content Metadata & Growth Advising</li>
                                <li>Square-Integrated Secure Financial Infrastructure</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    );
};

export default GrowthAnalyticsTab;