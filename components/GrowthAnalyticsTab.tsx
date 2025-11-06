import React, { useState, useEffect } from 'react';
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

    const { keyMetrics, historical, projections } = analytics;

    return (
        <div className="space-y-12">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-white">Growth Dashboard & AI Advisor</h2>
                <p className="text-gray-400 mt-2">Track historical performance, view future projections, and get AI-powered insights to grow Crate TV.</p>
            </div>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Registered Users" value={formatNumber(keyMetrics.totalUsers)} />
                <StatCard title="Projected Users (End of Year)" value={formatNumber(Math.round(keyMetrics.projectedUsersYtd))} />
                <StatCard title="Total Revenue to Date" value={formatCurrency(keyMetrics.totalRevenue)} />
                <StatCard title="Projected Revenue (12-Mo)" value={formatCurrency(keyMetrics.projectedRevenueYtd)} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            <div className="bg-gradient-to-br from-purple-900/30 via-gray-900 to-gray-900 p-8 rounded-lg border border-purple-800">
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
                           {aiAdvice.userGrowth.length > 0 && <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
                                <h4 className="font-bold text-lg text-white mb-2">User Growth</h4>
                                <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm">{aiAdvice.userGrowth.map((item, i) => <li key={i}>{item}</li>)}</ul>
                            </div>}
                           {aiAdvice.revenueGrowth.length > 0 && <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
                                <h4 className="font-bold text-lg text-white mb-2">Revenue Growth</h4>
                                <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm">{aiAdvice.revenueGrowth.map((item, i) => <li key={i}>{item}</li>)}</ul>
                            </div>}
                            {aiAdvice.communityEngagement.length > 0 && <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
                                <h4 className="font-bold text-lg text-white mb-2">Community Engagement</h4>
                                <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm">{aiAdvice.communityEngagement.map((item, i) => <li key={i}>{item}</li>)}</ul>
                            </div>}
                        </div>
                    </div>
                )}
            </div>
            
        </div>
    );
};

export default GrowthAnalyticsTab;