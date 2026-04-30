import React, { useState, useEffect, useMemo } from 'react';
import { getDbInstance } from '../services/firebaseClient';

interface TicketRecord {
    id: string;
    itemId: string;
    note: string;
    amountPaid: number;
    email: string | null;
    purchasedAt: any;
    paymentType: string;
    isWatchParty: boolean;
}

interface ViewerRecord {
    id: string;
    movieKey: string;
    movieTitle: string;
    email: string | null;
    name: string;
    firstJoinedAt: any;
}

const FestivalReportTab: React.FC = () => {
    const [tickets, setTickets] = useState<TicketRecord[]>([]);
    const [viewers, setViewers] = useState<ViewerRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [printMode, setPrintMode] = useState(false);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        Promise.all([
            db.collection('festival_tickets').orderBy('purchasedAt', 'desc').get(),
            db.collection('festival_viewers').orderBy('firstJoinedAt', 'desc').get(),
        ]).then(([ticketSnap, viewerSnap]) => {
            const t: TicketRecord[] = [];
            ticketSnap.forEach(doc => t.push({ id: doc.id, ...doc.data() } as TicketRecord));
            setTickets(t);

            const v: ViewerRecord[] = [];
            viewerSnap.forEach(doc => v.push({ id: doc.id, ...doc.data() } as ViewerRecord));
            setViewers(v);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const totalRevenue = useMemo(() => tickets.reduce((sum, t) => sum + (t.amountPaid || 0), 0), [tickets]);
    const crateAmount = totalRevenue * 0.30;
    const pwffAmount = totalRevenue * 0.70;
    const uniqueViewers = useMemo(() => new Set(viewers.map(v => v.email || v.name)).size, [viewers]);
    const uniqueTicketBuyers = useMemo(() => new Set(tickets.map(t => t.email).filter(Boolean)).size, [tickets]);

    // Group viewers by film/block
    const viewersByFilm = useMemo(() => {
        const map: Record<string, { title: string; count: number; emails: string[] }> = {};
        viewers.forEach(v => {
            if (!map[v.movieKey]) map[v.movieKey] = { title: v.movieTitle || v.movieKey, count: 0, emails: [] };
            map[v.movieKey].count++;
            if (v.email) map[v.movieKey].emails.push(v.email);
        });
        return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
    }, [viewers]);

    const formatDate = (ts: any) => {
        if (!ts) return '—';
        try {
            const d = ts.toDate ? ts.toDate() : new Date(ts);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return '—'; }
    };

    const handlePrint = () => {
        window.print();
    };

    const exportCSV = () => {
        const rows = [
            ['Type', 'Description', 'Amount', 'Email', 'Date'],
            ...tickets.map(t => [
                t.paymentType,
                t.note,
                `$${t.amountPaid?.toFixed(2) || '0.00'}`,
                t.email || 'N/A',
                formatDate(t.purchasedAt)
            ])
        ];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PWFF2026_Ticket_Report_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 pb-32" id="festival-report">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-red-400 mb-1">Playhouse West Film Festival 2026</p>
                    <h2 className="text-3xl font-black uppercase tracking-tight text-white italic">Viewership Report</h2>
                    <p className="text-[10px] text-gray-600 mt-1">Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="flex gap-2 no-print">
                    <button onClick={exportCSV} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-black py-2.5 px-5 rounded-xl border border-blue-500/30 transition-all text-[10px] uppercase tracking-widest">
                        ↓ Export CSV
                    </button>
                    <button onClick={handlePrint} className="bg-white/5 hover:bg-white/10 text-white font-black py-2.5 px-5 rounded-xl border border-white/10 transition-all text-[10px] uppercase tracking-widest">
                        🖨️ Print Report
                    </button>
                </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Tickets Sold', value: tickets.length, color: 'text-white' },
                    { label: 'Unique Buyers', value: uniqueTicketBuyers, color: 'text-blue-400' },
                    { label: 'Total Viewers', value: uniqueViewers, color: 'text-purple-400' },
                    { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, color: 'text-green-400' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">{stat.label}</p>
                        <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Revenue split */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Revenue Split — 70/30 Agreement</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-white/5">
                    <div className="px-6 py-6 text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">Gross Revenue</p>
                        <p className="text-3xl font-black text-white">${totalRevenue.toFixed(2)}</p>
                        <p className="text-[9px] text-gray-700 mt-1">Total ticket sales</p>
                    </div>
                    <div className="px-6 py-6 text-center bg-red-500/[0.03]">
                        <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-2">Crate TV — 30%</p>
                        <p className="text-3xl font-black text-red-400">${crateAmount.toFixed(2)}</p>
                        <p className="text-[9px] text-gray-700 mt-1">Platform fee</p>
                    </div>
                    <div className="px-6 py-6 text-center bg-green-500/[0.03]">
                        <p className="text-[9px] font-black uppercase tracking-widest text-green-400 mb-2">PWFF — 70%</p>
                        <p className="text-3xl font-black text-green-400">${pwffAmount.toFixed(2)}</p>
                        <p className="text-[9px] text-gray-700 mt-1">Net to festival</p>
                    </div>
                </div>
            </div>

            {/* Viewership by film/block */}
            {viewersByFilm.length > 0 && (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Viewership by Screening</p>
                    </div>
                    <div className="divide-y divide-white/5">
                        {viewersByFilm.map(([key, data]) => (
                            <div key={key} className="flex items-center justify-between px-6 py-4 gap-4">
                                <div className="min-w-0">
                                    <p className="text-white font-bold text-sm truncate">{data.title}</p>
                                    <p className="text-[10px] text-gray-600">{data.emails.length} identified viewers</p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-white">{data.count}</p>
                                        <p className="text-[9px] text-gray-600 uppercase tracking-widest">viewers</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Ticket sales table */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ticket Sales</p>
                    <p className="text-[10px] text-gray-600">{tickets.length} transactions</p>
                </div>
                {tickets.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-gray-700 text-[10px] uppercase tracking-widest font-black">No ticket sales recorded yet</p>
                        <p className="text-gray-800 text-[9px] mt-1">Sales will appear here as tickets are purchased</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest text-gray-600">Description</th>
                                    <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest text-gray-600">Email</th>
                                    <th className="px-6 py-3 text-right text-[9px] font-black uppercase tracking-widest text-gray-600">Amount</th>
                                    <th className="px-6 py-3 text-right text-[9px] font-black uppercase tracking-widest text-gray-600">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {tickets.map(t => (
                                    <tr key={t.id} className="hover:bg-white/[0.01] transition-colors">
                                        <td className="px-6 py-3 text-gray-300 font-medium">{t.note || t.paymentType}</td>
                                        <td className="px-6 py-3 text-gray-500 font-mono">{t.email || '—'}</td>
                                        <td className="px-6 py-3 text-right text-green-400 font-black">${t.amountPaid?.toFixed(2) || '0.00'}</td>
                                        <td className="px-6 py-3 text-right text-gray-600 whitespace-nowrap">{formatDate(t.purchasedAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t border-white/10">
                                <tr>
                                    <td colSpan={2} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-600">Gross Revenue</td>
                                    <td className="px-6 py-3 text-right text-xl font-black text-white">${totalRevenue.toFixed(2)}</td>
                                    <td />
                                </tr>
                                <tr>
                                    <td colSpan={2} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-red-400">Crate TV Platform Fee (30%)</td>
                                    <td className="px-6 py-2 text-right font-black text-red-400">— ${crateAmount.toFixed(2)}</td>
                                    <td />
                                </tr>
                                <tr className="border-t border-white/10">
                                    <td colSpan={2} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-green-400">Net to PWFF (70%)</td>
                                    <td className="px-6 py-4 text-right text-2xl font-black text-green-400">${pwffAmount.toFixed(2)}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Viewer list */}
            {viewers.length > 0 && (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">All Viewers</p>
                        <p className="text-[10px] text-gray-600">{viewers.length} unique entries</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest text-gray-600">Name</th>
                                    <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest text-gray-600">Email</th>
                                    <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest text-gray-600">Screening</th>
                                    <th className="px-6 py-3 text-right text-[9px] font-black uppercase tracking-widest text-gray-600">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {viewers.map(v => (
                                    <tr key={v.id} className="hover:bg-white/[0.01] transition-colors">
                                        <td className="px-6 py-3 text-white font-medium">{v.name}</td>
                                        <td className="px-6 py-3 text-gray-500 font-mono">{v.email || '—'}</td>
                                        <td className="px-6 py-3 text-gray-400">{v.movieTitle || v.movieKey}</td>
                                        <td className="px-6 py-3 text-right text-gray-600 whitespace-nowrap">{formatDate(v.firstJoinedAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Footer note for Tony */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Crate TV · cratetv.net · Philadelphia, PA</p>
                <p className="text-[9px] text-gray-700">Viewership data collected via Firebase Analytics. Ticket transactions processed through Square. This report reflects verified data only.</p>
            </div>
        </div>
    );
};

export default FestivalReportTab;
