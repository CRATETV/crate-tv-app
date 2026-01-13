
import React from 'react';
import { AnalyticsData, FestivalConfig, FestivalDay } from '../types';

interface FestivalAnalyticsProps {
    analytics: AnalyticsData | null;
    festivalData: FestivalDay[];
    config: FestivalConfig | null;
}

const formatCurrency = (val: number) => `$${(val / 100).toFixed(2)}`;

const FestivalAnalytics: React.FC<FestivalAnalyticsProps> = ({ analytics, festivalData, config }) => {
    if (!analytics || !config) return null;

    const allFestivalBlocks = festivalData.flatMap(day => day.blocks);

    const handleDownloadLedger = () => {
        const headers = ["Block Title", "Time", "Units Sold", "Revenue (USD)"];
        const rows = allFestivalBlocks.map(block => {
            const stats = analytics.salesByBlock[block.title] || { units: 0, revenue: 0 };
            return [
                `"${block.title.replace(/"/g, '""')}"`,
                block.time,
                stats.units,
                (stats.revenue / 100).toFixed(2)
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Festival_Intel_${config.title.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Festival Intel Hub</h2>
                <button 
                    onClick={handleDownloadLedger}
                    className="bg-white text-black font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                    Download Intel (.csv)
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Gross Festival Yield</p>
                    <p className="text-5xl font-black text-white italic tracking-tighter">{formatCurrency(analytics.totalFestivalRevenue)}</p>
                    <p className="text-[9px] text-indigo-500 font-bold uppercase mt-4">Window: {new Date(config.startDate).toLocaleDateString()} - {new Date(config.endDate).toLocaleDateString()}</p>
                </div>
                <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">All-Access Passes</p>
                    <p className="text-5xl font-black text-amber-500 italic tracking-tighter">{analytics.festivalPassSales.units}</p>
                    <p className="text-[9px] text-gray-700 font-bold uppercase mt-4">Verified Full Session Holders</p>
                </div>
                <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Block Tickets Sold</p>
                    <p className="text-5xl font-black text-green-500 italic tracking-tighter">{analytics.festivalBlockSales.units}</p>
                    <p className="text-[9px] text-gray-700 font-bold uppercase mt-4">Individual Session Access</p>
                </div>
            </div>

            <div className="bg-[#0f0f0f] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl">
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Block Engagement Manifest</h3>
                        <p className="text-xs text-gray-600 font-bold uppercase tracking-widest mt-1">Real-time individual session metrics</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allFestivalBlocks.map(block => {
                        const stats = analytics.salesByBlock[block.title] || { units: 0, revenue: 0 };
                        return (
                            <div key={block.id} className="bg-white/5 p-8 rounded-[2rem] border border-white/10 group hover:border-indigo-600/30 transition-all relative overflow-hidden">
                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">{block.time}</p>
                                <h4 className="text-2xl font-black text-white uppercase tracking-tight leading-[0.9] mb-8">{block.title}</h4>
                                
                                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
                                    <div>
                                        <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">Tickets</p>
                                        <p className="text-xl font-black text-white italic">{stats.units}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">Net Yield</p>
                                        <p className="text-xl font-black text-green-500 italic">{formatCurrency(stats.revenue)}</p>
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

export default FestivalAnalytics;
