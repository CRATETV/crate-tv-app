
import React, { useState, useEffect, useMemo } from 'react';
import { PromoCode, Movie, FilmBlock, User } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';
import firebase from 'firebase/compat/app';
import { promoCodesData } from '../constants';

interface PromoCodeManagerProps {
    isAdmin: boolean;
    filmmakerName?: string;
    targetFilms?: Movie[];
    targetBlocks?: any[]; 
    defaultItemId?: string; 
}

const FILMMAKER_QUOTA = 5;

const DistributeModal: React.FC<{
    code: PromoCode;
    itemName: string;
    users: User[];
    onClose: () => void;
}> = ({ code, itemName, users, onClose }) => {
    const [email, setEmail] = useState('');
    const [customMessage, setCustomMessage] = useState('We are excited to have you as part of Crate TV! Here is your exclusive access code.');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [searchTerm, setSearchTerm] = useState('');
    const [bulkDispatch, setBulkDispatch] = useState(false);
    const [targetSegment, setTargetSegment] = useState<'all' | 'filmmakers' | 'actors'>('all');

    const filteredUsers = useMemo(() => {
        if (!searchTerm || searchTerm.length < 2) return [];
        return users.filter(u => 
            (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 8);
    }, [users, searchTerm]);

    const targetRecipients = useMemo(() => {
        if (targetSegment === 'filmmakers') return users.filter(u => u.isFilmmaker);
        if (targetSegment === 'actors') return users.filter(u => u.isActor);
        return users;
    }, [users, targetSegment]);

    const handleSend = async () => {
        setStatus('sending');
        const password = sessionStorage.getItem('adminPassword');
        
        const recipients = bulkDispatch 
            ? targetRecipients.map(f => f.email).filter(Boolean) as string[] 
            : [email];
        
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
                            <p className="text-gray-400 text-sm">Access key delivered to {bulkDispatch ? `${targetRecipients.length} nodes` : email}.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Distribute Voucher</h3>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">CODE: {code.code} // TARGET: {itemName}</p>
                                </div>
                                <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Bulk Mode</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={bulkDispatch} onChange={(e) => setBulkDispatch(e.target.checked)} className="sr-only peer" />
                                        <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {!bulkDispatch ? (
                                    <div className="relative">
                                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">Search User Directory</label>
                                        <input 
                                            type="text" 
                                            placeholder="Find user or viewer..." 
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="form-input !bg-white/5 border-white/10 mb-2"
                                        />
                                        {filteredUsers.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 bg-[#181818] border border-white/10 rounded-xl mt-1 shadow-2xl z-10 overflow-hidden">
                                                {filteredUsers.map(u => (
                                                    <button 
                                                        key={u.uid}
                                                        onClick={() => { setEmail(u.email || ''); setSearchTerm(u.name || ''); }}
                                                        className="w-full text-left p-3 hover:bg-white/5 text-sm flex justify-between group"
                                                    >
                                                        <div>
                                                            <span className="font-bold text-white group-hover:text-red-500">{u.name}</span>
                                                            <span className="text-gray-500 text-[10px] ml-2 font-mono uppercase">{u.isFilmmaker ? 'Creator' : 'Viewer'}</span>
                                                        </div>
                                                        <span className="text-gray-500 text-xs">{u.email}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <input 
                                            type="email" 
                                            placeholder="Recipient email address..." 
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="form-input !bg-white/5 border-white/10"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase text-gray-500 block">Dispatch Segment</label>
                                        <div className="grid grid-cols-3 gap-2 p-1 bg-black rounded-xl border border-white/5">
                                            {(['all', 'filmmakers', 'actors'] as const).map(seg => (
                                                <button 
                                                    key={seg}
                                                    onClick={() => setTargetSegment(seg)}
                                                    className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${targetSegment === seg ? 'bg-red-600 text-white' : 'text-gray-600 hover:text-gray-300'}`}
                                                >
                                                    {seg}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="bg-red-600/10 border border-red-500/20 p-4 rounded-xl">
                                            <p className="text-xs font-black text-red-500 uppercase tracking-widest">⚠️ Segment Broadcast</p>
                                            <p className="text-[10px] text-gray-400 mt-1">This will send the code to all {targetRecipients.length} nodes in the "{targetSegment}" segment.</p>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">Custom Note</label>
                                    <textarea 
                                        placeholder="Add a personalized greeting..." 
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
                                    {status === 'sending' ? 'Broadcasting...' : (bulkDispatch ? `Send to ${targetRecipients.length}` : 'Dispatch Access')}
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
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    
    // Distribution State
    const [distributingCode, setDistributingCode] = useState<PromoCode | null>(null);
    
    // Form State
    const [newCode, setNewCode] = useState('');
    const [internalName, setInternalName] = useState('');
    const [type, setType] = useState<'one_time_access' | 'discount'>('one_time_access');
    const [discountValue, setDiscountValue] = useState(100);
    const [maxUses, setMaxUses] = useState(1);
    const [selectedItemId, setSelectedItemId] = useState(defaultItemId);
    const [codeAvailability, setCodeAvailability] = useState<'checking' | 'available' | 'taken' | 'idle'>('idle');

    const fetchCodes = async () => {
        const db = getDbInstance();
        if (!db) {
            setTimeout(() => setIsLoading(false), 2000);
            return;
        }
        
        try {
            let query: any = db.collection('promo_codes');
            if (!isAdmin && filmmakerName) {
                query = query.where('createdBy', '==', filmmakerName);
            }

            const snapshot = await query.get();
            const fetched = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as PromoCode));
            
            fetched.sort((a: PromoCode, b: PromoCode) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            setCodes(fetched);
        } catch (err) {
            console.error("Voucher Retrieval Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        if (!isAdmin) return;
        const db = getDbInstance();
        if (!db) return;
        try {
            const snapshot = await db.collection('users').get();
            const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
            setAllUsers(users);
        } catch (err) {
            console.error("User Retrieval Error:", err);
        }
    };

    useEffect(() => {
        fetchCodes();
        fetchUsers();
    }, [isAdmin, filmmakerName]);

    useEffect(() => {
        const checkAvailability = async () => {
            const cleanCode = newCode.toUpperCase().trim();
            if (cleanCode.length < 3) {
                setCodeAvailability('idle');
                return;
            }

            setCodeAvailability('checking');
            const db = getDbInstance();
            if (!db) return;

            try {
                const doc = await db.collection('promo_codes').doc(cleanCode).get();
                setCodeAvailability(doc.exists ? 'taken' : 'available');
            } catch (e) {
                setCodeAvailability('idle');
            }
        };

        const timer = setTimeout(checkAvailability, 500);
        return () => clearTimeout(timer);
    }, [newCode]);

    const quotaStatus = useMemo(() => {
        if (isAdmin) return null;
        if (!selectedItemId) return null;
        const usedCount = codes.filter(c => c.itemId === selectedItemId).length;
        return { used: usedCount, max: FILMMAKER_QUOTA };
    }, [codes, selectedItemId, isAdmin]);

    const isQuotaExceeded = !!(quotaStatus && quotaStatus.used >= quotaStatus.max);

    const handleGenerateRandomCode = () => {
        const random = Math.random().toString(36).substring(2, 7).toUpperCase();
        setNewCode(`CRATE-${random}`);
    };

    const handleRestoreDefaults = async () => {
        if (!window.confirm("RESTORE PROTOCOL: Synchronize hardcoded system vouchers from constants.ts into live database? This will restore classic codes like PULSE_25 and VIP_ACCESS.")) return;
        setIsRestoring(true);
        const db = getDbInstance();
        if (!db) return;

        try {
            const batch = db.batch();
            Object.entries(promoCodesData).forEach(([id, data]) => {
                const ref = db.collection('promo_codes').doc(id);
                batch.set(ref, {
                    ...data,
                    code: id,
                    usedCount: 0,
                    createdBy: 'system_restore',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            });
            await batch.commit();
            alert("System vouchers successfully restored.");
            await fetchCodes();
        } catch (e) {
            alert("Restore failed.");
        } finally {
            setIsRestoring(false);
        }
    };

    const handleCreateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanCode = newCode.toUpperCase().trim().replace(/\s/g, '');
        if (!cleanCode || isQuotaExceeded || codeAvailability === 'taken') return;
        
        setIsGenerating(true);
        const db = getDbInstance();
        if (!db) return;

        const codeData: Omit<PromoCode, 'id'> = {
            code: cleanCode,
            internalName: internalName.trim() || undefined,
            type,
            discountValue: type === 'one_time_access' ? 100 : discountValue,
            maxUses: maxUses > 0 ? maxUses : 1, 
            usedCount: 0,
            itemId: selectedItemId || undefined,
            createdBy: isAdmin ? 'admin' : (filmmakerName || 'unknown'),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('promo_codes').doc(codeData.code).set(codeData);
            setNewCode('');
            setInternalName('');
            if (!defaultItemId) setSelectedItemId('');
            setCodeAvailability('idle');
            await fetchCodes();
        } catch (err: any) {
            alert(err.message?.includes('permission') 
                ? "Access Denied: You cannot overwrite this code as it was created by another node." 
                : "Error generating code. Please try a different alias.");
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
        if (!itemId) return "Full Platform Access";
        if (itemId === 'crateFestPass') return "Crate Fest: All-Access Pass";
        const film = targetFilms.find(f => f.key === itemId);
        if (film) return `${film.title} (+ Watch Party)`;
        const block = targetBlocks.find(b => b.id === itemId);
        if (block) return block.title;
        return "Specific Content";
    };

    if (isLoading) return <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner />
        <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest animate-pulse">Initializing Voucher Repository...</p>
    </div>;

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 space-y-6">
                    <form onSubmit={handleCreateCode} className="bg-gray-900 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Voucher Forge</h3>
                                <p className="text-xs text-gray-500 uppercase font-black tracking-widest mt-1">Personalizing audience incentives</p>
                            </div>
                            <button 
                                type="button" 
                                onClick={handleGenerateRandomCode}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-gray-500 hover:text-red-500 transition-all"
                                title="Generate random unique code"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5V4H4zm0 11h5v5H4v-5zm11 0h5v5h-5v-5zm0-11h5v5h-5V4z" /></svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="form-label">Internal Name (Label / Campaign Name)</label>
                                <input 
                                    type="text" 
                                    value={internalName} 
                                    onChange={e => setInternalName(e.target.value)} 
                                    placeholder="e.g. VIP Press List 2025" 
                                    className="form-input !bg-black/40 border-white/10" 
                                    disabled={isQuotaExceeded}
                                />
                                <p className="text-[8px] text-gray-600 mt-1 uppercase font-bold tracking-widest">Internal reference for identifying this code.</p>
                            </div>

                            <div className="relative">
                                <label className="form-label">Voucher Alias (The Code Word)</label>
                                <input 
                                    type="text" 
                                    value={newCode} 
                                    onChange={e => setNewCode(e.target.value.toUpperCase())} 
                                    placeholder="e.g. PRESS-2025" 
                                    className={`form-input !bg-black/40 border-2 uppercase tracking-widest font-black ${codeAvailability === 'taken' ? 'border-red-600' : codeAvailability === 'available' ? 'border-green-600' : 'border-white/10'}`}
                                    required 
                                    disabled={isQuotaExceeded}
                                />
                                <div className="absolute right-4 top-[38px]">
                                    {codeAvailability === 'checking' && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                                    {codeAvailability === 'taken' && <span className="text-red-500 text-[10px] font-black">TAKEN</span>}
                                    {codeAvailability === 'available' && <span className="text-green-500 text-[10px] font-black">OK</span>}
                                </div>
                                <p className="text-[8px] text-gray-600 mt-1 uppercase font-bold tracking-widest">User redemption input string.</p>
                            </div>

                            <div>
                                <label className="form-label">Logic Model</label>
                                <select value={type} onChange={e => setType(e.target.value as any)} className="form-input !bg-black/40 border-white/10" disabled={isQuotaExceeded}>
                                    <option value="one_time_access">Gift Access (100% OFF)</option>
                                    <option value="discount">Campaign Discount (Percentage Base)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.3s_ease-out]">
                                {type === 'discount' && (
                                    <div>
                                        <label className="form-label">Discount %</label>
                                        <input type="number" value={discountValue} onChange={e => setDiscountValue(parseInt(e.target.value))} className="form-input !bg-black/40" />
                                    </div>
                                )}
                                <div className={type === 'one_time_access' ? 'col-span-2' : ''}>
                                    <label className="form-label">Global Usage Limit</label>
                                    <input type="number" value={maxUses} onChange={e => setMaxUses(parseInt(e.target.value))} className="form-input !bg-black/40" min="1" />
                                    <p className="text-[8px] text-gray-600 mt-1 uppercase font-bold tracking-widest">Total redemptions allowed.</p>
                                </div>
                            </div>

                            {!defaultItemId && (
                                <div>
                                    <label className="form-label">Attachment Scope</label>
                                    <select 
                                        value={selectedItemId} 
                                        onChange={e => setSelectedItemId(e.target.value)} 
                                        className="form-input !bg-black/40 border-white/10"
                                    >
                                        <option value="">Whole Platform (Global)</option>
                                        {isAdmin && <option value="crateFestPass">🎟️ Crate Fest: All-Access Pass</option>}
                                        {targetBlocks.length > 0 && <optgroup label="Festival Blocks">
                                            {targetBlocks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                        </optgroup>}
                                        {targetFilms.length > 0 && <optgroup label="Individual Films / Watch Parties">
                                            {targetFilms.map(f => <option key={f.key} value={f.key}>{f.title} (Live Event Incl.)</option>)}
                                        </optgroup>}
                                    </select>
                                </div>
                            )}

                            {quotaStatus && (
                                <div className={`p-4 rounded-xl border flex justify-between items-center ${isQuotaExceeded ? 'bg-red-600/10 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
                                    <span className="text-[10px] font-black uppercase text-gray-500">Filmmaker Quota</span>
                                    <span className={`text-[10px] font-black ${isQuotaExceeded ? 'text-red-500' : 'text-white'}`}>{quotaStatus.used} / {quotaStatus.max}</span>
                                </div>
                            )}
                        </div>

                        <button 
                            type="submit" 
                            disabled={isGenerating || isQuotaExceeded || codeAvailability === 'taken' || newCode.length < 3}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-30 shadow-xl"
                        >
                            {isGenerating ? 'Synthesizing...' : isQuotaExceeded ? 'Quota Reached' : codeAvailability === 'taken' ? 'Alias Occupied' : 'Initialize Voucher'}
                        </button>
                    </form>

                    {isAdmin && (
                         <div className="bg-[#0f0f0f] border border-indigo-500/20 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🔄</span>
                                <h4 className="text-lg font-black text-white uppercase tracking-tighter">System Recovery</h4>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">Restore standard platform vouchers from the master record. Includes VIP_ACCESS and PULSE_25.</p>
                            <button 
                                onClick={handleRestoreDefaults}
                                disabled={isRestoring}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl uppercase text-[9px] tracking-[0.2em] transition-all shadow-lg active:scale-95 disabled:opacity-20"
                            >
                                {isRestoring ? 'Restoring Nodes...' : 'Restore System Vouchers'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden h-full flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                             <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Active Vouchers Repository</h4>
                             <span className="text-[9px] text-green-500 font-black uppercase tracking-widest">Global Network Verified</span>
                        </div>
                        <div className="overflow-x-auto flex-grow">
                            <table className="w-full text-left text-xs">
                                <thead className="text-gray-500 font-black uppercase tracking-widest bg-black/40">
                                    <tr>
                                        <th className="p-5">Name & Alias</th>
                                        <th className="p-5">Logic Scope</th>
                                        <th className="p-5 text-center">Velocity</th>
                                        <th className="p-5 text-right">Dispatch</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {codes.length === 0 ? (
                                        <tr><td colSpan={4} className="p-16 text-center text-gray-700 uppercase font-black tracking-widest">No active access vectors detected</td></tr>
                                    ) : codes.map(c => {
                                        const isDepleted = c.usedCount >= c.maxUses;
                                        return (
                                            <tr key={c.id} className={`hover:bg-white/[0.01] transition-colors group ${isDepleted ? 'opacity-40 grayscale' : ''}`}>
                                                <td className="p-5">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-white text-base tracking-[0.2em] group-hover:text-red-500 transition-colors">{c.code}</p>
                                                            {c.internalName && (
                                                                <span className="text-[9px] bg-red-600/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-black uppercase">
                                                                    {c.internalName}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[9px] text-gray-600 uppercase font-bold tracking-tighter">{resolveItemName(c.itemId)}</p>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${c.type === 'one_time_access' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' : 'bg-blue-600/20 text-blue-400 border border-blue-500/20'}`}>
                                                        {c.type === 'one_time_access' ? 'VIP GIFT' : `${c.discountValue}% CAMPAIGN`}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-center font-mono">
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-[10px] font-black ${isDepleted ? 'text-red-500' : 'text-green-500'}`}>
                                                            {c.usedCount} / {c.maxUses}
                                                        </span>
                                                        <span className="text-[7px] text-gray-700 uppercase font-black mt-1">REDEEMED</span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="flex justify-end items-center gap-4">
                                                        {isAdmin && (
                                                            <button 
                                                                onClick={() => setDistributingCode(c)}
                                                                className="bg-white text-black font-black px-4 py-2 rounded-lg uppercase text-[9px] tracking-widest hover:bg-gray-200 transition-all shadow-lg"
                                                            >
                                                                Distribute
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDelete(c.id)} className="text-[9px] font-black uppercase text-gray-600 hover:text-red-500 transition-colors">Revoke</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
                    users={allUsers}
                    onClose={() => setDistributingCode(null)}
                />
            )}
        </div>
    );
};

export default PromoCodeManager;
