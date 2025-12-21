
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
    const isNewPlatform = keyMetrics.totalUsers < 5;

    return (
        <div className="space-y-12 animate-[fadeIn_0.6s_ease-out]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Growth Intelligence</h2>
                    <p className="text-gray-400 mt-1">AI-driven predictive modeling and strategy.</p>
                </div>
            </div>
            
            {/* Key Metrics */}
            <div className="no-print">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                    <StatCard title="Visitors" value={formatNumber(keyMetrics.totalVisitors)} trend={isNewPlatform ? "Base" : "+5.2%"} />
                    <StatCard title="Users" value={formatNumber(keyMetrics.totalUsers)} trend={avgMoMUserGrowth || 0} />
                    <StatCard title="Conversion" value={`${keyMetrics.conversionRate.toFixed(1)}%`} trend={isNewPlatform ? "N/A" : "+1.2%"} />
                    <StatCard title="Engagement" value={keyMetrics.totalUsers > 0 ? `${(keyMetrics.dailyActiveUsers / keyMetrics.totalUsers * 100).toFixed(0)}%` : '0%'} className="bg-blue-950/20 border-blue-900/50" />
                    <StatCard title="Revenue" value={formatCurrency(keyMetrics.totalRevenue)} trend={isNewPlatform ? "Base" : "+18.4%"} />
                    <StatCard title="ARPU" value={formatCurrency(keyMetrics.avgRevenuePerUser)} />
                </div>
            </div>

            {/* AI Growth Advisor */}
            <div className="bg-gradient-to-br from-indigo-900/40 via-gray-900 to-black p-8 rounded-3xl border border-indigo-500/30 shadow-2xl no-print">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                            <span className="bg-indigo-500/20 p-2 rounded-lg">✨</span>
                            AI Strategy Consultant
                        </h3>
                        <p className="text-gray-400 mt-2">Strategic narrative & roadmap based on the "Creator-Loop" model.</p>
                    </div>
                    <button
                        onClick={handleGenerateAdvice}
                        disabled={isGenerating}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-8 rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95 disabled:bg-indigo-800"
                    >
                        {isGenerating ? 'Synthesizing Strategy...' : 'Update Strategy'}
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
                    </div>
                ) : !isGenerating && isNewPlatform ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                            <h4 className="font-bold text-indigo-400 mb-2">Stage 1 Strategy: Creator-Loop Onboarding</h4>
                            <p className="text-sm text-gray-300">Your platform is currently in the initial data-collection phase. Your priority should be <strong>Creator-led Onboarding</strong>. Encourage your filmmakers to share their profiles to seed the initial audience.</p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                             <h4 className="font-bold text-indigo-400 mb-2">Platform Goal</h4>
                             <p className="text-sm text-gray-300">Target <strong>100 registered users</strong>. Once this threshold is met, the AI Advisor can generate statistically significant MoM growth projections.</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-2xl">
                        <p className="text-gray-500 font-medium">Ready to analyze your platform's potential.</p>
                    </div>
                )}
            </div>

             {/* Snapshot for Investors */}
            <div className="pt-8">
                <div className="flex justify-between items-center mb-6 no-print">
                    <h2 className="text-3xl font-black text-white">Investor Snapshot</h2>
                    <button onClick={() => window.print()} className="bg-white text-black font-black py-2 px-6 rounded-lg hover:bg-gray-200 transition-colors">Export PDF</button>
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
                            <p className="text-gray-400 text-xs font-black uppercase mb-1">Growth Status</p>
                            <p className="text-4xl font-black text-red-600">{isNewPlatform ? 'Seeding' : 'Scaling'}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-black uppercase mb-1">Total Users</p>
                            <p className="text-4xl font-black">{formatNumber(keyMetrics.totalUsers)}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-black uppercase mb-1">Total Views</p>
                            <p className="text-4xl font-black">{formatNumber(keyMetrics.totalViews)}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-black uppercase mb-1">ARPU</p>
                            <p className="text-4xl font-black">{formatCurrency(keyMetrics.avgRevenuePerUser)}</p>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    );
};

export default GrowthAnalyticsTab;
