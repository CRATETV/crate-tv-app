import React, { useState, useEffect, useMemo } from 'react';
import { getDbInstance } from '../services/firebaseClient';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';

interface TicketCode {
    id: string;
    code: string;
    type: 'full_pass' | 'day_pass' | 'block';
    dayNumber?: number;
    blockId?: string;
    blockTitle?: string;
    recipientEmail?: string;
    recipientName?: string;
    notes?: string;
    isRedeemed: boolean;
    redeemedBy?: string;
    redeemedAt?: any;
    createdAt: any;
    createdBy: string;
    expiresAt?: string;
}

interface TicketCodesTabProps {
    festivalDays?: Array<{ day: number; date: string; blocks: Array<{ id: string; title: string }> }>;
}

/**
 * TICKET CODES TAB
 * 
 * Admin tool to generate and manage claim codes for in-person festival attendees.
 * 
 * Flow:
 * 1. User contacts you saying they bought an in-person ticket
 * 2. You verify their purchase
 * 3. You generate a code here (Full Pass, Day Pass, or Block)
 * 4. You send them the code (manually or auto-email)
 * 5. They redeem it at cratetv.net/claim
 */
const TicketCodesTab: React.FC<TicketCodesTabProps> = ({ festivalDays = [] }) => {
    const [codes, setCodes] = useState<TicketCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Filter state
    const [filterType, setFilterType] = useState<'all' | 'full_pass' | 'day_pass' | 'block'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'redeemed'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Generate form state
    const [showGenerateForm, setShowGenerateForm] = useState(false);
    const [newCodeType, setNewCodeType] = useState<'full_pass' | 'day_pass' | 'block'>('full_pass');
    const [selectedDay, setSelectedDay] = useState<number>(1);
    const [selectedBlockId, setSelectedBlockId] = useState<string>('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [notes, setNotes] = useState('');
    const [codeCount, setCodeCount] = useState(1);
    const [sendEmail, setSendEmail] = useState(false);

    // Load codes
    useEffect(() => {
        loadCodes();
    }, []);

    const loadCodes = async () => {
        setIsLoading(true);
        try {
            const db = getDbInstance();
            const codesRef = collection(db, 'ticket_codes');
            const q = query(codesRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const loadedCodes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as TicketCode[];
            setCodes(loadedCodes);
        } catch (err) {
            console.error('Error loading codes:', err);
            setError('Failed to load codes');
        } finally {
            setIsLoading(false);
        }
    };

    // Generate unique code
    const generateCodeString = (type: string): string => {
        const prefix = type === 'full_pass' ? 'FULL' : type === 'day_pass' ? 'DAY' : 'BLK';
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0/O, 1/I/L)
        let random = '';
        for (let i = 0; i < 6; i++) {
            random += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `CRATE-${prefix}-${random}`;
    };

    // Generate codes
    const handleGenerateCodes = async () => {
        setIsGenerating(true);
        setError('');
        setSuccess('');

        try {
            const db = getDbInstance();
            const codesRef = collection(db, 'ticket_codes');
            const generatedCodes: string[] = [];

            // Find block title if block type
            let blockTitle = '';
            if (newCodeType === 'block' && selectedBlockId) {
                for (const day of festivalDays) {
                    const block = day.blocks.find(b => b.id === selectedBlockId);
                    if (block) {
                        blockTitle = block.title;
                        break;
                    }
                }
            }

            for (let i = 0; i < codeCount; i++) {
                const codeString = generateCodeString(newCodeType);
                generatedCodes.push(codeString);

                const codeData: Omit<TicketCode, 'id'> = {
                    code: codeString,
                    type: newCodeType,
                    isRedeemed: false,
                    createdAt: new Date().toISOString(),
                    createdBy: 'admin', // Could be actual admin email
                    ...(newCodeType === 'day_pass' && { dayNumber: selectedDay }),
                    ...(newCodeType === 'block' && { blockId: selectedBlockId, blockTitle }),
                    ...(recipientEmail && codeCount === 1 && { recipientEmail }),
                    ...(recipientName && codeCount === 1 && { recipientName }),
                    ...(notes && codeCount === 1 && { notes }),
                };

                await addDoc(codesRef, codeData);
            }

            // Send email if requested and single code
            if (sendEmail && codeCount === 1 && recipientEmail) {
                await sendCodeEmail(recipientEmail, recipientName, generatedCodes[0], newCodeType, blockTitle);
            }

            setSuccess(`Generated ${codeCount} code${codeCount > 1 ? 's' : ''}: ${generatedCodes.join(', ')}`);
            setShowGenerateForm(false);
            resetForm();
            loadCodes();
        } catch (err) {
            console.error('Error generating codes:', err);
            setError('Failed to generate codes');
        } finally {
            setIsGenerating(false);
        }
    };

    const sendCodeEmail = async (email: string, name: string, code: string, type: string, blockTitle: string) => {
        try {
            await fetch('/api/send-individual-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    subject: '🎬 Your CrateFest Digital Access Code',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 16px;">
                            <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" style="height: 40px; margin-bottom: 24px;" />
                            <h1 style="color: #fff; font-size: 28px; margin-bottom: 16px;">Your Digital Access Code</h1>
                            <p style="color: #888; font-size: 16px; line-height: 1.6;">
                                Hi${name ? ` ${name}` : ''},<br/><br/>
                                Thank you for attending CrateFest! Here's your code to unlock digital access on cratetv.net:
                            </p>
                            <div style="background: linear-gradient(135deg, #dc2626, #7c3aed); padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
                                <p style="color: #fff; font-size: 14px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 2px;">Your Code</p>
                                <p style="color: #fff; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 0;">${code}</p>
                            </div>
                            <p style="color: #888; font-size: 14px; line-height: 1.6;">
                                <strong style="color: #fff;">This code unlocks:</strong> ${type === 'full_pass' ? 'Full Festival Pass (all films)' : type === 'day_pass' ? `Day ${selectedDay} Pass` : `Block: ${blockTitle}`}
                            </p>
                            <p style="color: #888; font-size: 14px; line-height: 1.6;">
                                <strong style="color: #fff;">To redeem:</strong><br/>
                                1. Go to <a href="https://cratetv.net/claim" style="color: #dc2626;">cratetv.net/claim</a><br/>
                                2. Create an account or log in<br/>
                                3. Enter your code<br/>
                                4. Enjoy the films!
                            </p>
                            <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;" />
                            <p style="color: #666; font-size: 12px;">
                                This code can only be used once. If you have any issues, reply to this email.
                            </p>
                        </div>
                    `
                })
            });
        } catch (err) {
            console.error('Error sending email:', err);
            // Don't fail the whole operation if email fails
        }
    };

    const resetForm = () => {
        setNewCodeType('full_pass');
        setSelectedDay(1);
        setSelectedBlockId('');
        setRecipientEmail('');
        setRecipientName('');
        setNotes('');
        setCodeCount(1);
        setSendEmail(false);
    };

    // Delete code
    const handleDeleteCode = async (codeId: string) => {
        if (!confirm('Are you sure you want to delete this code?')) return;
        
        try {
            const db = getDbInstance();
            await deleteDoc(doc(db, 'ticket_codes', codeId));
            setCodes(codes.filter(c => c.id !== codeId));
            setSuccess('Code deleted');
        } catch (err) {
            console.error('Error deleting code:', err);
            setError('Failed to delete code');
        }
    };

    // Copy code to clipboard
    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setSuccess(`Copied: ${code}`);
        setTimeout(() => setSuccess(''), 2000);
    };

    // Filtered codes
    const filteredCodes = useMemo(() => {
        return codes.filter(code => {
            if (filterType !== 'all' && code.type !== filterType) return false;
            if (filterStatus === 'active' && code.isRedeemed) return false;
            if (filterStatus === 'redeemed' && !code.isRedeemed) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                    code.code.toLowerCase().includes(q) ||
                    code.recipientEmail?.toLowerCase().includes(q) ||
                    code.recipientName?.toLowerCase().includes(q) ||
                    code.notes?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [codes, filterType, filterStatus, searchQuery]);

    // Stats
    const stats = useMemo(() => ({
        total: codes.length,
        active: codes.filter(c => !c.isRedeemed).length,
        redeemed: codes.filter(c => c.isRedeemed).length,
        fullPass: codes.filter(c => c.type === 'full_pass').length,
        dayPass: codes.filter(c => c.type === 'day_pass').length,
        block: codes.filter(c => c.type === 'block').length,
    }), [codes]);

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'full_pass': return 'Full Festival Pass';
            case 'day_pass': return 'Day Pass';
            case 'block': return 'Block Access';
            default: return type;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'full_pass': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'day_pass': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'block': return 'bg-green-500/20 text-green-400 border-green-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Ticket Codes</h2>
                    <p className="text-gray-400 text-sm mt-1">Generate claim codes for in-person festival attendees</p>
                </div>
                <button
                    onClick={() => setShowGenerateForm(true)}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
                >
                    <span className="text-xl">+</span> Generate Code
                </button>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
                    {error}
                    <button onClick={() => setError('')} className="float-right text-red-400 hover:text-red-300">×</button>
                </div>
            )}
            {success && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400">
                    {success}
                    <button onClick={() => setSuccess('')} className="float-right text-green-400 hover:text-green-300">×</button>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Total</p>
                    <p className="text-2xl font-black text-white">{stats.total}</p>
                </div>
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                    <p className="text-green-400 text-xs uppercase tracking-wider">Active</p>
                    <p className="text-2xl font-black text-green-400">{stats.active}</p>
                </div>
                <div className="bg-gray-500/10 rounded-xl p-4 border border-gray-500/20">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Redeemed</p>
                    <p className="text-2xl font-black text-gray-400">{stats.redeemed}</p>
                </div>
                <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                    <p className="text-purple-400 text-xs uppercase tracking-wider">Full Pass</p>
                    <p className="text-2xl font-black text-purple-400">{stats.fullPass}</p>
                </div>
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                    <p className="text-blue-400 text-xs uppercase tracking-wider">Day Pass</p>
                    <p className="text-2xl font-black text-blue-400">{stats.dayPass}</p>
                </div>
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                    <p className="text-green-400 text-xs uppercase tracking-wider">Block</p>
                    <p className="text-2xl font-black text-green-400">{stats.block}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <input
                    type="text"
                    placeholder="Search codes, emails, names..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500/50"
                />
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50"
                >
                    <option value="all">All Types</option>
                    <option value="full_pass">Full Pass</option>
                    <option value="day_pass">Day Pass</option>
                    <option value="block">Block</option>
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="redeemed">Redeemed</option>
                </select>
            </div>

            {/* Codes Table */}
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Code</th>
                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Type</th>
                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Recipient</th>
                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Created</th>
                                <th className="text-right text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCodes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-gray-500 py-12">
                                        No codes found. Generate your first code!
                                    </td>
                                </tr>
                            ) : (
                                filteredCodes.map((code) => (
                                    <tr key={code.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => copyCode(code.code)}
                                                className="font-mono font-bold text-white hover:text-red-400 transition-colors flex items-center gap-2"
                                                title="Click to copy"
                                            >
                                                {code.code}
                                                <span className="text-gray-500 text-xs">📋</span>
                                            </button>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getTypeColor(code.type)}`}>
                                                {getTypeLabel(code.type)}
                                            </span>
                                            {code.type === 'day_pass' && code.dayNumber && (
                                                <span className="text-gray-500 text-xs ml-2">Day {code.dayNumber}</span>
                                            )}
                                            {code.type === 'block' && code.blockTitle && (
                                                <span className="text-gray-500 text-xs ml-2">{code.blockTitle}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            {code.recipientEmail ? (
                                                <div>
                                                    <p className="text-white text-sm">{code.recipientName || 'Unknown'}</p>
                                                    <p className="text-gray-500 text-xs">{code.recipientEmail}</p>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 text-sm">Not assigned</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            {code.isRedeemed ? (
                                                <div>
                                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
                                                        Redeemed
                                                    </span>
                                                    {code.redeemedBy && (
                                                        <p className="text-gray-500 text-xs mt-1">{code.redeemedBy}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-gray-400 text-sm">
                                            {new Date(code.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <button
                                                onClick={() => copyCode(code.code)}
                                                className="text-gray-400 hover:text-white transition-colors p-2"
                                                title="Copy code"
                                            >
                                                📋
                                            </button>
                                            {!code.isRedeemed && (
                                                <button
                                                    onClick={() => handleDeleteCode(code.id)}
                                                    className="text-gray-400 hover:text-red-400 transition-colors p-2"
                                                    title="Delete code"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Generate Code Modal */}
            {showGenerateForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-lg p-6 animate-[scaleIn_0.2s_ease-out]">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6">Generate Code</h3>
                        
                        <div className="space-y-4">
                            {/* Code Type */}
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">Code Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['full_pass', 'day_pass', 'block'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setNewCodeType(type as any)}
                                            className={`py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                                                newCodeType === type
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                            }`}
                                        >
                                            {type === 'full_pass' ? 'Full Pass' : type === 'day_pass' ? 'Day Pass' : 'Block'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Day selector for day_pass */}
                            {newCodeType === 'day_pass' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Day Number</label>
                                    <select
                                        value={selectedDay}
                                        onChange={(e) => setSelectedDay(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                                    >
                                        {festivalDays.length > 0 ? (
                                            festivalDays.map(day => (
                                                <option key={day.day} value={day.day}>Day {day.day} - {day.date}</option>
                                            ))
                                        ) : (
                                            [1, 2, 3, 4, 5].map(d => (
                                                <option key={d} value={d}>Day {d}</option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            )}

                            {/* Block selector for block */}
                            {newCodeType === 'block' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Block</label>
                                    <select
                                        value={selectedBlockId}
                                        onChange={(e) => setSelectedBlockId(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                                    >
                                        <option value="">Select a block...</option>
                                        {festivalDays.flatMap(day => 
                                            day.blocks.map(block => (
                                                <option key={block.id} value={block.id}>
                                                    Day {day.day}: {block.title}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            )}

                            {/* Number of codes */}
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">Number of Codes</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={codeCount}
                                    onChange={(e) => setCodeCount(Math.max(1, Math.min(100, Number(e.target.value))))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                                />
                                <p className="text-gray-500 text-xs mt-1">Generate up to 100 codes at once for bulk distribution</p>
                            </div>

                            {/* Recipient info (only for single code) */}
                            {codeCount === 1 && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Recipient Email (optional)</label>
                                        <input
                                            type="email"
                                            value={recipientEmail}
                                            onChange={(e) => setRecipientEmail(e.target.value)}
                                            placeholder="attendee@email.com"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Recipient Name (optional)</label>
                                        <input
                                            type="text"
                                            value={recipientName}
                                            onChange={(e) => setRecipientName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Notes (optional)</label>
                                        <input
                                            type="text"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Purchased at venue, order #123"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500"
                                        />
                                    </div>
                                    {recipientEmail && (
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={sendEmail}
                                                onChange={(e) => setSendEmail(e.target.checked)}
                                                className="w-5 h-5 rounded bg-white/10 border-white/20 text-red-600 focus:ring-red-500"
                                            />
                                            <span className="text-white">Send code to recipient via email</span>
                                        </label>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowGenerateForm(false);
                                    resetForm();
                                }}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGenerateCodes}
                                disabled={isGenerating || (newCodeType === 'block' && !selectedBlockId)}
                                className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors"
                            >
                                {isGenerating ? 'Generating...' : `Generate ${codeCount} Code${codeCount > 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default TicketCodesTab;
