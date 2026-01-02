import React, { useState, useEffect, useMemo } from 'react';
import { PromoCode, Movie, FilmBlock, User } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';

interface PromoCodeManagerProps {
    isAdmin: boolean;
    filmmakerName?: string;
    targetFilms?: Movie[];
    targetBlocks?: FilmBlock[];
    defaultItemId?: string; // New prop for context-aware initialization
}

const DistributeModal: React.FC<{
    code: PromoCode;
    itemName: string;
    filmmakers: User[];
    onClose: () => void;
}> = ({ code, itemName, filmmakers, onClose }) => {
    const [email, setEmail] = useState('');
    const [customMessage, setCustomMessage] = useState('We are excited to have you as part of Crate Fest! Here is your exclusive access code to join the party.');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [searchTerm, setSearchTerm] = useState('');
    const [bulkDispatch, setBulkDispatch] = useState(false);

    const filteredFilmmakers = useMemo(() => {
        if (!searchTerm) return [];
        return filmmakers.filter(f => 
            (f.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (f.email || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5);
    }, [filmmakers, searchTerm]);

    const handleSend = async () => {
        setStatus('sending');
        const password = sessionStorage.getItem('adminPassword');
        
        const recipients = bulkDispatch ? filmmakers.map(f => f.email).filter(Boolean) as string[] : [email];
        
        try {
            const batchSize = 10;
            for (let i = 0; i < recipients.length; i += batchSize) {
                const batch = recipients.slice(i, i + batchSize);
                const promises = batch.map(recipientEmail => 
                    fetch('/api/send-promo-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            password,
                            email: recipientEmail,
                            code: code.code,
                            itemName,
                            discountType: code.type,
                            discountValue: code.discountValue,
                            customMessage
                        })
                    })
                );
                await Promise.all(promises);
            }
            setStatus('success');
            setTimeout(onClose, 2000);
        } catch (e) {
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-[#111] rounded-[2.5rem] border border-white/10 shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-8">
                    {status === 'success' ? (
                        <div className="text-center py-10 space-y-4">
                            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Voucher Dispatched</h3>
                            <p className="text-gray-400 text-sm">Access key has been delivered to {bulkDispatch ? 'all selection' : email}.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Distribute Voucher</h3>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">CODE: {code.code} // TARGET: {itemName}</p>
                                </div>
                                <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Bulk Invite</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={bulkDispatch} onChange={(e) => setBulkDispatch(e.target.checked)} className="sr-only peer" />
                                        <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {!bulkDispatch ? (
                                    <div className="relative">
                                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">Recipient Filmmaker</label>
                                        <input 
                                            type="text" 
                                            placeholder="Search by name or email..." 
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="form-input !bg-white/5 border-white/10 mb-2"
                                        />
                                        {filteredFilmmakers.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 bg-[#181818] border border-white/10 rounded-xl mt-1 shadow-2xl z-10 overflow-hidden">
                                                {filteredFilmmakers.map(f => (
                                                    <button 
                                                        key={f.uid}
                                                        onClick={() => { setEmail(f.email || ''); setSearchTerm(f.name || ''); }}
                                                        className="w-full text-left p-3 hover:bg-white/5 text-sm flex justify-between"
                                                    >
                                                        <span className="font-bold">{f.name}</span>
                                                        <span className="text-gray-500 text-xs">{f.email}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <input 
                                            type="email" 
                                            placeholder="Or type custom email address..." 
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="form-input !bg-white/5 border-white/10"
                                        />
                                    </div>
                                ) : (
                                    <div className="bg-red-600/10 border border-red-500/20 p-4 rounded-xl">
                                        <p className="text-xs font-black text-red-500 uppercase tracking-widest">⚠️ Broadcaster Engaged</p>
                                        <p className="text-[10px] text-gray-400 mt-1">This will send the code to all {filmmakers.length} registered filmmakers in the database. Use for major event invitations.</p>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">Personal Message (Optional)</label>
                                    <textarea 
                                        placeholder="Include a personal note for the creator..." 
                                        value={customMessage}
                                        onChange={e => setCustomMessage(e.target.value)}
                                        className="form-input !bg-white/5 border-white/10 h-24"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button onClick={onClose} className="flex-1 text-gray-500 font-black uppercase text-[10px] tracking-widest">Cancel</button>
                                <button 
                                    onClick={handleSend}
                                    disabled={(!email && !bulkDispatch) || status === 'sending'}
                                    className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest shadow-xl transition-all disabled:opacity-30"
                                >
                                    {status === 'sending' ? (bulkDispatch ? 'Broadcasting...' : 'Dispatching...') : (bulkDispatch ? `Invite All (${filmmakers.length})` : 'Send Access Key')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const PromoCodeManager: React.FC<PromoCodeManagerProps> = ({ isAdmin, filmmakerName, targetFilms = [], targetBlocks = [], defaultItemId = '' }) => {
    const [codes, setCodes] = useState<PromoCode[]>([]);
    const [filmmakers, setFilmmakers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Distribution State
    const [distributingCode, setDistributingCode] = useState<PromoCode | null>(null);
    
    // Form State
    const [newCode, setNewCode] = useState('');
    const [type, setType] = useState<'one_time_access' | 'discount'>('one_time_access');
    const [discountValue, setDiscountValue] = useState(100);
    const [maxUses, setMaxUses] = useState(1);
    const [selectedItemId, setSelectedItemId] = useState(defaultItemId);

    const fetchCodes = async () => {
        const db = getDbInstance();
        if (!db) return;
        
        let query: any = db.collection('promo_codes');
        if (!isAdmin && filmmakerName) {
            query = query.where('createdBy', '==', filmmakerName);
        }

        const snapshot = await query.orderBy('createdAt', 'desc').get();
        const fetched = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as PromoCode));
        setCodes(fetched);
        setIsLoading(false);
    };

    const fetchFilmmakers = async () => {
        if (!isAdmin) return;
        const db = getDbInstance();
        if (!db) return;
        const snapshot = await db.collection('users').where('isFilmmaker', '==', true).get();
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
        setFilmmakers(users);
    };

    useEffect(() => {
        fetchCodes();
        fetchFilmmakers();
    }, [isAdmin, filmmakerName]);

    const handleCreateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCode.trim()) return;
        
        setIsGenerating(true);
        const db = getDbInstance();
        if (!db) return;

        const codeData: Omit<PromoCode, 'id'> = {
            code: newCode.toUpperCase().trim().replace(/\s/g, ''),
            type,
            discountValue: type === 'one_time_access' ? 100 : discountValue,
            maxUses: type === 'one_time_access' ? maxUses : (maxUses > 1 ? maxUses : 1000), 
            usedCount: 0,
            itemId: selectedItemId || undefined,
            createdBy: isAdmin ? 'admin' : (filmmakerName || 'unknown'),
            createdAt: new Date()
        };

        try {
            await db.collection('promo_codes').doc(codeData.code).set(codeData);
            setNewCode('');
            // Only reset item if no default was provided
            if (!defaultItemId) setSelectedItemId('');
            await fetchCodes();
        } catch (err) {
            alert("Error generating code. Name may be taken.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Revoke this voucher immediately?")) return;
        const db = getDbInstance();
        if (db) {
            await db.collection('promo_codes').doc(id).delete();
            await fetchCodes();
        }
    };

    const resolveItemName = (itemId?: string) => {
        if (!itemId) return "All Platform Access";
        const film = targetFilms.find(f => f.key === itemId);
        if (film) return film.title;
        const block = targetBlocks.find(b => b.id === itemId);
        if (block) return block.title;
        return "Specific Content";
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Form */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleCreateCode} className="bg-gray-900 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Code Laboratory</h3>
                            <p className="text-xs text-gray-500 uppercase font-black tracking-widest mt-1">Forging access vectors</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="form-label">Custom Code Name</label>
                                <input 
                                    type="text" 
                                    value={newCode} 
                                    onChange={e => setNewCode(e.target.value.toUpperCase())} 
                                    placeholder="e.g. VIPPASS" 
                                    className="form-input !bg-black/40 border-white/10 uppercase tracking-widest font-black" 
                                    required 
                                />
                            </div>

                            <div>
                                <label className="form-label">Voucher Class</label>
                                <select value={type} onChange={e => setType(e.target.value as any)} className="form-input !bg-black/40 border-white/10">
                                    <option value="one_time_access">VIP Invitation (100% OFF)</option>
                                    <option value="discount">Platform Discount</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.3s_ease-out]">
                                {type === 'discount' && (
                                    <div>
                                        <label className="form-label">Discount %</label>
                                        <input type="number" value={discountValue} onChange={e => setDiscountValue(parseInt(e.target.value))} className="form-input !bg-black/40" />
                                    </div>
                                )}
                                <div className={type !== 'discount' ? 'col-span-2' : ''}>
                                    <label className="form-label">Total Redeemable</label>
                                    <input type="number" value={maxUses} onChange={e => setMaxUses(parseInt(e.target.value))} className="form-input !bg-black/40" />
                                </div>
                            </div>

                            {!defaultItemId && (
                                <div>
                                    <label className="form-label">Target Content (Optional)</label>
                                    <select 
                                        value={selectedItemId} 
                                        onChange={e => setSelectedItemId(e.target.value)} 
                                        className="form-input !bg-black/40 border-white/10"
                                    >
                                        <option value="">Full Catalog Access</option>
                                        {targetBlocks.length > 0 && <optgroup label="Festival Blocks">
                                            {targetBlocks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                        </optgroup>}
                                        {targetFilms.length > 0 && <optgroup label="Individual Films">
                                            {targetFilms.map(f => <option key={f.key} value={f.key}>{f.title}</option>)}
                                        </optgroup>}
                                    </select>
                                </div>
                            )}
                        </div>

                        <button 
                            type="submit" 
                            disabled={isGenerating}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-30 shadow-xl"
                        >
                            {isGenerating ? 'Forging Code...' : 'Initialize Code'}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2">
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden h-full">
                        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                             <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Access Perimeter Manifest</h4>
                             <span className="text-[10px] text-gray-700 font-bold uppercase tracking-widest">Ready for Distribution</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="text-gray-500 font-black uppercase tracking-widest bg-black/40">
                                    <tr>
                                        <th className="p-5">Vector Code</th>
                                        <th className="p-5">Logic</th>
                                        <th className="p-5 text-center">Velocity</th>
                                        <th className="p-5 text-right">Admin Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {codes.length === 0 ? (
                                        <tr><td colSpan={4} className="p-10 text-center text-gray-600 uppercase font-black tracking-widest">No active access vectors</td></tr>
                                    ) : codes.map(c => (
                                        <tr key={c.id} className="hover:bg-white/[0.01] transition-colors group">
                                            <td className="p-5">
                                                <div className="space-y-1">
                                                    <p className="font-black text-white tracking-[0.2em] group-hover:text-red-500 transition-colors">{c.code}</p>
                                                    <p className="text-[9px] text-gray-600 uppercase font-bold tracking-tighter">{resolveItemName(c.itemId)}</p>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${c.type === 'one_time_access' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' : 'bg-blue-600/20 text-blue-400 border border-blue-500/20'}`}>
                                                    {c.type === 'one_time_access' ? 'VIP INVITE' : `${c.discountValue}% PLATFORM`}
                                                </span>
                                            </td>
                                            <td className="p-5 text-center font-mono">
                                                <span className={c.usedCount >= c.maxUses ? 'text-red-500' : 'text-green-500 font-bold'}>
                                                    {c.usedCount} / {c.maxUses}
                                                </span>
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="flex justify-end items-center gap-4">
                                                    {isAdmin && (
                                                        <button 
                                                            onClick={() => setDistributingCode(c)}
                                                            className="bg-white/5 hover:bg-white text-gray-400 hover:text-black font-black px-4 py-1.5 rounded-lg border border-white/10 transition-all uppercase text-[9px] tracking-widest"
                                                        >
                                                            Distribute
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(c.id)} className="text-[9px] font-black uppercase text-gray-600 hover:text-red-500 transition-colors">Kill</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {distributingCode && (
                <DistributeModal 
                    code={distributingCode} 
                    itemName={resolveItemName(distributingCode.itemId)}
                    filmmakers={filmmakers}
                    onClose={() => setDistributingCode(null)}
                />
            )}
        </div>
    );
};

export default PromoCodeManager;