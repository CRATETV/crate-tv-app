import React, { useState, useEffect, useMemo } from 'react';
import { PayoutRequest, Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;

const AdminPayoutsTab: React.FC = () => {
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Key Generator State
    const [targetName, setTargetName] = useState('');
    const [targetType, setTargetType] = useState<'filmmaker' | 'festival'>('filmmaker');
    const [generatedKey, setGeneratedKey] = useState('');

    const fetchPayouts = async () => {
        setIsLoading(true);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/get-payouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (!res.ok) throw new Error('Failed to fetch payout data.');
            const data = await res.json();
            setPayouts(data.payoutRequests || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchPayouts(); }, []);

    const handleGenerateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetName.trim()) return;
        setIsGenerating(true);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/generate-payout-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, targetName: targetName.trim(), type: targetType }),
            });
            const data = await res.json();
            setGeneratedKey(data.accessKey);
            fetchPayouts();
        } catch (e) {
            alert("Key synthesis failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRevokeKey = async (id: string) => {
        if (!window.confirm("REVOKE ACCESS: Permanently invalidate this payout node?")) return;
        const password = sessionStorage.getItem('adminPassword');
        await fetch('/api/manage-collaborators', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, action: 'delete_payout_key', data: { id } }),
        });
        fetchPayouts();
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-12 pb-32 animate-[fadeIn_0.5s_ease-out]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                
                {/* KEY GENERATOR */}
                <section className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3.5rem] shadow-2xl space-y-8 h-fit">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Voucher Issuance</h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2 italic">Authorize restricted disbursement terminals</p>
                    </div>

                    <form onSubmit={handleGenerateKey} className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Target Node Configuration</label>
                            <div className="grid grid-cols-2 gap-3 p-1 bg-black rounded-2xl border border-white/5">
                                <button 
                                    type="button"
                                    onClick={() => setTargetType('filmmaker')}
                                    className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetType === 'filmmaker' ? 'bg-red-600 text-white shadow-xl' : 'text-gray-600 hover:text-gray-300'}`}
                                >
                                    Filmmaker
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setTargetType('festival')}
                                    className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetType === 'festival' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-600 hover:text-gray-300'}`}
                                >
                                    Festival Lead
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="form-label">
                                {targetType === 'filmmaker' ? 'Director/Producer Name (Matches Credits)' : 'Institutional Partner Name (Playhouse West)'}
                            </label>
                            <input 
                                value={targetName} 
                                onChange={e => setTargetName(e.target.value)}
                                className="form-input bg-black/40 border-white/10 text-lg font-black uppercase tracking-tight italic" 
                                placeholder={targetType === 'filmmaker' ? "e.g. Salome Denoon" : "e.g. Playhouse West Philadelphia"}
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={isGenerating || !targetName}
                            className={`w-full ${targetType === 'filmmaker' ? 'bg-red-600 hover:bg-red-700 shadow-red-900/40' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/40'} text-white font-black py-6 rounded-2xl uppercase tracking-[0.3em] text-xs shadow-2xl active:scale-95 transition-all disabled:opacity-20`}
                        >
                            {isGenerating ? 'Synthesizing Node...' : `Authorize ${targetType} Terminal`}
                        </button>
                    </form>

                    {generatedKey && (
                        <div className="p-8 bg-green-500/10 border border-green-500/20 rounded-[2.5rem] animate-[slideInUp_0.4s_ease-out] space-y-6 text-center shadow-inner">
                            <p className="text-[10px] font-black text-green-500 uppercase tracking-[0.4em]">Node Access Token Issued</p>
                            <code className="block text-5xl font-black text-white tracking-[0.2em] italic select-all cursor-pointer" onClick={() => { navigator.clipboard.writeText(generatedKey); alert('Key Copied.'); }}>{generatedKey}</code>
                            <p className="text-[9px] text-gray-500 leading-relaxed uppercase max-w-sm mx-auto">Filmmaker/Manager can use this key to login at <strong className="text-white">cratetv.net/admin</strong> and execute their own 70% disbursement.</p>
                        </div>
                    )}
                </section>

                {/* ACTIVE KEYS TABLE */}
                <section className="bg-[#0f0f0f] border border-white/5 rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                        <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest">Active Terminal Handshakes</h3>
                        <span className="text-[9px] font-black bg-red-600/10 text-red-500 px-3 py-1 rounded-full uppercase">Monitoring</span>
                    </div>
                    <div className="overflow-x-auto flex-grow">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-black text-gray-700 uppercase font-black tracking-widest">
                                <tr>
                                    <th className="p-6">Node Identity</th>
                                    <th className="p-6">Terminal Key</th>
                                    <th className="p-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {payouts.filter(p => p.status === 'ACTIVE').length === 0 ? (
                                    <tr><td colSpan={3} className="p-24 text-center text-gray-800 font-black uppercase tracking-[0.5em] italic">No active handshake tokens</td></tr>
                                ) : payouts.filter(p => p.status === 'ACTIVE').map(p => (
                                    <tr key={p.id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="p-6">
                                            <p className="font-black text-white uppercase text-base tracking-tight italic">{p.directorName}</p>
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border mt-2 inline-block ${p.payoutMethod === 'festival' ? 'text-indigo-500 border-indigo-500/30 bg-indigo-500/5' : 'text-red-500 border-red-500/30 bg-red-500/5'}`}>
                                                {p.payoutMethod || 'Filmmaker'} Node
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <code className="text-gray-500 font-mono font-bold tracking-widest bg-white/5 px-3 py-2 rounded-lg border border-white/10 group-hover:text-red-500 group-hover:border-red-600/20 transition-all">{p.id.substring(0, 10)}...</code>
                                        </td>
                                        <td className="p-6 text-right">
                                            <button onClick={() => handleRevokeKey(p.id)} className="text-[10px] font-black uppercase text-gray-700 hover:text-red-500 transition-colors bg-white/5 px-4 py-2 rounded-xl border border-white/5">Revoke Access</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
            
            <div className="bg-[#0f0f0f] border border-white/5 p-12 rounded-[4rem] shadow-2xl">
                 <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Disbursement History</h2>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Global Payout Audit Stream</p>
                 </div>
                 <div className="bg-black border border-white/10 rounded-[2.5rem] overflow-hidden">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-white/5 text-gray-700 uppercase font-black tracking-widest">
                            <tr>
                                <th className="p-6">Entity Identity</th>
                                <th className="p-6">Yield Paid (70%)</th>
                                <th className="p-6">Node Protocol</th>
                                <th className="p-6 text-right">Sync Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {payouts.filter(p => p.status === 'completed').length === 0 ? (
                                <tr><td colSpan={4} className="p-20 text-center text-gray-800 font-black uppercase tracking-[0.5em] italic">Handshake archive empty</td></tr>
                            ) : payouts.filter(p => p.status === 'completed').map(p => (
                                <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="p-6">
                                        <p className="font-black text-white uppercase text-base">{p.directorName}</p>
                                        <p className="text-[8px] text-gray-600 uppercase mt-1 tracking-widest">VERIFIED_DISPATCH</p>
                                    </td>
                                    <td className="p-6">
                                        <p className="text-green-500 font-black text-xl italic tracking-tighter">{formatCurrency(p.amount)}</p>
                                    </td>
                                    <td className="p-6">
                                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${p.payoutMethod === 'festival' ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' : 'bg-red-600/10 border-red-500/20 text-red-400'}`}>
                                            {p.payoutMethod || 'Filmmaker'} Handshake
                                        </span>
                                    </td>
                                    <td className="p-6 text-right text-gray-500 font-mono">
                                        {p.completionDate?.seconds ? new Date(p.completionDate.seconds * 1000).toLocaleString() : '---'}
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

export default AdminPayoutsTab;