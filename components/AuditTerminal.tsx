
import React, { useState, useEffect, useMemo } from 'react';
import { AuditEntry } from '../types';
import { getDbInstance, initializeFirebaseAuth } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';

const AuditTerminal: React.FC = () => {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter logs based on search query
    const filteredLogs = useMemo(() => {
        if (!searchQuery.trim()) return logs;
        const query = searchQuery.toLowerCase();
        return logs.filter(log => 
            log.action?.toLowerCase().includes(query) ||
            log.details?.toLowerCase().includes(query) ||
            log.role?.toLowerCase().includes(query) ||
            log.type?.toLowerCase().includes(query) ||
            log.id?.toLowerCase().includes(query) ||
            (log.ipAddress || log.ip || '').toLowerCase().includes(query)
        );
    }, [logs, searchQuery]);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const setupListener = async () => {
            try {
                setIsLoading(true);
                setError(null);
                await initializeFirebaseAuth();
                const db = getDbInstance();
                if (!db) {
                    setError("Firebase Database instance is unavailable. Check your configuration.");
                    setIsLoading(false);
                    return;
                }

                unsubscribe = db.collection('audit_logs')
                    .orderBy('timestamp', 'desc')
                    .limit(200)
                    .onSnapshot(snap => {
                        const fetched: AuditEntry[] = [];
                        snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as AuditEntry));
                        setLogs(fetched);
                        setIsLoading(false);
                    }, (err) => {
                        console.error("Audit stream error:", err);
                        setError(`Failed to connect to audit stream: ${err.message}`);
                        setIsLoading(false);
                    });
            } catch (err: any) {
                console.error("Audit setup error:", err);
                setError(`Setup failed: ${err.message}`);
                setIsLoading(false);
            }
        };

        setupListener();
        return () => unsubscribe?.();
    }, []);

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'PURGE': return 'text-red-500';
            case 'MUTATION': return 'text-blue-400';
            case 'LOGIN': return 'text-green-500';
            case 'SECURITY': return 'text-amber-500';
            case 'VIEW': return 'text-purple-400';
            default: return 'text-gray-400';
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        const headers = ["ID", "Timestamp", "Role", "Type", "Action", "Details", "IP"];
        const rows = logs.map(log => [
            log.id,
            log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toISOString() : '---',
            log.role,
            log.type,
            log.action,
            `"${(log.details || '').replace(/"/g, '""')}"`,
            log.ipAddress || log.ip || '---'
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `CrateTV_AuditLog_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleTestLog = async () => {
        const pass = sessionStorage.getItem('adminPassword');
        const name = sessionStorage.getItem('operatorName');
        try {
            const response = await fetch('/api/log-audit-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: pass,
                    operatorName: name,
                    action: 'TEST_HEARTBEAT',
                    type: 'SECURITY',
                    details: 'Manual audit stream verification triggered by operator.'
                })
            });
            if (!response.ok) throw new Error("Failed to log test event.");
        } catch (err: any) {
            alert(`Test log failed: ${err.message}`);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    if (error) {
        return (
            <div className="bg-[#050505] p-12 rounded-[2.5rem] border border-red-500/20 text-center space-y-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                    <span className="text-red-500 text-2xl">!</span>
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Audit Stream Failure</h2>
                <p className="text-gray-400 max-w-md mx-auto">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="bg-white/5 hover:bg-white/10 text-white font-black py-3 px-8 rounded-xl transition-all uppercase text-xs tracking-widest border border-white/10"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="bg-[#050505] p-8 md:p-12 rounded-[2.5rem] border border-white/5 space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Chronos Audit</h2>
                        <span className="bg-red-600/10 border border-red-600/30 text-red-500 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest">Master Level Trace</span>
                    </div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">Immutable modification history for the global infrastructure.</p>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Search Input */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-all w-48 md:w-64"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <button 
                        onClick={handleTestLog}
                        className="bg-red-600/10 hover:bg-red-600/20 text-red-500 font-black py-2.5 px-6 rounded-xl transition-all uppercase text-[10px] tracking-widest border border-red-600/30"
                    >
                        Test Audit
                    </button>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black py-2.5 px-6 rounded-xl transition-all uppercase text-[10px] tracking-widest border border-white/10"
                    >
                        Refresh Stream
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black py-2.5 px-6 rounded-xl transition-all uppercase text-[10px] tracking-widest border border-white/10"
                    >
                        Print Report
                    </button>
                    <button 
                        onClick={handleExportCSV}
                        className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black py-2.5 px-6 rounded-xl transition-all uppercase text-[10px] tracking-widest border border-white/10"
                    >
                        Export Manifest (.csv)
                    </button>
                    <div className="flex items-center gap-3 text-[10px] font-black text-gray-700 uppercase tracking-widest">
                        <span className={`w-2 h-2 rounded-full ${logs.length > 0 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                        {logs.length > 0 ? `${filteredLogs.length} of ${logs.length} Records` : 'Waiting for Data...'}
                    </div>
                </div>
            </div>

            <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,1)]">
                {filteredLogs.length === 0 ? (
                    <div className="p-20 text-center space-y-4">
                        <p className="text-gray-600 font-black uppercase tracking-[0.3em] text-sm">
                            {searchQuery ? 'No Matching Records' : 'No Audit Records Found'}
                        </p>
                        <p className="text-gray-700 text-xs italic">
                            {searchQuery ? `No records match "${searchQuery}". Try a different search term.` : 'The manifest is currently empty. Perform an administrative action to generate a trace.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-mono text-[11px] leading-relaxed">
                            <thead className="bg-white/5 text-gray-500 uppercase">
                                <tr>
                                    <th className="p-5 border-b border-white/5">Event UUID</th>
                                    <th className="p-5 border-b border-white/5">Node Role</th>
                                    <th className="p-5 border-b border-white/5">Action Payload</th>
                                    <th className="p-5 border-b border-white/5">Status</th>
                                    <th className="p-5 border-b border-white/5">Node IP</th>
                                    <th className="p-5 border-b border-white/5 text-right">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-5 text-gray-700 select-all">{log.id.substring(0, 8)}</td>
                                        <td className="p-5 font-black text-gray-400 uppercase tracking-tighter">{log.role}</td>
                                        <td className="p-5">
                                            <p className={`font-black uppercase tracking-tight ${getTypeColor(log.type)}`}>{log.action}</p>
                                            <p className="text-gray-600 mt-1 font-medium">{log.details}</p>
                                        </td>
                                        <td className="p-5">
                                            <span className="text-green-900 bg-green-900/10 border border-green-900/30 px-2 py-0.5 rounded-[4px] font-black">LOGGED</span>
                                        </td>
                                        <td className="p-5 text-gray-600 font-mono text-[10px]">
                                            {log.ipAddress || log.ip || '---'}
                                        </td>
                                        <td className="p-5 text-right text-gray-600">
                                            {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString('en-US', { hour12: false }) : '---'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            <div className="p-8 bg-white/5 rounded-3xl border border-white/5 text-center">
                 <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.5em]">Global Audit Transparency Protocol // End of Manifest</p>
            </div>
        </div>
    );
};

export default AuditTerminal;
