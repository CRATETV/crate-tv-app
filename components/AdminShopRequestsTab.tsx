import React, { useState, useEffect } from 'react';
import { ShopRequest } from '../types';
import LoadingSpinner from './LoadingSpinner';

// firebase-admin's Timestamp.toJSON() serializes as {_seconds, _nanoseconds}
// over the wire, not {seconds, nanoseconds} — see AdminPayoutsTab.tsx.
const formatTimestamp = (ts: any): string => {
    const seconds = ts?._seconds ?? ts?.seconds;
    return seconds ? new Date(seconds * 1000).toLocaleString() : '---';
};

const AdminShopRequestsTab: React.FC = () => {
    const [requests, setRequests] = useState<ShopRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchRequests = async () => {
        setIsLoading(true);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/get-shop-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (!res.ok) throw new Error('Failed to fetch shop requests.');
            const data = await res.json();
            setRequests(data.shopRequests || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, []);

    const handleResolve = async (requestId: string, status: 'added' | 'declined') => {
        const label = status === 'added' ? 'mark this as added to the shop' : 'decline this request';
        if (!window.confirm(`Are you sure you want to ${label}?`)) return;
        setProcessingId(requestId);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/update-shop-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, status, password }),
            });
            if (!res.ok) throw new Error('Failed to update request.');
            await fetchRequests();
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Failed to update request.');
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    const pending = requests.filter(r => r.status === 'pending');
    const resolved = requests.filter(r => r.status !== 'pending');

    return (
        <div className="space-y-12 pb-32 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-white/5 p-12 rounded-[4rem] shadow-2xl">
                <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Pending Shop Requests</h2>
                    <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full uppercase">Awaiting Action</span>
                </div>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl text-center font-black uppercase tracking-widest text-xs mb-6">{error}</div>}
                <div className="bg-black border border-white/10 rounded-[2.5rem] overflow-hidden">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-white/5 text-gray-700 uppercase font-black tracking-widest">
                            <tr>
                                <th className="p-6">Filmmaker</th>
                                <th className="p-6">Film</th>
                                <th className="p-6">Request</th>
                                <th className="p-6">Contact</th>
                                <th className="p-6">Requested</th>
                                <th className="p-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {pending.length === 0 ? (
                                <tr><td colSpan={6} className="p-20 text-center text-gray-800 font-black uppercase tracking-[0.5em] italic">No pending requests</td></tr>
                            ) : pending.map(r => (
                                <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="p-6">
                                        <p className="font-black text-white uppercase text-base">{r.directorName}</p>
                                    </td>
                                    <td className="p-6 text-gray-400">
                                        {r.filmTitle || '—'}
                                    </td>
                                    <td className="p-6 text-gray-300 max-w-sm">
                                        {r.description}
                                    </td>
                                    <td className="p-6 text-gray-500">
                                        {r.email}
                                    </td>
                                    <td className="p-6 text-gray-500 font-mono">
                                        {formatTimestamp(r.requestDate)}
                                    </td>
                                    <td className="p-6 text-right space-x-2 whitespace-nowrap">
                                        <button
                                            onClick={() => handleResolve(r.id, 'added')}
                                            disabled={processingId === r.id}
                                            className="text-[10px] font-black uppercase text-black bg-white hover:bg-green-500 hover:text-white transition-colors px-4 py-2 rounded-xl disabled:opacity-40"
                                        >
                                            {processingId === r.id ? '...' : 'Mark Added'}
                                        </button>
                                        <button
                                            onClick={() => handleResolve(r.id, 'declined')}
                                            disabled={processingId === r.id}
                                            className="text-[10px] font-black uppercase text-gray-400 bg-white/5 hover:bg-red-600 hover:text-white transition-colors px-4 py-2 rounded-xl disabled:opacity-40"
                                        >
                                            Decline
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-[#0f0f0f] border border-white/5 p-12 rounded-[4rem] shadow-2xl">
                <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Resolved Requests</h2>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">History</p>
                </div>
                <div className="bg-black border border-white/10 rounded-[2.5rem] overflow-hidden">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-white/5 text-gray-700 uppercase font-black tracking-widest">
                            <tr>
                                <th className="p-6">Filmmaker</th>
                                <th className="p-6">Request</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-right">Resolved</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {resolved.length === 0 ? (
                                <tr><td colSpan={4} className="p-20 text-center text-gray-800 font-black uppercase tracking-[0.5em] italic">No resolved requests yet</td></tr>
                            ) : resolved.map(r => (
                                <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="p-6">
                                        <p className="font-black text-white uppercase text-base">{r.directorName}</p>
                                    </td>
                                    <td className="p-6 text-gray-400 max-w-sm">{r.description}</td>
                                    <td className="p-6">
                                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${r.status === 'added' ? 'bg-green-600/10 border-green-500/20 text-green-400' : 'bg-red-600/10 border-red-500/20 text-red-400'}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right text-gray-500 font-mono">
                                        {formatTimestamp(r.resolvedDate)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminShopRequestsTab;
