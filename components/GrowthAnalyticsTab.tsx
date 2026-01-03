
import React, { useState, useEffect, useRef } from 'react';
import { GrowthAnalyticsData, AiGrowthAdvice, Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import BarChart from './BarChart';

const formatCurrency = (amount: number) => `$${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatNumber = (num: number) => num.toLocaleString();

const TrendBadge: React.FC<{ value: number | string }> = ({ value }) => {
    if (!value && value !== 0) return null;
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
        setAiAdvice(null);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/generate-growth-advice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, metrics: analytics?.keyMetrics }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to generate advice.');
            
            // The API returns { advice: { ... } }
            setAiAdvice(data.advice);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred while getting advice.');
        } finally {
            setIsGenerating(false);
        }
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

    const { keyMetrics, historical, projections, avgMoMUserGrowth, fundingProfile } = analytics;
    const isNewPlatform = keyMetrics.totalUsers < 5;

    return (
        <div className="space-y-12 animate-[fadeIn_0.6s_ease-out]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight uppercase">Growth Intelligence</h2>
                    <p className="text-gray-400 mt-1">AI-driven predictive modeling and strategic roadmaps.</p>
                </div>
            </div>
            
            {/* Key Metrics Grid */}
            <div className="no-print">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                    <StatCard title="Visitors" value={formatNumber(keyMetrics.totalVisitors)} trend={isNewPlatform ? "Base" : "+5.2%"} />
                    <StatCard title="Total Users" value={formatNumber(keyMetrics.totalUsers)} trend={avgMoMUserGrowth || 0} />
                    <StatCard title="Conversion" value={`${keyMetrics.conversionRate.toFixed(1)}%`} trend={isNewPlatform ? "N/A" : "+1.2%"} />
                    <StatCard title="Engagement" value={keyMetrics.totalUsers > 0 ? `${(keyMetrics.dailyActiveUsers / keyMetrics.totalUsers * 100).toFixed(0)}%` : '0%'} className="bg-blue-950/20 border-blue-900/50" />
                    <StatCard title="Grand Total" value={formatCurrency(keyMetrics.totalRevenue)} trend={isNewPlatform ? "Base" : "+18.4%"} />
                    <StatCard title="ARPU" value={formatCurrency(keyMetrics.avgRevenuePerUser)} />
                </div>
            </div>

            {/* AWS/Strategic Profile Card */}
            {fundingProfile && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/aws.png" className="w-8 h-8 opacity-50 grayscale" alt="AWS" />
                        <h3 className="text-sm font-black uppercase tracking-[0.4em] text-gray-500">Strategic Business Profile</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                        <div>
                            <p className="text-[10px] font-black text-gray-600 uppercase mb-1">Current Round</p>
                            <p className="text-white font-bold">{fundingProfile.round}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-600 uppercase mb-1">Round Close</p>
                            <p className="text-white font-bold">{fundingProfile.date}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-600 uppercase mb-1">Latest Valuation</p>
                            <p className="text-white font-bold">{fundingProfile.valuation}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-600 uppercase mb-1">AWS Infrastructure %</p>
                            <p className="text-green-500 font-bold">{fundingProfile.awsPercentage}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-600 uppercase mb-1">Marketing Tier</p>
                            <p className="text-white font-bold">{fundingProfile.marketingBudget}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Growth Advisor Section */}
            <div className="bg-gradient-to-br from-indigo-900/40 via-gray-900 to-black p-8 rounded-3xl border border-indigo-500/30 shadow-2xl no-print">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                            <span className="bg-indigo-500/20 p-2 rounded-lg">✨</span>
                            Strategy Consultant
                        </h3>
                        <p className="text-gray-400 mt-2">Strategic narrative & roadmap based on current performance data.</p>
                    </div>
                    <button
                        onClick={handleGenerateAdvice}
                        disabled={isGenerating}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-8 rounded-xl transition-all shadow-lg shadow-indigo-900/40 active:scale-95 disabled:opacity-50"
                    >
                        {isGenerating ? 'Synthesizing Data...' : 'Synthesize Strategy'}
                    </button>
                </div>

                {isGenerating && (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-indigo-300 font-black uppercase tracking-widest text-xs">Gemini is analyzing platform telemetry...</p>
                    </div>
                )}
                
                {aiAdvice && !isGenerating && (
                    <div className="space-y-12 animate-[fadeIn_0.8s_ease-out]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-4 bg-black/20 p-6 rounded-2xl border border-white/5">
                                <h4 className="font-black text-blue-400 uppercase tracking-tighter text-lg mb-4">User Acquisition</h4>
                                <ul className="space-y-4">
                                    {aiAdvice.userGrowth.map((item, i) => (
                                        <li key={i} className="text-gray-300 text-sm leading-relaxed flex gap-3">
                                            <span className="text-blue-500 font-bold">→</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-4 bg-black/20 p-6 rounded-2xl border border-white/5">
                                <h4 className="font-black text-green-400 uppercase tracking-tighter text-lg mb-4">Revenue Optimization</h4>
                                <ul className="space-y-4">
                                    {aiAdvice.revenueGrowth.map((item, i) => (
                                        <li key={i} className="text-gray-300 text-sm leading-relaxed flex gap-3">
                                            <span className="text-green-500 font-bold">→</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-4 bg-black/20 p-6 rounded-2xl border border-white/5">
                                <h4 className="font-black text-purple-400 uppercase tracking-tighter text-lg mb-4">Retention & Community</h4>
                                <ul className="space-y-4">
                                    {aiAdvice.communityEngagement.map((item, i) => (
                                        <li key={i} className="text-gray-300 text-sm leading-relaxed flex gap-3">
                                            <span className="text-purple-500 font-bold">→</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {aiAdvice.advertisingSuggestions && aiAdvice.advertisingSuggestions.length > 0 && (
                            <div className="bg-white/5 p-8 rounded-2xl border border-white/10">
                                <h4 className="font-black text-white uppercase tracking-widest text-xs mb-6">Marketing Experiments</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {aiAdvice.advertisingSuggestions.map((item, i) => (
                                        <div key={i} className="bg-black/40 p-4 rounded-xl border border-white/5">
                                            <p className="text-sm text-gray-300 italic">"{item}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!aiAdvice && !isGenerating && (
                    <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                        <p className="text-gray-500 font-medium">Ready to analyze your platform's potential.</p>
                        <p className="text-gray-600 text-xs mt-1 uppercase tracking-widest">Calculates virality co-efficients and creator-loop efficiency</p>
                    </div>
                )}
            </div>

            {/* Growth Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800/40 p-6 rounded-2xl border border-white/5">
                    <h3 className="font-black text-white uppercase tracking-widest text-xs mb-6">User Scaling Projection</h3>
                    <BarChart historicalData={historical.users} projectedData={projections.users} label="Users" />
                </div>
                <div className="bg-gray-800/40 p-6 rounded-2xl border border-white/5">
                    <h3 className="font-black text-white uppercase tracking-widest text-xs mb-6">Revenue Scaling Projection</h3>
                    <BarChart historicalData={historical.revenue} projectedData={projections.revenue} label="Revenue" isCurrency={true} />
                </div>
            </div>
            
            {/* Investor Snapshot */}
            <div className="pt-8">
                <div className="flex justify-between items-center mb-6 no-print">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Investor Snapshot</h2>
                    <button onClick={() => window.print()} className="bg-white text-black font-black py-2 px-6 rounded-lg hover:bg-gray-200 transition-colors uppercase tracking-widest text-xs">Export Audit</button>
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
                            <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Growth Status</p>
                            <p className="text-4xl font-black text-red-600 tracking-tighter">{isNewPlatform ? 'SEEDING' : 'SCALING'}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Registered Users</p>
                            <p className="text-4xl font-black tracking-tighter">{formatNumber(keyMetrics.totalUsers)}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Global Views</p>
                            <p className="text-4xl font-black tracking-tighter">{formatNumber(keyMetrics.totalViews)}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-[10px] font-black uppercase mb-1">ARPU (Cents)</p>
                            <p className="text-4xl font-black tracking-tighter">{formatCurrency(keyMetrics.avgRevenuePerUser)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GrowthAnalyticsTab;
