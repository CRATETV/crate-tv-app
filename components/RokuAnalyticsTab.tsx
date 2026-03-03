import React, { useState, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { Upload, FileText, TrendingUp, Users, Play, Clock, AlertCircle, ChevronRight, Download } from 'lucide-react';
import Papa from 'papaparse';

interface RokuDataPoint {
    date: string;
    views: number;
    uniqueViewers: number;
    avgDuration: number;
    installs?: number;
    [key: string]: any;
}

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const RokuAnalyticsTab: React.FC = () => {
    const [data, setData] = useState<RokuDataPoint[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [feedHealth, setFeedHealth] = useState<any>(null);
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);

    const checkFeedHealth = async () => {
        setIsCheckingHealth(true);
        try {
            const res = await fetch('/api/roku-feed');
            const feed = await res.json();
            
            const issues: string[] = [];
            let totalMovies = 0;
            
            feed.categories.forEach((cat: any) => {
                totalMovies += cat.children.length;
                cat.children.forEach((movie: any) => {
                    if (!movie.hdPosterUrl) issues.push(`Missing poster: ${movie.title}`);
                    if (!movie.streamUrl) issues.push(`Missing stream: ${movie.title}`);
                    if (movie.description?.length < 50) issues.push(`Short description: ${movie.title}`);
                });
            });

            setFeedHealth({
                totalMovies,
                categoryCount: feed.categories.length,
                issueCount: issues.length,
                issues: issues.slice(0, 5),
                timestamp: new Date().toLocaleTimeString()
            });
        } catch (e) {
            setError("Failed to reach Roku Feed API.");
        } finally {
            setIsCheckingHealth(false);
        }
    };
    const handleFileUpload = (file: File) => {
        if (!file.name.endsWith('.csv')) {
            setError("Please upload a valid Roku CSV report.");
            return;
        }

        setFileName(file.name);
        setError(null);

        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results: Papa.ParseResult<any>) => {
                const parsedData = results.data as any[];
                
                // Try to normalize Roku's various CSV formats
                const normalized = parsedData.map(row => {
                    // Roku Direct Publisher often uses 'Date', 'Views', 'Unique Viewers'
                    // Roku SceneGraph might use 'date', 'video_views', etc.
                    return {
                        date: row.Date || row.date || row['Report Date'] || 'Unknown',
                        views: Number(row.Views || row.views || row['Video Views'] || row['Total Views'] || 0),
                        uniqueViewers: Number(row['Unique Viewers'] || row.unique_viewers || row['Total Unique Viewers'] || 0),
                        avgDuration: Number(row['Average View Duration'] || row.avg_duration || row['Average Watch Time'] || 0),
                        installs: Number(row.Installs || row.installs || row['Channel Installs'] || 0)
                    };
                }).filter(d => d.date !== 'Unknown');

                setData(normalized);
            },
            error: (err: Error) => {
                setError("Failed to parse CSV: " + err.message);
            }
        });
    };

    const stats = useMemo(() => {
        if (data.length === 0) return null;
        return {
            totalViews: data.reduce((sum, d) => sum + d.views, 0),
            totalUnique: data.reduce((sum, d) => sum + d.uniqueViewers, 0),
            avgDuration: data.reduce((sum, d) => sum + d.avgDuration, 0) / data.length,
            totalInstalls: data.reduce((sum, d) => sum + (d.installs || 0), 0)
        };
    }, [data]);

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            {/* Header Section */}
            <div className="bg-[#050505] border border-red-600/20 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-12 scale-150">
                    <h1 className="text-[18rem] font-black italic text-red-600">DATA</h1>
                </div>
                
                <div className="relative z-10 max-w-4xl space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_#ef4444]"></div>
                            <p className="text-red-500 font-black uppercase tracking-[0.5em] text-[11px]">Roku Ecosystem Intelligence</p>
                        </div>
                        <h2 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter italic leading-none">Roku Analytics.</h2>
                        <p className="text-2xl text-gray-500 font-medium leading-relaxed max-w-3xl">
                            Import your <span className="text-white">Direct Publisher</span> or <span className="text-white">SceneGraph</span> CSV reports to visualize channel performance outside of the web platform.
                        </p>
                    </div>

                    {!fileName ? (
                        <div 
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
                            }}
                            className={`border-2 border-dashed rounded-[2.5rem] p-16 transition-all flex flex-col items-center justify-center gap-6 group cursor-pointer ${isDragging ? 'border-red-600 bg-red-600/5' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.csv';
                                input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) handleFileUpload(file);
                                };
                                input.click();
                            }}
                        >
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Upload className="w-8 h-8 text-red-600" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-xl font-black text-white uppercase tracking-widest italic">Drop Roku CSV Report</p>
                                <p className="text-gray-500 text-sm">Download from Roku Developer Dashboard {'>'} Analytics</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-white font-black uppercase tracking-widest text-xs">{fileName}</p>
                                    <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">Report Synchronized</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setData([]); setFileName(null); }}
                                className="text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                                Replace Report
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-3 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20 animate-shake">
                            <AlertCircle className="w-5 h-5" />
                            <p className="text-xs font-black uppercase tracking-widest">{error}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-white uppercase italic">Feed Health</h3>
                        <button 
                            onClick={checkFeedHealth}
                            disabled={isCheckingHealth}
                            className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors flex items-center gap-2"
                        >
                            {isCheckingHealth ? 'Scanning...' : 'Run Diagnostics'} <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                    
                    {!feedHealth ? (
                        <p className="text-gray-500 text-sm leading-relaxed">Run a diagnostic scan to verify your Direct Publisher feed meets Roku's strict metadata requirements.</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-2xl">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total Movies</p>
                                    <p className="text-xl font-black text-white">{feedHealth.totalMovies}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Issues Found</p>
                                    <p className={`text-xl font-black ${feedHealth.issueCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{feedHealth.issueCount}</p>
                                </div>
                            </div>
                            
                            {feedHealth.issues.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Priority Fixes:</p>
                                    <div className="space-y-1">
                                        {feedHealth.issues.map((issue: string, i: number) => (
                                            <div key={i} className="flex items-center gap-2 text-[10px] text-red-400 font-medium">
                                                <div className="w-1 h-1 rounded-full bg-red-500"></div>
                                                {issue}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest">Last Scan: {feedHealth.timestamp}</p>
                        </div>
                    )}
                </div>

                <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-6">
                    <h3 className="text-xl font-black text-white uppercase italic">Roku Dashboard</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">Quick links to official Roku developer tools for deeper integration.</p>
                    <div className="grid grid-cols-1 gap-3">
                        <a href="https://developer.roku.com/dashboard" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
                            <span className="text-xs font-bold text-white uppercase tracking-widest">Developer Console</span>
                            <Download className="w-4 h-4 text-gray-500 group-hover:text-red-500 transition-colors" />
                        </a>
                        <a href="https://developer.roku.com/analytics" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
                            <span className="text-xs font-bold text-white uppercase tracking-widest">Analytics Portal</span>
                            <TrendingUp className="w-4 h-4 text-gray-500 group-hover:text-red-500 transition-colors" />
                        </a>
                    </div>
                </div>
            </div>

            {data.length > 0 && stats && (
                <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Total Views', value: stats.totalViews.toLocaleString(), icon: Play, color: 'text-red-500' },
                            { label: 'Unique Viewers', value: stats.totalUnique.toLocaleString(), icon: Users, color: 'text-blue-500' },
                            { label: 'Avg Duration', value: `${Math.round(stats.avgDuration)}m`, icon: Clock, color: 'text-emerald-500' },
                            { label: 'New Installs', value: stats.totalInstalls.toLocaleString(), icon: Download, color: 'text-purple-500' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2rem] space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <TrendingUp className="w-4 h-4 text-gray-700" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{stat.label}</p>
                                    <p className="text-3xl font-black text-white italic">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-white uppercase italic">Viewership Trend</h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Daily Views</span>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data}>
                                        <defs>
                                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                        <XAxis 
                                            dataKey="date" 
                                            stroke="#4b5563" 
                                            fontSize={10} 
                                            tickLine={false} 
                                            axisLine={false}
                                            tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                        />
                                        <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="views" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-white uppercase italic">Engagement Ratio</h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Retention</span>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                        <XAxis 
                                            dataKey="date" 
                                            stroke="#4b5563" 
                                            fontSize={10} 
                                            tickLine={false} 
                                            axisLine={false}
                                            tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                        />
                                        <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Bar dataKey="uniqueViewers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] overflow-hidden">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Raw Report Data</h3>
                            <button className="text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-80 transition-opacity">
                                Export Cleaned JSON <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    <tr>
                                        <th className="p-6">Date</th>
                                        <th className="p-6 text-right">Views</th>
                                        <th className="p-6 text-right">Uniques</th>
                                        <th className="p-6 text-right">Avg Watch</th>
                                        <th className="p-6 text-right">Installs</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs font-medium text-gray-300">
                                    {data.slice(0, 10).map((row, i) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                            <td className="p-6 font-mono">{row.date}</td>
                                            <td className="p-6 text-right text-white font-black">{row.views.toLocaleString()}</td>
                                            <td className="p-6 text-right">{row.uniqueViewers.toLocaleString()}</td>
                                            <td className="p-6 text-right">{Math.round(row.avgDuration)}m</td>
                                            <td className="p-6 text-right text-emerald-500">{row.installs?.toLocaleString() || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {data.length > 10 && (
                            <div className="p-6 text-center bg-white/[0.01]">
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Showing first 10 entries of {data.length} total</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RokuAnalyticsTab;
