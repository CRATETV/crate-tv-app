
import React from 'react';
import { AnalyticsData, CrateFestConfig } from '../types';

interface CrateFestAnalyticsProps {
    analytics: AnalyticsData | null;
    config: CrateFestConfig | null;
}

const formatCurrency = (val: number) => `$${(val / 100).toFixed(2)}`;

const CrateFestAnalytics: React.FC<CrateFestAnalyticsProps> = ({ analytics, config }) => {
    if (!analytics || !config) return null;

    const handleDownloadLedger = () => {
        const headers = ["Category Title", "Films Linked", "Units Sold", "Yield (USD)"];
        const rows = config.movieBlocks.map(block => {
            const stats = analytics.salesByBlock[block.title] || { units: 0, revenue: 0 };
            return [
                `"${block.title.replace(/"/g, '""')}"`,
                block.movieKeys.length,
                stats.units,
                (stats.revenue / 100).toFixed(2)
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `CrateFest_Intel_${config.title.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Crate Fest Intel Hub</h2>
                <button 
                    onClick={handleDownloadLedger}
                    className="bg-white text-black font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                    Download Intel (.csv)
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Crate Fest Gross</p>
                    <p className="text-5xl font-black text-white italic tracking-tighter">{formatCurrency(analytics.totalCrateFestRevenue)}</p>
                    <p className="text-[9px] text-red-500 font-bold uppercase mt-4">Session Active: {config.isActive ? 'YES' : 'NO'}</p>
                </div>
                <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Pass Holders</p>
                    <p className="text-5xl font-black text-indigo-500 italic tracking-tighter">{analytics.crateFestPassSales.units}</p>
                    <p className="text-[9px] text-gray-700 font-bold uppercase mt-4">All-Access Node Activations</p>
                </div>
                <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Avg Ticket Yield</p>
                    <p className="text-5xl font-black text-green-500 italic tracking-tighter">
                        {analytics.crateFestPassSales.units > 0 
                            ? formatCurrency(analytics.totalCrateFestRevenue / analytics.crateFestPassSales.units) 
                            : '$0.00'}
                    </p>
                    <p className="text-[9px] text-gray-700 font-bold uppercase mt-4">Per Verified Account</p>
                </div>
            </div>

            <div className="bg-[#0f0f0f] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-8">Block engagement manifest</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {config.movieBlocks.map(block => {
                        const stats = analytics.salesByBlock[block.title] || { units: 0, revenue: 0 };
                        return (
                            <div key={block.id} className="bg-white/5 p-6 rounded-3xl border border-white/10 group hover:border-red-600/30 transition-all">
                                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-2">{block.movieKeys.length} Films Linked</p>
                                <h4 className="text-xl font-black text-white uppercase tracking-tight leading-none mb-6">{block.title}</h4>
                                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                    <div>
                                        <p className="text-[8px] text-gray-600 font-bold uppercase">Units Sold</p>
                                        <p className="text-lg font-black text-white">{stats.units}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] text-gray-600 font-bold uppercase">Yield</p>
                                        <p className="text-lg font-black text-green-500">{formatCurrency(stats.revenue)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CrateFestAnalytics;
