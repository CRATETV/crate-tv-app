import React, { useState, useMemo, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import SEO from './SEO';
import { Movie, WatchPartyState, MoviePipelineEntry, FilmBlock } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import BottomNavBar from './BottomNavBar';
import { MovieCard } from './MovieCard';
import SquarePaymentModal from './SquarePaymentModal';
import CrateFestBanner from './CrateFestBanner';
import { getDbInstance } from '../services/firebaseClient';
import LiveWatchPartyBanner from './LiveWatchPartyBanner';

const CrateFestPage: React.FC = () => {
    const { hasCrateFestPass, grantCrateFestPass, unlockedFestivalBlockIds, rentals, purchaseMovie, unlockFestivalBlock } = useAuth();
    const { isLoading, movies, settings, pipeline } = useFestival();
    const [paymentItem, setPaymentItem] = useState<{ type: 'crateFestPass' | 'block' | 'movie', block?: FilmBlock, movie?: Movie } | null>(null);
    const [activeParties, setActiveParties] = useState<Record<string, WatchPartyState>>({});

    const config = settings.crateFestConfig;
    
    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const unsubscribe = db.collection('watch_parties').onSnapshot(snapshot => {
            const states: Record<string, WatchPartyState> = {};
            snapshot.forEach(doc => {
                const data = doc.data() as WatchPartyState;
                if (data.status === 'live') {
                    states[doc.id] = data;
                }
            });
            setActiveParties(states);
        });
        return () => unsubscribe();
    }, []);

    const livePartyMovie = useMemo(() => {
        const liveKey = Object.keys(activeParties).find(key => {
            const m = movies[key];
            return m && m.isWatchPartyEnabled && !m.isUnlisted;
        });
        return liveKey ? movies[liveKey] : null;
    }, [activeParties, movies]);

    const resolveMovie = (key: string): Movie | null => {
        if (movies[key]) return movies[key];
        const sub = pipeline.find(p => p.id === key);
        if (sub) {
            return {
                key: sub.id,
                title: sub.title,
                director: sub.director,
                synopsis: sub.synopsis,
                poster: sub.posterUrl,
                fullMovie: sub.movieUrl,
                cast: [],
                trailer: '',
                tvPoster: sub.posterUrl,
            };
        }
        return null;
    };

    const isCrateFestActive = useMemo(() => {
        if (!config?.isActive || !config?.startDate || !config?.endDate) return false;
        const now = new Date();
        return now >= new Date(config.startDate) && now <= new Date(config.endDate);
    }, [config]);

    const handlePurchaseSuccess = async (details: any) => {
        if (details.paymentType === 'crateFestPass') await grantCrateFestPass();
        else if (details.paymentType === 'block') await unlockFestivalBlock(details.itemId);
        else if (details.paymentType === 'movie') await purchaseMovie(details.itemId);
        setPaymentItem(null);
    };

    const checkAccess = (movieKey: string, blockId: string) => {
        if (hasCrateFestPass) return true;
        if (unlockedFestivalBlockIds.includes(blockId)) return true;
        const exp = rentals[movieKey];
        if (exp && new Date(exp) > new Date()) return true;
        return false;
    };

    if (isLoading) return <LoadingSpinner />;
    if (!config) return <div className="h-screen bg-black flex items-center justify-center font-black uppercase text-gray-800">System Core Offline</div>;

    const headerTop = (livePartyMovie || isCrateFestActive) ? '3rem' : '0px';

    return (
        <div className="flex flex-col min-h-screen text-white bg-black selection:bg-red-600 selection:text-white relative">
            <SEO title={config.title} description={config.tagline} />
            
            {livePartyMovie ? (
                <LiveWatchPartyBanner 
                    movie={livePartyMovie} 
                    onClose={() => setActiveParties(prev => {
                        const next = { ...prev };
                        delete next[livePartyMovie.key];
                        return next;
                    })} 
                />
            ) : isCrateFestActive ? (
                <CrateFestBanner config={config} hasPass={hasCrateFestPass} />
            ) : null}
            
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} topOffset={headerTop} />
            
            <main className="flex-grow transition-all duration-500" style={{ paddingTop: (livePartyMovie || isCrateFestActive) ? '3rem' : '0px' }}>
                {/* Hero */}
                <div className="relative h-[80vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
                    <div className="absolute inset-0 bg-black">
                        <div className="absolute inset-0 bg-[url('https://cratetelevision.s3.us-east-1.amazonaws.com/filmmaker-bg.jpg')] opacity-20 blur-xl animate-[pulse_10s_infinite]"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black to-black"></div>
                    </div>
                    <div className="relative z-10 max-w-7xl space-y-10 animate-[fadeIn_1.2s_ease-out]">
                        <h1 className="text-6xl md:text-[11rem] font-black uppercase tracking-tighter leading-[0.75] italic drop-shadow-2xl">
                            {config.title.split(' ')[0]}<br/>
                            <span className="text-red-600 drop-shadow-[0_0_80px_rgba(239,68,68,0.3)]">{config.title.split(' ').slice(1).join(' ')}</span>
                        </h1>
                        <p className="text-xl md:text-3xl text-gray-300 font-medium max-w-3xl mx-auto leading-tight">{config.tagline}</p>
                        {!hasCrateFestPass && (
                            <button onClick={() => setPaymentItem({ type: 'crateFestPass' })} className="bg-white text-black font-black px-12 py-6 rounded-2xl text-2xl uppercase tracking-tighter hover:scale-105 transition-all shadow-2xl">
                                Full Session Pass - ${config.passPrice}
                            </button>
                        )}
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto p-6 md:p-16 space-y-32 pb-48">
                    {config.movieBlocks.map((block, idx) => {
                        const isBlockUnlocked = hasCrateFestPass || (unlockedFestivalBlockIds || []).includes(block.id);
                        return (
                            <section key={block.id} className="space-y-12">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                                    <div>
                                        <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px] mb-2">Block {idx + 1}</p>
                                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic text-white">{block.title}</h2>
                                    </div>
                                    {!isBlockUnlocked && (
                                        <button onClick={() => setPaymentItem({ type: 'block', block: block as any })} className="bg-white/5 hover:bg-white/10 text-white font-black px-6 py-3 rounded-xl border border-white/10 transition-all uppercase text-[10px] tracking-widest">
                                            Unlock Entire Block - $10.00
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                                    {block.movieKeys.map(key => {
                                        const movie = resolveMovie(key);
                                        if (!movie) return null;
                                        const access = checkAccess(movie.key, block.id);
                                        return (
                                            <div key={key} className="space-y-3">
                                                <div className={`transition-all duration-700 ${!access ? 'opacity-30 grayscale' : 'hover:scale-105'}`}>
                                                    <MovieCard 
                                                        movie={movie} 
                                                        onSelectMovie={(m) => access ? window.history.pushState({}, '', `/movie/${m.key}?play=true`) : setPaymentItem({ type: 'movie', movie: m })} 
                                                    />
                                                </div>
                                                {!access && (
                                                    <button onClick={() => setPaymentItem({ type: 'movie', movie })} className="w-full bg-white/5 hover:bg-red-600 text-gray-500 hover:text-white font-black py-2 rounded-lg text-[9px] uppercase tracking-widest transition-all">Rent Master File $5</button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </main>

            <Footer />
            <BottomNavBar onSearchClick={() => {}} />
            
            {paymentItem && (
                <SquarePaymentModal 
                    paymentType={paymentItem.type} 
                    priceOverride={paymentItem.type === 'crateFestPass' ? config.passPrice : paymentItem.type === 'block' ? 10.00 : 5.00}
                    block={paymentItem.block}
                    movie={paymentItem.movie}
                    onClose={() => setPaymentItem(null)} 
                    onPaymentSuccess={handlePurchaseSuccess} 
                />
            )}
        </div>
    );
};

export default CrateFestPage;