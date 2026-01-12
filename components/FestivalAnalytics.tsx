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

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
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
                    <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Active Nodes</p>
                        <p className="text-xl font-bold text-white">{analytics.liveNodes} ONLINE</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allFestivalBlocks.map(block => {
                        const stats = analytics.salesByBlock[block.title] || { units: 0, revenue: 0 };
                        return (
                            <div key={block.id} className="bg-white/5 p-8 rounded-[2rem] border border-white/10 group hover:border-indigo-600/30 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                                </div>
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
                                
                                <div className="mt-6">
                                    <p className="text-[8px] text-gray-700 font-bold uppercase tracking-widest">Linked Assets: {block.movieKeys.length} FILMS</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10 text-center">
                 <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-2xl mx-auto italic">
                    "Festival analytics prioritize verified session handshakes. All revenue data is synchronized from Square production endpoints on a 60-second polling cycle."
                 </p>
            </div>
        </div>
    );
};

export default FestivalAnalytics;