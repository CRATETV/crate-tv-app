
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ErrorLogEntry {
    id: string;
    source: string;
    origin: string; // 'client' | 'server'
    message: string;
    stack: string | null;
    url: string | null;
    context: Record<string, any> | null;
    userAgent: string | null;
    ipAddress: string;
    timestamp: { seconds: number | null } | null;
}

const ErrorLogTab: React.FC = () => {
    const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [originFilter, setOriginFilter] = useState<'all' | 'client' | 'server'>('all');
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const filteredLogs = useMemo(() => {
        let result = logs;
        if (originFilter !== 'all') result = result.filter(l => l.origin === originFilter);
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(log =>
                log.source?.toLowerCase().includes(query) ||
                log.message?.toLowerCase().includes(query) ||
                log.url?.toLowerCase().includes(query) ||
                log.ipAddress?.toLowerCase().includes(query)
            );
        }
        return result;
    }, [logs, searchQuery, originFilter]);

    const fetchLogs = useCallback(async () => {
        const password = sessionStorage.getItem('adminPassword');
        if (!password) {
            setError('No admin credentials found. Please log in again.');
            setIsLoading(false);
            return;
        }
        try {
            const res = await fetch('/api/get-error-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to fetch error logs.');
            }
            const data = await res.json();
            setLogs(data.logs || []);
            setLastRefreshed(new Date());
            setError(null);
        } catch (err: any) {
            setError(`Stream failure: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch + auto-refresh every 30 seconds
    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 30000);
        return () => clearInterval(interval);
    }, [fetchLogs]);

    const formatTime = (log: ErrorLogEntry) =>
        log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString('en-US', { hour12: false }) : '---';

    const isRecent = (log: ErrorLogEntry) =>
        !!(log.timestamp?.seconds && Date.now() - log.timestamp.seconds * 1000 < 15 * 60 * 1000);

    if (isLoading) return <LoadingSpinner />;

    if (error) {
        return (
            <div className="bg-[#050505] p-12 rounded-[2.5rem] border border-red-500/20 text-center space-y-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                    <span className="text-red-500 text-2xl">!</span>
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Error Stream Failure</h2>
                <p className="text-gray-400 max-w-md mx-auto">{error}</p>
                <button onClick={fetchLogs} className="bg-white/5 hover:bg-white/10 text-white font-black py-3 px-8 rounded-xl transition-all uppercase text-xs tracking-widest border border-white/10">
                    Retry Connection
                </button>
            </div>
        );
    }

    const recentCount = logs.filter(isRecent).length;

    return (
        <div className="bg-[#050505] p-8 md:p-12 rounded-[2.5rem] border border-white/5 space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Error Log</h2>
                        {recentCount > 0 && (
                            <span className="bg-red-600/10 border border-red-600/30 text-red-500 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest animate-pulse">
                                {recentCount} in last 15 min
                            </span>
                        )}
                    </div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">
                        Client + server errors — auto-refreshes every 30s
                        {lastRefreshed && <span className="text-gray-700 ml-2">// Last: {lastRefreshed.toLocaleTimeString()}</span>}
                    </p>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex rounded-xl border border-white/10 overflow-hidden">
                        {(['all', 'client', 'server'] as const).map(o => (
                            <button
                                key={o}
                                onClick={() => setOriginFilter(o)}
                                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${originFilter === o ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                            >
                                {o}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-all w-48 md:w-64"
                        />
                        <svg className="h-4 w-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">×</button>}
                    </div>
                    <button onClick={fetchLogs} className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black py-2.5 px-6 rounded-xl transition-all uppercase text-[10px] tracking-widest border border-white/10">Refresh Now</button>
                    <div className="flex items-center gap-3 text-[10px] font-black text-gray-700 uppercase tracking-widest">
                        <span className={`w-2 h-2 rounded-full ${logs.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></span>
                        {logs.length > 0 ? `${filteredLogs.length} of ${logs.length} Records` : 'No Errors Logged'}
                    </div>
                </div>
            </div>

            <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,1)]">
                {filteredLogs.length === 0 ? (
                    <div className="p-20 text-center space-y-4">
                        <p className="text-gray-600 font-black uppercase tracking-[0.3em] text-sm">{searchQuery ? 'No Matching Records' : 'All Clear'}</p>
                        <p className="text-gray-700 text-xs italic">{searchQuery ? `No records match "${searchQuery}".` : 'No client or server errors have been reported yet.'}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredLogs.map(log => (
                            <div key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                <button
                                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                    className="w-full text-left p-5 flex items-start gap-4"
                                >
                                    <span className={`mt-1 flex-shrink-0 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded ${log.origin === 'client' ? 'bg-blue-900/20 text-blue-400 border border-blue-500/20' : 'bg-red-900/20 text-red-400 border border-red-500/20'}`}>
                                        {log.origin}
                                    </span>
                                    <div className="min-w-0 flex-grow">
                                        <p className="font-black text-gray-300 uppercase tracking-tight text-xs truncate">{log.source}</p>
                                        <p className="text-gray-500 mt-1 text-sm break-words">{log.message}</p>
                                    </div>
                                    <span className="flex-shrink-0 text-gray-600 text-[10px] font-mono whitespace-nowrap">{formatTime(log)}</span>
                                </button>
                                {expandedId === log.id && (
                                    <div className="px-5 pb-5 pl-16 space-y-2 text-[11px] font-mono text-gray-500">
                                        {log.url && <p><span className="text-gray-700">URL:</span> {log.url}</p>}
                                        {log.ipAddress && <p><span className="text-gray-700">IP:</span> {log.ipAddress}</p>}
                                        {log.userAgent && <p><span className="text-gray-700">UA:</span> {log.userAgent}</p>}
                                        {log.context && <p><span className="text-gray-700">Context:</span> {JSON.stringify(log.context)}</p>}
                                        {log.stack && (
                                            <pre className="bg-white/5 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap text-gray-400 mt-2">{log.stack}</pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ErrorLogTab;
