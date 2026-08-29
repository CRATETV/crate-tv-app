
import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import BottomNavBar from './BottomNavBar';
import SEO from './SEO';
import { getProductsByCollection, FourthwallProduct } from '../services/fourthwall';
import { useCart } from '../contexts/CartContext';

// Check Settings > Collections in the Fourthwall dashboard if products
// don't show up — "all" is Fourthwall's default catalog-wide slug for most
// shops, but a shop can rename or restructure this.
const CATALOG_COLLECTION_SLUG = 'all';

const MerchPage: React.FC = () => {
    const [products, setProducts] = useState<FourthwallProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notConfigured, setNotConfigured] = useState(false);
    const { addItem, itemCount, checkoutUrl, loading: cartLoading } = useCart();
    const [addedId, setAddedId] = useState<string | null>(null);

    const handleSearch = (query: string) => {
        window.history.pushState({}, '', `/?search=${encodeURIComponent(query)}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleMobileSearch = () => {
        window.history.pushState({}, '', '/?action=search');
        window.dispatchEvent(new Event('pushstate'));
    };

    useEffect(() => {
        if (!import.meta.env.VITE_FOURTHWALL_STOREFRONT_TOKEN) {
            setNotConfigured(true);
            setLoading(false);
            return;
        }
        let active = true;
        getProductsByCollection(CATALOG_COLLECTION_SLUG)
            .then((data) => {
                if (active) setProducts(data.results || []);
            })
            .catch((err) => {
                if (active) setError(err.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    async function handleAddToCart(product: FourthwallProduct) {
        const variant = product.variants?.[0];
        if (!variant) return;
        await addItem(variant.id, 1);
        setAddedId(product.id);
        setTimeout(() => setAddedId((cur) => (cur === product.id ? null : cur)), 1600);
    }

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <SEO
                title="Shop"
                description="Festival posters, tees, and prints straight from the films you watched on Crate TV — a share of every sale goes back to the filmmakers."
            />

            <Header
                searchQuery=""
                onSearch={handleSearch}
                isScrolled={true}
                onMobileSearchClick={handleMobileSearch}
            />

            <main className="flex-grow pt-24 pb-24 md:pb-16 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 border-b border-white/5 pb-10">
                        <div className="space-y-4">
                            <span className="inline-block bg-red-600 text-white font-black uppercase text-[10px] tracking-[0.4em] px-4 py-2 rounded-full">
                                The Crate Shop
                            </span>
                            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-[0.85]">
                                Wear The<br />Stories.
                            </h1>
                            <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-md">
                                Every purchase supports the filmmakers behind the films you love — a share of each sale goes directly back to them.
                            </p>
                        </div>

                        {checkoutUrl && itemCount > 0 && (
                            <a
                                href={checkoutUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 bg-white text-black font-black uppercase text-xs tracking-[0.2em] px-8 py-4 rounded-full hover:bg-red-600 hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-xl whitespace-nowrap"
                            >
                                Checkout ({itemCount})
                            </a>
                        )}
                    </div>

                    {notConfigured && (
                        <div className="text-center py-24 space-y-4">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-500">Shop not connected yet</h2>
                            <p className="text-gray-600 max-w-md mx-auto">Add your Fourthwall storefront token and shop subdomain to bring the catalog online.</p>
                        </div>
                    )}

                    {!notConfigured && loading && (
                        <p className="text-gray-500 text-center py-24">Loading products…</p>
                    )}

                    {!notConfigured && error && (
                        <p className="text-red-400 text-center py-24 max-w-md mx-auto">
                            Couldn't load the shop right now ({error}). Double-check the Storefront token and collection slug.
                        </p>
                    )}

                    {!notConfigured && !loading && !error && products.length === 0 && (
                        <p className="text-gray-500 text-center py-24">No products found yet — check back soon.</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                        {products.map((product) => {
                            const image = product.images?.[0];
                            const variant = product.variants?.[0];
                            const price = variant
                                ? new Intl.NumberFormat('en-US', {
                                      style: 'currency',
                                      currency: variant.unitPrice.currency,
                                  }).format(variant.unitPrice.value)
                                : '';
                            const isAdded = addedId === product.id;

                            return (
                                <div
                                    key={product.id}
                                    className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden flex flex-col group"
                                >
                                    <div className="aspect-square bg-[#141414] overflow-hidden">
                                        {image && (
                                            <img
                                                src={image.url}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        )}
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="text-sm font-bold mb-1">{product.name}</div>
                                        <div className="text-sm text-red-500 font-black mb-4">{price}</div>
                                        <button
                                            onClick={() => handleAddToCart(product)}
                                            disabled={cartLoading || !variant}
                                            className={`mt-auto border rounded-full py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${
                                                isAdded
                                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                                    : 'bg-transparent border-white/20 text-white hover:border-red-600 hover:text-red-500'
                                            } ${cartLoading ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
                                        >
                                            {isAdded ? 'Added ✓' : 'Add to Cart'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            <Footer />
            <BackToTopButton />
            <BottomNavBar onSearchClick={handleMobileSearch} />
        </div>
    );
};

export default MerchPage;
