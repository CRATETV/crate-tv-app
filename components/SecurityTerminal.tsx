
import React, { useState, useEffect } from 'react';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';

interface SecurityEvent {
    id: string;
    type: string;
    timestamp: any;
    ip?: string;
    details?: any;
}

const HealthCheck: React.FC<{ label: string; status: 'online' | 'error' | 'checking' | 'warning' }> = ({ label, status }) => (
    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
                status === 'online' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 
                status === 'error' ? 'bg-red-600 animate-pulse shadow-[0_0_10px_#ef4444]' : 
                status === 'warning' ? 'bg-amber-500 animate-ping shadow-[0_0_10px_#f59e0b]' :
                'bg-gray-700 animate-pulse'
            }`}></span>
            <span className={`text-[10px] font-black uppercase ${
                status === 'online' ? 'text-green-500' : 
                status === 'error' ? 'text-red-500' : 
                status === 'warning' ? 'text-amber-500' :
                'text-gray-600'
            }`}>
                {status === 'online' ? 'NOMINAL' : status === 'error' ? 'BREACH_IDENTIFIED' : status === 'warning' ? 'ANOMALY' : 'SYNCING'}
            </span>
        </div>
    </div>
);

const SecurityTerminal: React.FC = () => {
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [health, setHealth] = useState<Record<string, 'online' | 'error' | 'checking' | 'warning'>>({
        s3: 'checking',
        api: 'checking',
        db: 'checking',
        ai: 'checking'
    });

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const unsubscribe = db.collection('security_events')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot(snap => {
                const fetched: SecurityEvent[] = [];
                snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as SecurityEvent));
                setEvents(fetched);
                setIsLoading(false);
                setHealth(h => ({ ...h, db: 'online' }));
            });
            
        // Robust Health Cycle
        const runHealthCycle = async () => {
            try {
                const res = await fetch('/api/get-live-data?t=' + Date.now());
                setHealth(h => ({ 
                    ...h, 
                    s3: res.ok ? 'online' : 'error', 
                    api: res.ok ? 'online' : 'error' 
                }));

                const aiCheck = await fetch('/api/generate-fact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'System', bio: 'Internal Check' })
                });
                setHealth(h => ({ ...h, ai: aiCheck.ok ? 'online' : 'warning' }));
            } catch (e) {
                setHealth(h => ({ ...h, s3: 'error', api: 'error', ai: 'error' }));
            }
        };

        runHealthCycle();
        const interval = setInterval(runHealthCycle, 60000); // Pulse every minute

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const getStatusColor = (type: string) => {
        if (type.includes('FAIL') || type.includes('ERROR') || type.includes('BREACH')) return 'text-red-500';
        if (type.includes('AUTH') || type.includes('LOGIN') || type.includes('ADMIN')) return 'text-blue-400';
        return 'text-green-500';
    };

    return (
        <div className="bg-[#050505] p-8 md:p-12 rounded-[2.5rem] border border-white/5 space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Threat Monitor</h2>
                        <span className="bg-red-600/10 border border-red-600/30 text-red-500 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-[0.4em] shadow-[0_0_15px_rgba(239,68,68,0.2)]">HARDENED_CORE_V4</span>
                    </div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] mt-2">Active infrastructure integrity and session auditing.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-black/60 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-inner">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Global Encryption: AES-256</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <HealthCheck label="S3 CONTENT STORAGE" status={health.s3} />
                <HealthCheck label="STUDIO GATEWAY" status={health.api} />
                <HealthCheck label="CLOUD DB ENGINE" status={health.db} />
                <HealthCheck label="INTELLIGENCE CORE" status={health.ai} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 flex flex-col items-center text-center space-y-2 group">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Financial Origin Epoch</p>
                    <p className="text-2xl font-black text-white italic group-hover:text-red-500 transition-colors tracking-tighter">MAY 24, 2025</p>
                </div>
                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 flex flex-col items-center text-center space-y-2 group">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bot Deterrent</p>
                    <p className="text-2xl font-black text-white italic group-hover:text-red-500 transition-colors tracking-tighter">HONEYPOT_ACTIVE</p>
                </div>
                <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 flex flex-col items-center text-center space-y-2 group">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ad Engine Status</p>
                    <p className="text-2xl font-black text-red-600 italic tracking-tighter">OFFLINE_LOCKDOWN</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex justify-between items-end px-2">
                    <h3 className="text-sm font-black uppercase tracking-[0.4em] text-gray-400">Operational Telemetry (Last 50 Events)</h3>
                    <p className="text-[8px] font-mono text-gray-700">NODE_VERSION: 1.4.2_DELTA</p>
                </div>
                <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-[inset_0_0_60px_rgba(0,0,0,1)]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-mono text-[11px] leading-relaxed">
                            <thead className="bg-white/[0.02] text-gray-600 uppercase">
                                <tr>
                                    <th className="p-5 border-b border-white/5">Event UUID</th>
                                    <th className="p-5 border-b border-white/5">System Payload</th>
                                    <th className="p-5 border-b border-white/5 text-center">Identity Trace</th>
                                    <th className="p-5 border-b border-white/5 text-right">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {isLoading ? (
                                    <tr><td colSpan={4} className="p-20 text-center"><LoadingSpinner /></td></tr>
                                ) : events.map(ev => (
                                    <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-5 text-gray-700 select-all">{ev.id.substring(0, 12)}</td>
                                        <td className="p-5">
                                            <p className={`font-black uppercase tracking-tight ${getStatusColor(ev.type)}`}>{ev.type}</p>
                                            {ev.details && <p className="text-[10px] text-gray-600 mt-1 truncate max-w-[300px]">MANIFEST: {JSON.stringify(ev.details)}</p>}
                                        </td>
                                        <td className="p-5 text-center">
                                            <code className="bg-white/5 px-3 py-1 rounded text-gray-500 group-hover:text-white transition-colors">{ev.ip || 'INTERNAL_NODE'}</code>
                                        </td>
                                        <td className="p-5 text-right text-gray-700 font-bold uppercase tracking-widest">
                                            {ev.timestamp?.seconds ? new Date(ev.timestamp.seconds * 1000).toLocaleTimeString() : '---'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div className="p-10 bg-red-600/5 rounded-[3rem] border border-red-600/10 text-center space-y-4 shadow-inner">
                 <p className="text-[10px] text-gray-700 font-black uppercase tracking-[1em] mr-[-1em]">Automatic Lockdown Protocol Enabled</p>
                 <p className="text-xs text-gray-600 max-w-2xl mx-auto leading-relaxed">Infrastructure remains under constant observation. Unauthorized access attempts trigger immediate node isolation and administrative broadcast.</p>
            </div>
        </div>
    );
};

export default SecurityTerminal;
