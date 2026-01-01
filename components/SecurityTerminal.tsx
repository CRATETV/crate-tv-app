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

const SecurityTerminal: React.FC = () => {
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
            });
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
                <div className="flex items-center gap-6">
                    <div className="bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Master Firewall Active</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Financial Epoch</p>
                    <p className="text-xl font-bold text-white">MAY 24, 2025</p>
                    <p className="text-[9px] text-green-600 font-black uppercase mt-2">Verified Hard Reset</p>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Payment Guard</p>
                    <p className="text-xl font-bold text-white">ENFORCED</p>
                    <p className="text-[9px] text-blue-600 font-black uppercase mt-2">Server-Side Price Validation</p>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Ad Revenue</p>
                    <p className="text-xl font-bold text-white">$0.00</p>
                    <p className="text-[9px] text-red-600 font-black uppercase mt-2">Explicitly Sunsetting</p>
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
            
            <div className="bg-blue-600/5 p-6 rounded-2xl border border-blue-500/20">
                <div className="flex gap-4">
                    <div className="text-blue-500">🛡️</div>
                    <div>
                        <h4 className="text-xs font-black text-white uppercase mb-1">Front-End Integrity Note</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed">Crate TV utilizes strict CSRF protection and server-side authorization for all sensitive data mutations. Your financial ledger is anchored to the May 24 epoch to ensure absolute parity with your Square Card records.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityTerminal;