import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface DiagnosticsResult {
    found: boolean;
    uid?: string;
    email?: string;
    name?: string | null;
    createdAt?: string | null;
    lastSignInAt?: string | null;
    emailVerified?: boolean;
    disabled?: boolean;
    roles?: { isActor: boolean; isFilmmaker: boolean; isIndustryPro: boolean; isPremiumSubscriber: boolean };
    festivalAccess?: {
        hasFestivalAllAccess: boolean;
        festivalPassExpiry: string | null;
        hasCrateFestPass: boolean;
        crateFestPassExpiry: string | null;
        hasJuryPass: boolean;
        unlockedBlockIds: string[];
        unlockedBlocks: Record<string, string>;
        unlockedWatchPartyKeys: string[];
    };
    purchases?: {
        purchasedMovieKeys: string[];
        rentals: Record<string, string>;
        ticketStubCount: number;
        festivalTickets: { id: string; itemId: string | null; paymentType: string | null; amountPaid: number | null; promoCode: string | null; purchasedAt: string | null }[];
    };
    activity?: {
        watchlistCount: number;
        watchedMoviesCount: number;
        likedMoviesCount: number;
        rokuDeviceId: string | null;
    };
}

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-6 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-500">{title}</h3>
        {children}
    </div>
);

const Flag: React.FC<{ label: string; on: boolean }> = ({ label, on }) => (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
        <span className="text-sm text-gray-300">{label}</span>
        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${on ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-white/5 text-gray-600 border border-white/10'}`}>
            {on ? 'Yes' : 'No'}
        </span>
    </div>
);

const formatCurrency = (amount: number | null) => amount == null ? '—' : `$${amount.toFixed(2)}`;
const formatDate = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleString() : '—';

const UserDiagnosticsTab: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<DiagnosticsResult | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setIsLoading(true);
        setError('');
        setResult(null);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/get-user-diagnostics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, email: email.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Lookup failed.');
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-10 pb-32 animate-[fadeIn_0.5s_ease-out]">
            <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Account Lookup</h2>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">
                    Read-only view of what a user's account can access — for support, not for logging in as them
                </p>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-all"
                />
                <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="bg-red-600 hover:bg-red-700 text-white font-black px-8 py-3 rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                >
                    {isLoading ? 'Looking Up...' : 'Look Up'}
                </button>
            </form>

            {isLoading && <LoadingSpinner />}

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl text-center font-black uppercase tracking-widest text-xs">
                    {error}
                </div>
            )}

            {result && !result.found && (
                <div className="bg-white/[0.02] border border-white/5 p-12 rounded-3xl text-center">
                    <p className="text-gray-400 font-bold">No account found with that email.</p>
                </div>
            )}

            {result && result.found && (
                <div className="space-y-8">
                    <Card title="Account">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                            <Flag label="Email Verified" on={!!result.emailVerified} />
                            <Flag label="Account Disabled" on={!!result.disabled} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-sm">
                            <div><span className="text-gray-500">Name:</span> <span className="text-white font-bold">{result.name || '—'}</span></div>
                            <div><span className="text-gray-500">UID:</span> <span className="text-gray-400 font-mono text-xs">{result.uid}</span></div>
                            <div><span className="text-gray-500">Joined:</span> <span className="text-white">{formatDate(result.createdAt)}</span></div>
                            <div><span className="text-gray-500">Last Sign-In:</span> <span className="text-white">{formatDate(result.lastSignInAt)}</span></div>
                        </div>
                    </Card>

                    <Card title="Roles">
                        <Flag label="Filmmaker" on={!!result.roles?.isFilmmaker} />
                        <Flag label="Actor" on={!!result.roles?.isActor} />
                        <Flag label="Industry Pro" on={!!result.roles?.isIndustryPro} />
                        <Flag label="Premium Subscriber" on={!!result.roles?.isPremiumSubscriber} />
                    </Card>

                    <Card title="Festival Access">
                        <Flag label="Full Festival Access" on={!!result.festivalAccess?.hasFestivalAllAccess} />
                        <Flag label="Crate Fest Pass" on={!!result.festivalAccess?.hasCrateFestPass} />
                        <Flag label="Jury Pass" on={!!result.festivalAccess?.hasJuryPass} />
                        {result.festivalAccess?.festivalPassExpiry && (
                            <p className="text-xs text-gray-500 pt-2">Pass expiry: {formatDate(result.festivalAccess.festivalPassExpiry)}</p>
                        )}
                        {(result.festivalAccess?.unlockedBlockIds.length ?? 0) > 0 && (
                            <div className="pt-2">
                                <p className="text-xs text-gray-500 mb-1">Unlocked blocks:</p>
                                <p className="text-sm text-white">{result.festivalAccess?.unlockedBlockIds.join(', ')}</p>
                            </div>
                        )}
                        {(result.festivalAccess?.unlockedWatchPartyKeys.length ?? 0) > 0 && (
                            <div className="pt-2">
                                <p className="text-xs text-gray-500 mb-1">Unlocked watch parties:</p>
                                <p className="text-sm text-white">{result.festivalAccess?.unlockedWatchPartyKeys.join(', ')}</p>
                            </div>
                        )}
                    </Card>

                    <Card title="Purchases & Rentals">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm mb-4">
                            <div><span className="text-gray-500 block text-xs uppercase">Purchased Films</span><span className="text-white font-bold text-lg">{result.purchases?.purchasedMovieKeys.length ?? 0}</span></div>
                            <div><span className="text-gray-500 block text-xs uppercase">Active Rentals</span><span className="text-white font-bold text-lg">{Object.keys(result.purchases?.rentals || {}).length}</span></div>
                            <div><span className="text-gray-500 block text-xs uppercase">Ticket Stubs</span><span className="text-white font-bold text-lg">{result.purchases?.ticketStubCount ?? 0}</span></div>
                        </div>
                        {(result.purchases?.festivalTickets.length ?? 0) === 0 ? (
                            <p className="text-xs text-gray-600">No festival ticket purchases on record.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="text-gray-600 uppercase tracking-widest">
                                        <tr>
                                            <th className="py-2 pr-4">Item</th>
                                            <th className="py-2 pr-4">Type</th>
                                            <th className="py-2 pr-4">Amount</th>
                                            <th className="py-2 pr-4">Promo</th>
                                            <th className="py-2">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {result.purchases?.festivalTickets.map(t => (
                                            <tr key={t.id}>
                                                <td className="py-2 pr-4 text-white">{t.itemId || '—'}</td>
                                                <td className="py-2 pr-4 text-gray-400">{t.paymentType || '—'}</td>
                                                <td className="py-2 pr-4 text-green-500 font-bold">{formatCurrency(t.amountPaid)}</td>
                                                <td className="py-2 pr-4 text-gray-400">{t.promoCode || '—'}</td>
                                                <td className="py-2 text-gray-500">{formatDate(t.purchasedAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    <Card title="Activity">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
                            <div><span className="text-gray-500 block text-xs uppercase">Watchlist</span><span className="text-white font-bold text-lg">{result.activity?.watchlistCount ?? 0}</span></div>
                            <div><span className="text-gray-500 block text-xs uppercase">Watched</span><span className="text-white font-bold text-lg">{result.activity?.watchedMoviesCount ?? 0}</span></div>
                            <div><span className="text-gray-500 block text-xs uppercase">Liked</span><span className="text-white font-bold text-lg">{result.activity?.likedMoviesCount ?? 0}</span></div>
                            <div><span className="text-gray-500 block text-xs uppercase">Roku Linked</span><span className="text-white font-bold text-lg">{result.activity?.rokuDeviceId ? 'Yes' : 'No'}</span></div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default UserDiagnosticsTab;
