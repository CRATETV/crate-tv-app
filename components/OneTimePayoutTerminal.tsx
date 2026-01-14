import React, { useState, useEffect, useMemo } from 'react';
import { Movie, FilmmakerAnalytics } from '../types';
import LoadingSpinner from './LoadingSpinner';

const formatCurrency = (amountInCents: number) => `$${((amountInCents || 0) / 100).toFixed(2)}`;

interface OneTimePayoutTerminalProps {
    directorName: string;
    onLogout: () => void;
    movies: Record<string, Movie>;
}

const OneTimePayoutTerminal: React.FC<OneTimePayoutTerminalProps> = ({ directorName, onLogout, movies }) => {
    const [analytics, setAnalytics] = useState<FilmmakerAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch('/api/get-filmmaker-analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ directorName }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Downlink failed.');
                setAnalytics(data.analytics);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Uplink failed.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAnalytics();
    }, [directorName]);

    const handleAuthorizePayout = async () => {
        if (!analytics || analytics.balance < 100) return;
        if (!window.confirm("AUTHORIZE FINAL DISBURSEMENT: Confirm your details. Upon completion, this terminal will self-terminate and access will be revoked permanently. Continue?")) return;

        setIsProcessing(true);
        const password = sessionStorage.getItem('adminPassword');

        try {
            const res = await fetch('/api/execute-one-time-payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, directorName }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Disbursement rejected.');

            alert("Handshake Complete. Funds successfully dispatched to your linked node. TERMINATING SESSION...");
            onLogout();
        } catch (err) {
            alert(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
            setIsProcessing(false);
        }
    };

    const handleDownloadLedger = () => {
        if (!analytics) return;
        const headers = ["Film Title", "Total Views", "Total Likes", "Net Earnings (70%)"];
        const rows = analytics.films.map(f => [
            `"${f.title.replace(/"/g, '""')}"`,
            f.views,
            f.likes,
            (f.totalEarnings / 100).toFixed(2)
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `CrateTV_FinalLedger_${directorName.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>;
    if (error) return <div className="p-12 text-center text-red-500 font-black uppercase">{error}</div>;
    if (!analytics) return null;

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-[fadeIn_0.6s_ease-out]">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-10 gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_red]"></div>
                        <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px]">Restricted Payout Terminal</p>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-none">Yield Summary.</h1>
                    <p className="text-gray-500 mt-4 text-sm font-bold uppercase tracking-widest">Authorized node for: <span className="text-white">{directorName}</span></p>
                </div>
                <button onClick={onLogout} className="bg-white/5 text-gray-500 hover:text-white px-8 py-3 rounded-xl uppercase text-[10px] font-black border border-white/5 transition-all">Terminate session</button>
            </header>

            <div className="bg-red-600/10 border border-red-500/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8">
                 <div className="space-y-2">
                    <h3 className="text-xl font-black text-red-500 uppercase tracking-tight">Access Protocol Notice</h3>
                    <p className="text-gray-300 text-sm leading-relaxed font-medium">This terminal is strictly for one-time disbursement. Upon clicking <strong className="text-white">"Authorize Disbursement"</strong>, your access code will be permanently invalidated. Please download your transaction records before proceeding.</p>
                 </div>
                 <button onClick={handleDownloadLedger} className="bg-white text-black font-black px-8 py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition-all flex-shrink-0">Download Record (.csv)</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] text-center shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Net Generated</p>
                    <p className="text-5xl font-black text-white italic tracking-tighter">{formatCurrency(analytics.totalDonations + analytics.totalAdRevenue)}</p>
                 </div>
                 <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] text-center shadow-2xl">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Already Dispatched</p>
                    <p className="text-5xl font-black text-gray-600 italic tracking-tighter">{formatCurrency(analytics.totalPaidOut)}</p>
                 </div>
                 <div className="bg-[#0f0f0f] border-2 border-green-500/30 p-10 rounded-[3rem] text-center shadow-[0_0_50px_rgba(34,197,94,0.1)]">
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Available to Withdraw</p>
                    <p className="text-5xl font-black text-green-400 italic tracking-tighter">{formatCurrency(analytics.balance)}</p>
                 </div>
            </div>

            <div className="bg-[#0f0f0f] border border-white/5 p-12 rounded-[4rem] shadow-2xl text-center space-y-10">
                <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Disbursement Confirmation</h2>
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Calculated Net Entitlement (70% Share)</p>
                </div>
                <button 
                    onClick={handleAuthorizePayout}
                    disabled={isProcessing || analytics.balance < 100}
                    className="group relative bg-white text-black font-black px-20 py-8 rounded-[2.5rem] text-2xl md:text-4xl uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-[0_40px_80px_rgba(255,255,255,0.1)] disabled:opacity-20"
                >
                    <span className="relative z-10">{isProcessing ? 'Processing Handshake...' : `Authorize ${formatCurrency(analytics.balance)} Dispatch`}</span>
                    <div className="absolute inset-0 bg-green-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-10"></div>
                </button>
            </div>

            <div className="space-y-8">
                <h3 className="text-sm font-black text-gray-700 uppercase tracking-[0.6em] border-l-4 border-red-600 pl-6">Final Performance Manifest</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {analytics.films.map(film => (
                        <div key={film.key} className="bg-white/[0.01] border border-white/5 p-8 rounded-3xl flex gap-6 hover:border-white/10 transition-all">
                            <img src={movies[film.key]?.poster} className="w-16 h-24 object-cover rounded-xl shadow-xl" alt="" />
                            <div>
                                <h4 className="text-xl font-black text-white uppercase tracking-tight italic">{film.title}</h4>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-3">
                                    <div><p className="text-[8px] text-gray-500 font-black uppercase">Views</p><p className="text-sm font-bold">{film.views}</p></div>
                                    <div><p className="text-[8px] text-gray-500 font-black uppercase">Applauds</p><p className="text-sm font-bold">{film.likes}</p></div>
                                    <div className="col-span-2 pt-2 border-t border-white/5"><p className="text-[8px] text-green-700 font-black uppercase">Your 70% Share</p><p className="text-lg font-bold text-green-500">{formatCurrency(film.totalEarnings)}</p></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OneTimePayoutTerminal;