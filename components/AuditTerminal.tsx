
import React, { useState, useEffect } from 'react';
import { AuditEntry } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';

const AuditTerminal: React.FC = () => {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const unsubscribe = db.collection('audit_logs')
            .orderBy('timestamp', 'desc')
            .limit(200)
            .onSnapshot(snap => {
                const fetched: AuditEntry[] = [];
                snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as AuditEntry));
                setLogs(fetched);
                setIsLoading(false);
            });

        return () => unsubscribe();
    }, []);

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'PURGE': return 'text-red-500';
            case 'MUTATION': return 'text-blue-400';
            case 'LOGIN': return 'text-green-500';
            case 'SECURITY': return 'text-amber-500';
            default: return 'text-gray-400';
        }
    };

    const handleExportCSV = () => {
        const headers = ["ID", "Timestamp", "Role", "Type", "Action", "Details"];
        const rows = logs.map(log => [
            log.id,
            log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toISOString() : '---',
            log.role,
            log.type,
            log.action,
            `"${log.details.replace(/"/g, '""')}"`
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

    if (isLoading) return <LoadingSpinner />;

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
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleExportCSV}
                        className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black py-2.5 px-6 rounded-xl transition-all uppercase text-[10px] tracking-widest border border-white/10"
                    >
                        Export Manifest (.csv)
                    </button>
                    <div className="flex items-center gap-3 text-[10px] font-black text-gray-700 uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Immutable Stream Active
                    </div>
                </div>
            </div>

            <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,1)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-[11px] leading-relaxed">
                        <thead className="bg-white/5 text-gray-500 uppercase">
                            <tr>
                                <th className="p-5 border-b border-white/5">Event UUID</th>
                                <th className="p-5 border-b border-white/5">Node Role</th>
                                <th className="p-5 border-b border-white/5">Action Payload</th>
                                <th className="p-5 border-b border-white/5">Status</th>
                                <th className="p-5 border-b border-white/5 text-right">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {logs.map(log => (
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
                                    <td className="p-5 text-right text-gray-600">
                                        {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString('en-US', { hour12: false }) : '---'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="p-8 bg-white/5 rounded-3xl border border-white/5 text-center">
                 <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.5em]">Global Audit Transparency Protocol // End of Manifest</p>
            </div>
        </div>
    );
};

export default AuditTerminal;
