import React, { useState, useEffect, useRef } from 'react';
import { GrowthAnalyticsData, AiGrowthAdvice, Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import BarChart from './BarChart';

const formatCurrency = (amount: number) => `$${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatNumber = (num: number) => num.toLocaleString();

const StatCard: React.FC<{ title: string; value: string | number; className?: string }> = ({ title, value, className = '' }) => (
    <div className={`bg-gray-800/50 border border-gray-700 p-4 rounded-lg text-center ${className}`}>
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
);

const GrowthAnalyticsTab: React.FC = () => {
    const [analytics, setAnalytics] = useState<GrowthAnalyticsData | null>(null);
    const [aiAdvice, setAiAdvice] = useState<AiGrowthAdvice | null>(null);
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

    const { keyMetrics, historical, projections, aboutData } = analytics;

    return (
        <div className="space-y-12">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-white">Growth Dashboard & AI Advisor</h2>
                <p className="text-gray-400 mt-2">Track historical performance, view future projections, and get AI-powered insights to grow Crate TV.</p>
                <p className="text-xs text-gray-500 mt-1">* Note: Registered user count is based on Firebase Authentication records and may differ from your internal email list.</p>
            </div>
            
            {/* Key Metrics */}
            <div className="no-print">
                <h3 className="text-xl font-bold text-white mb-4">Audience & Revenue Snapshot</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
                    <StatCard title="Total Visitors" value={formatNumber(keyMetrics.totalVisitors)} />
                    <StatCard title="Registered Users" value={formatNumber(keyMetrics.totalUsers)} />
                    <StatCard title="Daily Active (DAU)" value={formatNumber(keyMetrics.dailyActiveUsers)} className="bg-blue-900/30 border-blue-700" />
                    <StatCard title="Weekly Active (WAU)" value={formatNumber(keyMetrics.weeklyActiveUsers)} className="bg-blue-900/30 border-blue-700" />
                    <StatCard title="Conversion Rate" value={`${keyMetrics.conversionRate.toFixed(2)}%`} />
                    <StatCard title="Total Revenue" value={formatCurrency(keyMetrics.totalRevenue)} />
                </div>
            </div>

             {/* Detailed Metrics */}
             <div className="no-print space-y-8">
                 <div>
                    <h3 className="text-xl font-bold text-white mb-4">Audience Breakdown</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <StatCard title="Total Registered Users" value={formatNumber(keyMetrics.audienceBreakdown.total)} />
                        <StatCard title="Signed up as Actors" value={formatNumber(keyMetrics.audienceBreakdown.actors)} />
                        <StatCard title="Signed up as Filmmakers" value={formatNumber(keyMetrics.audienceBreakdown.filmmakers)} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">Top 5 Countries by Views</h3>
                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                             <ul className="space-y-2">
                                {keyMetrics.topCountries.map(item => (
                                    <li key={item.country} className="flex justify-between items-center text-sm p-2 bg-gray-700/50 rounded-md">
                                        <span className="font-semibold text-white">{item.country}</span>
                                        <span className="font-bold">{formatNumber(item.views)} views</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                     <div>
                        <h3 className="text-xl font-bold text-white mb-4">Top 5 Earning Films</h3>
                         <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                             <ul className="space-y-2">
                                {keyMetrics.topEarningFilms.map(item => (
                                    <li key={item.title} className="flex justify-between items-center text-sm p-2 bg-gray-700/50 rounded-md">
                                        <span className="font-semibold text-white truncate pr-4">{item.title}</span>
                                        <span className="font-bold text-green-400">{formatCurrency(item.totalRevenue)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-white mb-4">Engagement Metrics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <StatCard title="Total Film Views" value={formatNumber(keyMetrics.totalViews)} />
                        <StatCard title="Total Likes" value={formatNumber(keyMetrics.totalLikes)} />
                        <StatCard title="Total Watchlist Adds" value={formatNumber(keyMetrics.totalWatchlistAdds)} />
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-bold text-white mb-4">Monetization Metrics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <StatCard title="Total Donations" value={formatCurrency(keyMetrics.totalDonations)} />
                        <StatCard title="Total Sales (VOD/Festival)" value={formatCurrency(keyMetrics.totalSales)} />
                        <StatCard title="Avg. Revenue Per User (ARPU)" value={formatCurrency(keyMetrics.avgRevenuePerUser)} />
                    </div>
                </div>
            </div>


            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print">
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">User Growth Trajectory</h3>
                    <BarChart
                        historicalData={historical.users}
                        projectedData={projections.users}
                        label="New Users"
                    />
                </div>
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">Revenue Growth Trajectory</h3>
                    <BarChart
                        historicalData={historical.revenue}
                        projectedData={projections.revenue}
                        label="Revenue"
                        isCurrency={true}
                    />
                </div>
            </div>

            {/* AI Growth Advisor */}
            <div className="bg-gradient-to-br from-purple-900/30 via-gray-900 to-gray-900 p-8 rounded-lg border border-purple-800 no-print">
                <h3 className="text-2xl font-bold text-purple-300 mb-4">✨ AI Growth Advisor</h3>
                <p className="text-gray-400 mb-6">Get a custom growth strategy based on your current platform metrics.</p>
                <button
                    onClick={handleGenerateAdvice}
                    disabled={isGenerating}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-purple-800"
                >
                    {isGenerating ? 'Analyzing...' : 'Generate Growth Strategy'}
                </button>
                {isGenerating && <div className="mt-4"><LoadingSpinner /></div>}
                {aiAdvice && (
                    <div className="mt-8 space-y-6 animate-[fadeIn_0.5s_ease-out]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           {aiAdvice.userGrowth?.length > 0 && <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
                                <h4 className="font-bold text-lg text-white mb-2">User Growth</h4>
                                <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm">{aiAdvice.userGrowth.map((item, i) => <li key={i}>{item}</li>)}</ul>
                            </div>}
                           {aiAdvice.revenueGrowth?.length > 0 && <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
                                <h4 className="font-bold text-lg text-white mb-2">Revenue Growth</h4>
                                <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm">{aiAdvice.revenueGrowth.map((item, i) => <li key={i}>{item}</li>)}</ul>
                            </div>}
                            {aiAdvice.communityEngagement?.length > 0 && <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
                                <h4 className="font-bold text-lg text-white mb-2">Community Engagement</h4>
                                <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm">{aiAdvice.communityEngagement.map((item, i) => <li key={i}>{item}</li>)}</ul>
                            </div>}
                        </div>
                    </div>
                )}
            </div>

             {/* Snapshot for Investors */}
            <div className="pt-8">
                <div className="flex justify-between items-center mb-6 no-print">
                    <h2 className="text-3xl font-bold text-white">Snapshot for Investors</h2>
                    <button onClick={handlePrintSnapshot} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Print Snapshot</button>
                </div>
                <div ref={snapshotRef} className="printable-area bg-gray-900 p-8 rounded-lg border border-gray-700">
                     <div className="text-center mb-8">
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" className="w-48 h-auto mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-white">Crate TV: At a Glance</h2>
                        <p className="text-gray-400">Data as of {new Date().toLocaleDateString()}</p>
                    </div>

                    {aboutData && (
                        <div className="text-center mb-8">
                             <p className="text-xl text-red-300 italic">"{aboutData.missionStatement}"</p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                        <StatCard title="Registered Users" value={formatNumber(keyMetrics.totalUsers)} />
                        <StatCard title="Daily Active (DAU)" value={formatNumber(keyMetrics.dailyActiveUsers)} />
                        <StatCard title="Weekly Active (WAU)" value={formatNumber(keyMetrics.weeklyActiveUsers)} />
                        <StatCard title="Avg. MoM User Growth" value={`${analytics.avgMoMUserGrowth?.toFixed(2) || 0}%`} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-gray-800/50 p-6 rounded-lg">
                            <h4 className="text-xl font-bold text-white mb-3">Platform Highlights</h4>
                            <ul className="space-y-3 text-gray-300">
                                <li className="flex justify-between"><span>Total Films on Platform:</span> <span className="font-bold text-white">{formatNumber(keyMetrics.totalFilms)}</span></li>
                                <li className="flex justify-between"><span>Total Film Views:</span> <span className="font-bold text-white">{formatNumber(keyMetrics.totalViews)}</span></li>
                                <li className="flex justify-between"><span>Top Earning Film:</span> <span className="font-bold text-white text-right">{keyMetrics.topEarningFilms[0]?.title || 'N/A'}</span></li>
                                <li className="flex justify-between"><span>Top Country by Views:</span> <span className="font-bold text-white text-right">{keyMetrics.topCountries[0]?.country || 'N/A'}</span></li>
                            </ul>
                        </div>
                        <div className="bg-gray-800/50 p-6 rounded-lg">
                            <h4 className="text-xl font-bold text-white mb-3">Unique Features</h4>
                            <ul className="list-disc list-inside space-y-2 text-gray-300">
                                <li>AI-Powered Actor Bios & Creator Tools</li>
                                <li>Filmmaker Dashboards with Real-time Analytics & Payouts</li>
                                <li>Direct-to-Filmmaker Donation System</li>
                                <li>Automated Roku Channel Publishing</li>
                                <li>Live, Synchronized Watch Parties with Chat</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    );
};

export default GrowthAnalyticsTab;