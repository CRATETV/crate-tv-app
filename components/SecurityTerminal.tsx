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

const HealthCheck: React.FC<{ label: string; status: 'online' | 'error' | 'checking' }> = ({ label, status }) => (
    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : status === 'error' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></span>
            <span className={`text-[10px] font-bold uppercase ${status === 'online' ? 'text-green-500' : status === 'error' ? 'text-red-500' : 'text-yellow-500'}`}>
                {status === 'online' ? 'Online' : status === 'error' ? 'Failure' : 'Syncing'}
            </span>
        </div>
    </div>
);

const SecurityTerminal: React.FC = () => {
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [health, setHealth] = useState<Record<string, 'online' | 'error' | 'checking'>>({
        s3: 'checking',
        api: 'checking',
        db: 'checking'
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
            
        // Quick Health Ping
        fetch('/api/get-live-data?t=' + Date.now()).then(r => setHealth(h => ({ ...h, s3: r.ok ? 'online' : 'error', api: r.ok ? 'online' : 'error' })));

        return () => unsubscribe();
    }, []);

    const getStatusColor = (type: string) => {
        if (type.includes('FAIL') || type.includes('ERROR')) return 'text-red-500';
        if (type.includes('AUTH') || type.includes('LOGIN')) return 'text-blue-400';
        return 'text-green-500';
    };

    return (
        <div className="bg-[#050505] p-8 rounded-[2.5rem] border border-white/5 space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Security Perimeter</h2>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] mt-1">Real-time infrastructure integrity monitoring</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <HealthCheck label="S3 Content Uplink" status={health.s3} />
                <HealthCheck label="Studio API Gateway" status={health.api} />
                <HealthCheck label="Cloud DB Integrity" status={health.db} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Financial Epoch</p>
                    <p className="text-xl font-bold text-white">MAY 24, 2025</p>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Deterrent Protocol</p>
                    <p className="text-xl font-bold text-white">GHOST_WATERMARK</p>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Ad Engine</p>
                    <p className="text-xl font-bold text-red-600">SUNSETTING</p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 px-2">Operational Log (Last 50 Events)</h3>
                <div className="bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-mono text-xs">
                            <thead className="bg-white/5 text-gray-500 uppercase">
                                <tr>
                                    <th className="p-4">Timestamp</th>
                                    <th className="p-4">Event Type</th>
                                    <th className="p-4">Source IP</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {isLoading ? (
                                    <tr><td colSpan={4} className="p-12 text-center"><LoadingSpinner /></td></tr>
                                ) : events.map(ev => (
                                    <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 text-gray-500">{ev.timestamp?.seconds ? new Date(ev.timestamp.seconds * 1000).toLocaleTimeString() : '---'}</td>
                                        <td className="p-4 font-bold text-white tracking-tighter">{ev.type}</td>
                                        <td className="p-4 text-gray-600">{ev.ip || 'INTERNAL'}</td>
                                        <td className={`p-4 font-black uppercase ${getStatusColor(ev.type)}`}>
                                            {ev.type.includes('FAIL') ? 'Blocked' : 'Verified'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityTerminal;