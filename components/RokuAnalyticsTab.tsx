import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Movie, AnalyticsData } from '../types';

interface RokuAnalyticsTabProps {
    analytics: AnalyticsData | null;
    movies: Record<string, Movie>;
}

const RokuAnalyticsTab: React.FC<RokuAnalyticsTabProps> = ({ analytics, movies }) => {
    const [feedHealth, setFeedHealth] = useState<any>(null);
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);
    const [feedError, setFeedError] = useState<string | null>(null);

    const roku = analytics?.rokuEngagement;
    const totalRokuViews = roku?.totalRokuViews || 0;
    const totalDevices = roku?.totalDevices || 0;
    const viewsByMovie = roku?.viewsByMovie || {};

    const totalWebViews = useMemo(() => {
        const counts = analytics?.viewCounts || {};
        return Object.values(counts).reduce((s: number, c: any) => s + (c || 0), 0);
    }, [analytics]);

    const rokuRatio = totalWebViews + totalRokuViews > 0
        ? Math.round((totalRokuViews / (totalWebViews + totalRokuViews)) * 100) : 0;

    const topRokuFilms = useMemo(() => {
        return Object.entries(viewsByMovie)
            .map(([key, views]) => ({
                key,
                title: movies[key]?.title || key,
                rokuViews: views as number,
                webViews: analytics?.viewCounts?.[key] || 0,
            }))
            .filter(f => f.rokuViews > 0)
            .sort((a, b) => b.rokuViews - a.rokuViews)
            .slice(0, 10);
    }, [viewsByMovie, movies, analytics]);

    const comparisonData = useMemo(() => {
        return topRokuFilms.slice(0, 8).map(f => ({
            title: f.title.length > 14 ? f.title.slice(0, 14) + '\u2026' : f.title,
            Roku: f.rokuViews,
            Web: f.webViews,
        }));
    }, [topRokuFilms]);

    const checkFeedHealth = async () => {
        setIsCheckingHealth(true);
        setFeedError(null);
        try {
            const res = await fetch('/api/roku-feed');
            const feed = await res.json();
            const issues: string[] = [];
            let totalMovies = 0;
            feed.categories?.forEach((cat: any) => {
                totalMovies += cat.children?.length || 0;
                cat.children?.forEach((movie: any) => {
                    if (!movie.hdPosterUrl) issues.push(`Missing poster: ${movie.title}`);
                    if (!movie.streamUrl) issues.push(`Missing stream: ${movie.title}`);
                });
            });
            setFeedHealth({ totalMovies, categoryCount: feed.categories?.length || 0, issueCount: issues.length, issues: issues.slice(0, 5), timestamp: new Date().toLocaleTimeString() });
        } catch (e) {
            setFeedError('Could not reach Roku feed.');
        } finally {
            setIsCheckingHealth(false);
        }
    };

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                <p className="text-purple-400 font-black uppercase tracking-[0.4em] text-[10px]">Roku TV Analytics</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Roku Streams', value: totalRokuViews.toLocaleString(), color: 'text-purple-400', sub: 'all time' },
                    { label: 'Devices Linked', value: totalDevices.toLocaleString(), color: 'text-blue-400', sub: 'accounts' },
                    { label: 'Roku Share', value: `${rokuRatio}%`, color: 'text-red-400', sub: 'of all views' },
                    { label: 'Films Streamed', value: topRokuFilms.length.toString(), color: 'text-emerald-400', sub: 'on Roku' },
                ].map((m, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl hover:bg-white/[0.04] transition-all">
                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-[0.3em] mb-3">{m.label}</p>
                        <p className={`text-4xl font-black italic ${m.color}`}>{m.value}</p>
                        <p className="text-[9px] text-gray-700 uppercase tracking-widest mt-1">{m.sub}</p>
                    </div>
                ))}
            </div>

            {totalRokuViews === 0 ? (
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-16 text-center">
                    <p className="text-gray-700 font-black uppercase tracking-[0.4em] text-[10px]">No Roku streams recorded yet</p>
                    <p className="text-gray-800 text-xs mt-2">Streams will appear here as viewers watch on Roku</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem]">
                        <h3 className="text-sm font-black uppercase tracking-widest italic mb-6 text-white">Top Films on Roku</h3>
                        <div className="space-y-3">
                            {topRokuFilms.map((film, i) => {
                                const max = topRokuFilms[0]?.rokuViews || 1;
                                const pct = Math.round((film.rokuViews / max) * 100);
                                return (
                                    <div key={film.key}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-[9px] font-black text-gray-700 w-4 flex-shrink-0">#{i + 1}</span>
                                                <p className="text-[11px] font-bold text-white truncate">{film.title}</p>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                                <span className="text-[10px] font-black text-purple-400">{film.rokuViews.toLocaleString()}</span>
                                                <span className="text-[9px] text-gray-700">/</span>
                                                <span className="text-[10px] text-gray-600">{film.webViews.toLocaleString()} web</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black uppercase tracking-widest italic text-white">Roku vs Web</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div><span className="text-[9px] text-gray-600 font-bold uppercase">Roku</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-[9px] text-gray-600 font-bold uppercase">Web</span></div>
                            </div>
                        </div>
                        <div className="h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonData} barGap={2}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="title" stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                                    <Bar dataKey="Roku" fill="#a855f7" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="Web" fill="#ef4444" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest italic text-white">Feed Health</h3>
                        <p className="text-[10px] text-gray-600 mt-1">Verify your Roku feed meets metadata requirements</p>
                    </div>
                    <button onClick={checkFeedHealth} disabled={isCheckingHealth}
                        className="bg-white/5 hover:bg-white/10 text-white font-black py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-widest border border-white/10 transition-all disabled:opacity-50">
                        {isCheckingHealth ? 'Scanning...' : 'Run Scan'}
                    </button>
                </div>
                {feedError && <p className="text-red-400 text-xs">{feedError}</p>}
                {!feedHealth && !feedError && <p className="text-gray-700 text-sm">Click Run Scan to check your Roku feed for missing posters, streams, and metadata issues.</p>}
                {feedHealth && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Films', value: feedHealth.totalMovies, color: 'text-white' },
                            { label: 'Rows', value: feedHealth.categoryCount, color: 'text-white' },
                            { label: 'Issues', value: feedHealth.issueCount, color: feedHealth.issueCount > 0 ? 'text-red-500' : 'text-emerald-500' },
                            { label: 'Last Scan', value: feedHealth.timestamp, color: 'text-gray-400' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white/5 p-4 rounded-2xl">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{s.label}</p>
                                <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                        {feedHealth.issues.length > 0 && (
                            <div className="col-span-full bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-1.5">
                                <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Issues to fix:</p>
                                {feedHealth.issues.map((issue: string, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-[10px] text-red-400">
                                        <div className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0"></div>
                                        {issue}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex gap-3 flex-wrap">
                <a href="https://developer.roku.com/dashboard" target="_blank" rel="noreferrer"
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest transition-all">
                    Roku Developer Console ↗
                </a>
                <a href="https://developer.roku.com/analytics" target="_blank" rel="noreferrer"
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest transition-all">
                    Roku Analytics Portal ↗
                </a>
            </div>
        </div>
    );
};

export default RokuAnalyticsTab;
