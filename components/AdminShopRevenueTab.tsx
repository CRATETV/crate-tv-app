import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { getProductsByCollection, FourthwallProduct } from '../services/fourthwall';
import { ShopAttribution, ShopRevenueByFilmmaker } from '../types';

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const AdminShopRevenueTab: React.FC = () => {
    const [products, setProducts] = useState<FourthwallProduct[]>([]);
    const [productsError, setProductsError] = useState('');
    const [attributions, setAttributions] = useState<ShopAttribution[]>([]);
    const [byFilmmaker, setByFilmmaker] = useState<ShopRevenueByFilmmaker[]>([]);
    const [openApiConfigured, setOpenApiConfigured] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [drafts, setDrafts] = useState<Record<string, { filmmakerName: string; sharePercent: string; category: string; sortOrder: string }>>({});
    const [savingSlug, setSavingSlug] = useState<string | null>(null);

    const fetchAll = async () => {
        setIsLoading(true);
        setError('');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const [summaryRes, productsData] = await Promise.all([
                fetch('/api/get-shop-revenue-summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                }).then(r => r.json()),
                getProductsByCollection('all').catch(err => {
                    setProductsError(err.message);
                    return { results: [] };
                }),
            ]);

            if (summaryRes.error) throw new Error(summaryRes.error);
            setAttributions(summaryRes.attributions || []);
            setByFilmmaker(summaryRes.byFilmmaker || []);
            setOpenApiConfigured(summaryRes.openApiConfigured !== false);
            setProducts(productsData.results || []);

            const initialDrafts: Record<string, { filmmakerName: string; sharePercent: string; category: string; sortOrder: string }> = {};
            (productsData.results || []).forEach((p: FourthwallProduct) => {
                const existing = (summaryRes.attributions || []).find((a: ShopAttribution) => a.productSlug === p.slug);
                initialDrafts[p.slug] = {
                    filmmakerName: existing?.filmmakerName || '',
                    sharePercent: typeof existing?.sharePercent === 'number' ? String(Math.round(existing.sharePercent * 100)) : '',
                    category: existing?.category || '',
                    sortOrder: typeof existing?.sortOrder === 'number' ? String(existing.sortOrder) : '',
                };
            });
            setDrafts(initialDrafts);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleSave = async (product: FourthwallProduct) => {
        const draft = drafts[product.slug] || { filmmakerName: '', sharePercent: '', category: '', sortOrder: '' };
        const hasFilmmakerInput = draft.filmmakerName.trim() || draft.sharePercent.trim();

        let sharePercentValue: number | undefined;
        if (hasFilmmakerInput) {
            const pct = parseFloat(draft.sharePercent);
            if (!draft.filmmakerName.trim() || isNaN(pct) || pct < 0 || pct > 100) {
                alert('Enter both a filmmaker name and a share percent between 0 and 100 (or leave both blank).');
                return;
            }
            sharePercentValue = pct / 100;
        }

        let sortOrderValue: number | undefined;
        if (draft.sortOrder.trim()) {
            const n = parseInt(draft.sortOrder, 10);
            if (isNaN(n)) {
                alert('Order must be a whole number.');
                return;
            }
            sortOrderValue = n;
        }

        setSavingSlug(product.slug);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/set-shop-attribution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productSlug: product.slug,
                    productName: product.name,
                    ...(hasFilmmakerInput
                        ? { filmmakerName: draft.filmmakerName.trim(), sharePercent: sharePercentValue }
                        : { removeAttribution: true }),
                    category: draft.category.trim(),
                    sortOrder: sortOrderValue ?? null,
                    password,
                }),
            });
            if (!res.ok) throw new Error('Failed to save.');
            await fetchAll();
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Failed to save.');
        } finally {
            setSavingSlug(null);
        }
    };

    const handleRemove = async (productSlug: string) => {
        if (!window.confirm('Clear this product\'s category, order, and filmmaker attribution?')) return;
        setSavingSlug(productSlug);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/set-shop-attribution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productSlug, remove: true, password }),
            });
            if (!res.ok) throw new Error('Failed to remove.');
            await fetchAll();
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Failed to remove.');
        } finally {
            setSavingSlug(null);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-12 pb-32 animate-[fadeIn_0.5s_ease-out]">
            {!openApiConfigured && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-6 rounded-2xl text-center font-black uppercase tracking-widest text-xs">
                    Fourthwall Open API credentials aren't configured — revenue totals below will show $0 until FOURTHWALL_OPEN_API_USERNAME/PASSWORD are set.
                </div>
            )}
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl text-center font-black uppercase tracking-widest text-xs">{error}</div>}

            <div className="bg-[#0f0f0f] border border-white/5 p-12 rounded-[4rem] shadow-2xl">
                <div className="mb-10 border-b border-white/5 pb-8">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Owed to Filmmakers (Shop)</h2>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-2">Computed from live Fourthwall orders since {new Date('2025-05-24').toLocaleDateString()}</p>
                </div>
                <div className="bg-black border border-white/10 rounded-[2.5rem] overflow-hidden">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-white/5 text-gray-700 uppercase font-black tracking-widest">
                            <tr>
                                <th className="p-6">Filmmaker</th>
                                <th className="p-6 text-right">Shop Revenue Owed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {byFilmmaker.length === 0 ? (
                                <tr><td colSpan={2} className="p-20 text-center text-gray-800 font-black uppercase tracking-[0.5em] italic">No shop revenue yet</td></tr>
                            ) : byFilmmaker.map(f => (
                                <tr key={f.directorName} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="p-6 font-black text-white uppercase">{f.directorName}</td>
                                    <td className="p-6 text-right text-amber-400 font-black text-xl italic tracking-tighter">{formatCurrency(f.cents)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-[#0f0f0f] border border-white/5 p-12 rounded-[4rem] shadow-2xl">
                <div className="mb-10 border-b border-white/5 pb-8">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Product Attribution &amp; Display</h2>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-2">Group products (e.g. "Hats"), set display order within a group, and tag which filmmaker/share applies</p>
                </div>
                {productsError && <p className="text-red-400 text-sm mb-6">Couldn't load products from Fourthwall: {productsError}</p>}
                <div className="space-y-4">
                    {products.length === 0 ? (
                        <p className="text-gray-600 text-center py-12 uppercase font-black tracking-widest text-xs">No products found in the shop yet</p>
                    ) : products.map(product => {
                        const draft = drafts[product.slug] || { filmmakerName: '', sharePercent: '', category: '', sortOrder: '' };
                        const isAttributed = attributions.some(a => a.productSlug === product.slug);
                        return (
                            <div key={product.id} className="bg-black border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-4 flex-1 min-w-0 basis-full md:basis-auto">
                                    {product.images?.[0] && (
                                        <img src={product.images[0].url} alt={product.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                                    )}
                                    <p className="font-bold text-white truncate">{product.name}</p>
                                </div>
                                <input
                                    type="text"
                                    value={draft.category}
                                    onChange={(e) => setDrafts(d => ({ ...d, [product.slug]: { ...d[product.slug], category: e.target.value } }))}
                                    placeholder="Category (e.g. Hats)"
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-500 transition-all md:w-40"
                                />
                                <input
                                    type="number"
                                    value={draft.sortOrder}
                                    onChange={(e) => setDrafts(d => ({ ...d, [product.slug]: { ...d[product.slug], sortOrder: e.target.value } }))}
                                    placeholder="Order"
                                    title="Lower numbers show first within their category"
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm w-20 focus:outline-none focus:border-red-500 transition-all"
                                />
                                <div className="w-px self-stretch bg-white/5 hidden md:block" />
                                <input
                                    type="text"
                                    value={draft.filmmakerName}
                                    onChange={(e) => setDrafts(d => ({ ...d, [product.slug]: { ...d[product.slug], filmmakerName: e.target.value } }))}
                                    placeholder="Filmmaker name"
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-500 transition-all md:w-48"
                                />
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={draft.sharePercent}
                                        onChange={(e) => setDrafts(d => ({ ...d, [product.slug]: { ...d[product.slug], sharePercent: e.target.value } }))}
                                        placeholder="%"
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm w-20 focus:outline-none focus:border-red-500 transition-all"
                                    />
                                    <span className="text-gray-500 text-xs font-bold">%</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleSave(product)}
                                        disabled={savingSlug === product.slug}
                                        className="text-[10px] font-black uppercase text-black bg-white hover:bg-green-500 hover:text-white transition-colors px-4 py-2 rounded-xl disabled:opacity-40 whitespace-nowrap"
                                    >
                                        {savingSlug === product.slug ? '...' : 'Save'}
                                    </button>
                                    {isAttributed && (
                                        <button
                                            onClick={() => handleRemove(product.slug)}
                                            disabled={savingSlug === product.slug}
                                            className="text-[10px] font-black uppercase text-gray-400 bg-white/5 hover:bg-red-600 hover:text-white transition-colors px-4 py-2 rounded-xl disabled:opacity-40"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminShopRevenueTab;
