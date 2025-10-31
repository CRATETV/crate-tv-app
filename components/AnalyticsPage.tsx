import React, { useState, useEffect } from 'react';
import { AnalyticsData, PayoutRequest } from '../types';
import LoadingSpinner from './LoadingSpinner';
import PayoutsTab from './PayoutsTab';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;

const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
);

const AnalyticsPage: React.FC = () => {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<{ critical?: string, square?: string, firebase?: string } | null>(null);
    const [activeTab, setActiveTab] = useState('overview');

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        const password = sessionStorage.getItem('adminPassword');
        if (!password) {
            setError({ critical: 'Admin password not found. Cannot fetch analytics.' });
            setIsLoading(false);
            return;
        }
        try {
            const res = await fetch('/api/get-sales-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            
            const data = await res.json();
            
            if (data.errors?.critical) throw new Error(data.errors.critical);
            
            setAnalytics(data.analyticsData);
            setPayoutRequests(data.payoutRequests || []);
            setError(data.errors);
        } catch (e) {
            setError({ critical: e instanceof Error ? e.message : 'Failed to load analytics.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCompletePayout = async (requestId: string) => {
        const password = sessionStorage.getItem('adminPassword');
        try {
            await fetch('/api/complete-payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, password }),
            });
            // Refetch data to show updated payout list
            fetchData();
        } catch (error) {
            console.error("Failed to complete payout:", error);
            alert("Failed to mark payout as complete. Please check the console.");
        }
    };
    
    const TabButton: React.FC<{ tabName: string; label: string }> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tabName ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
            {label}
        </button>
    );

    if (isLoading) return <LoadingSpinner />;
    
    return (
        <div className="bg-gray-900 min-h-screen text-gray-200 p-4 sm:p-8">
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Site Analytics</h1>
                <div className="flex flex-wrap gap-2">
                    <TabButton tabName="overview" label="Overview" />
                    <TabButton tabName="payouts" label="Payouts" />
                    <TabButton tabName="users" label="Users" />
                </div>
            </div>

            {error?.critical && <div className="bg-red-900/50 text-red-300 p-4 rounded-lg mb-6">{error.critical}</div>}
            
            {activeTab === 'overview' && (
                <>
                {error?.square && <div className="bg-yellow-900/50 text-yellow-300 p-4 rounded-lg mb-6">{error.square}</div>}
                {error?.firebase && <div className="bg-yellow-900/50 text-yellow-300 p-4 rounded-lg mb-6">{error.firebase}</div>}
                {analytics && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title="Total Revenue" value={formatCurrency(analytics.totalRevenue)} />
                            <StatCard title="Filmmaker Donations" value={formatCurrency(analytics.totalDonations)} />
                            <StatCard title="Other Sales" value={formatCurrency(analytics.totalSales)} />
                            <StatCard title="Total Users" value={analytics.totalUsers.toLocaleString()} />
                        </div>
                        {/* More analytics sections here */}
                    </div>
                )}
                </>
            )}

            {activeTab === 'payouts' && (
                <PayoutsTab payoutRequests={payoutRequests} onCompletePayout={handleCompletePayout} />
            )}
            
            {activeTab === 'users' && analytics && (
                <div>
                     <h2 className="text-2xl font-bold text-white mb-4">Recent Users ({analytics.recentUsers.length})</h2>
                     <div className="bg-gray-800/50 rounded-lg max-h-[600px] overflow-y-auto">
                        {analytics.recentUsers.map((user, index) => (
                            <div key={index} className="p-3 border-b border-gray-700">
                                <p className="text-white">{user.email}</p>
                                <p className="text-xs text-gray-400">Joined: {user.creationTime}</p>
                            </div>
                        ))}
                     </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPage;