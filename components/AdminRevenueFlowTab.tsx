import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface RevenueAttribution {
    festivalConcluded: boolean;
    festivalConclusionTime: string | null;
    passRevenueCents: number;
    passCount: number;
    blockRevenueCents: number;
    blockCount: number;
    duringFestivalRentalCents: number;
    duringFestivalRentalCount: number;
    tipRevenueCents: number;
    tipCount: number;
    tips: { title: string; filmmakerName: string | null; amountCents: number; date: string }[];
    postFestivalRentalCents: number;
    postFestivalRentalCount: number;
}

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const FlowRow: React.FC<{ label: string; count: number; cents: number; destination: string; destinationColor: string }> = ({ label, count, cents, destination, destinationColor }) => (
    <div className="flex items-center justify-between gap-4 bg-black border border-white/10 rounded-2xl p-6">
        <div>
            <p className="font-bold text-white">{label}</p>
            <p className="text-xs text-gray-500 mt-1">{count} payment{count === 1 ? '' : 's'}</p>
        </div>
        <div className="text-right">
            <p className="text-2xl font-black text-white tabular-nums">{formatCurrency(cents)}</p>
            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${destinationColor}`}>→ {destination}</p>
        </div>
    </div>
);

const AdminRevenueFlowTab: React.FC = () => {
    const [data, setData] = useState<RevenueAttribution | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const password = sessionStorage.getItem('adminPassword');
            try {
                const res = await fetch('/api/get-revenue-attribution', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                });
                const json = await res.json();
                if (json.error) throw new Error(json.error);
                setData(json.attribution);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) return <LoadingSpinner />;
    if (error) return <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl text-center font-black uppercase tracking-widest text-xs">{error}</div>;
    if (!data) return null;

    const crateWestTotal = data.passRevenueCents + data.blockRevenueCents + data.duringFestivalRentalCents;
    const filmmakerTotal = data.tipRevenueCents + data.postFestivalRentalCents;

    return (
        <div className="space-y-12 pb-32 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-white/5 p-12 rounded-[4rem] shadow-2xl">
                <div className="mb-10 border-b border-white/5 pb-8">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Where The Money Goes</h2>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-2">
                        {data.festivalConcluded
                            ? `Festival concluded ${new Date(data.festivalConclusionTime!).toLocaleDateString()} — individual rentals now flow to filmmakers`
                            : 'Festival still running — passes, block tickets, and individual rentals all stay with Crate/Playhouse West until every block has ended'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-red-500">While The Festival Runs</h3>
                        <FlowRow label="Full Festival Passes" count={data.passCount} cents={data.passRevenueCents} destination="Playhouse West" destinationColor="text-red-400" />
                        <FlowRow label="Block Ticket Unlocks" count={data.blockCount} cents={data.blockRevenueCents} destination="Playhouse West" destinationColor="text-red-400" />
                        <FlowRow label="Individual Rentals (pre-conclusion)" count={data.duringFestivalRentalCount} cents={data.duringFestivalRentalCents} destination="Crate (unattributed)" destinationColor="text-gray-500" />
                        <div className="bg-red-600/10 border border-red-500/20 rounded-2xl p-6 text-center">
                            <p className="text-3xl font-black text-white tabular-nums">{formatCurrency(crateWestTotal)}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-1">Total → Playhouse West / Crate</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Straight To Filmmakers</h3>
                        <FlowRow label="Tips" count={data.tipCount} cents={data.tipRevenueCents} destination="Filmmaker (always)" destinationColor="text-emerald-400" />
                        {data.tips.length > 0 && (
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2">
                                {data.tips.map((tip, i) => (
                                    <div key={i} className="flex items-center justify-between gap-3 text-xs">
                                        <div>
                                            <p className="font-bold text-white">{tip.title}</p>
                                            <p className="text-gray-500">
                                                {tip.filmmakerName || 'Filmmaker not on file'}
                                                {tip.date && ` · ${new Date(tip.date).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                        <p className="font-black text-emerald-400 tabular-nums">{formatCurrency(tip.amountCents)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <FlowRow label="Individual Rentals (post-conclusion)" count={data.postFestivalRentalCount} cents={data.postFestivalRentalCents} destination="Filmmaker" destinationColor="text-emerald-400" />
                        <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
                            <p className="text-3xl font-black text-white tabular-nums">{formatCurrency(filmmakerTotal)}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mt-1">Total → Filmmakers</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminRevenueFlowTab;
