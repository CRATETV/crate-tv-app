import React, { useState, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import SEO from './SEO';
import { Movie } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import BottomNavBar from './BottomNavBar';
import { MovieCard } from './MovieCard';
import SquarePaymentModal from './SquarePaymentModal';

const CrateFestPage: React.FC = () => {
    const { hasCrateFestPass, grantCrateFestPass } = useAuth();
    const { isLoading, movies, settings } = useFestival();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const config = settings.crateFestConfig;
    
    const isLive = useMemo(() => {
        if (!config?.isActive || !config?.startDate || !config?.endDate) return false;
        const now = new Date();
        return now >= new Date(config.startDate) && now <= new Date(config.endDate);
    }, [config]);

    const handlePurchaseSuccess = async () => {
        await grantCrateFestPass();
        setIsPaymentModalOpen(false);
    };

    const handleSelectMovie = (movie: Movie) => {
        if (!hasCrateFestPass) {
            setIsPaymentModalOpen(true);
            return;
        }
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) return <LoadingSpinner />;
    if (!config) return (
        <div className="h-screen bg-black flex items-center justify-center flex-col gap-6 p-10 text-center">
            <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-48 mb-4 opacity-20" alt="Crate" />
            <h1 className="text-2xl font-black uppercase tracking-[0.5em] text-gray-800">Festival Core Offline</h1>
            <p className="text-gray-900 font-bold uppercase text-[10px] tracking-widest">Access requires active event manifest</p>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen text-white bg-black selection:bg-red-600 selection:text-white">
            <SEO title={config.title} description={config.tagline} />
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            
            <main className="flex-grow">
                {/* Massive Cinematic Hero */}
                <div className="relative h-[85vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden border-b border-white/5">
                    <div className="absolute inset-0 bg-black">
                        <div className="absolute inset-0 bg-[url('https://cratetelevision.s3.us-east-1.amazonaws.com/filmmaker-bg.jpg')] opacity-20 blur-xl scale-125 animate-[pulse_10s_infinite]"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black to-black"></div>
                    </div>
                    
                    <div className="relative z-10 max-w-7xl space-y-12 animate-[fadeIn_1.2s_ease-out]">
                        <div className="flex justify-center">
                            <div className={`inline-flex items-center gap-3 ${isLive ? 'bg-red-600 shadow-[0_0_50px_rgba(239,68,68,0.5)]' : 'bg-gray-800'} px-10 py-3 rounded-full border border-white/10`}>
                                {isLive && <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>}
                                <span className="text-xs font-black uppercase tracking-[0.5em] leading-none">
                                    {isLive ? 'GLOBAL EVENT LIVE' : 'PRE-SESSION UPLINK'}
                                </span>
                            </div>
                        </div>

                        <h1 className="text-7xl md:text-[13rem] font-black uppercase tracking-tighter leading-[0.75] italic drop-shadow-[0_20px_50px_rgba(0,0,0,1)]">
                            {config.title.split(' ')[0]}<br/>
                            <span className="text-red-600 drop-shadow-[0_0_80px_rgba(239,68,68,0.3)]">{config.title.split(' ').slice(1).join(' ')}</span>
                        </h1>

                        <p className="text-2xl md:text-4xl text-gray-300 font-medium max-w-4xl mx-auto leading-tight tracking-tight">
                            {config.tagline}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-12">
                            {!hasCrateFestPass ? (
                                <button 
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="group w-full sm:w-auto bg-white text-black font-black px-20 py-8 rounded-[2.5rem] text-3xl uppercase tracking-tighter shadow-[0_40px_120px_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95 transition-all flex items-center gap-6"
                                >
                                    Get Event Pass
                                    <span className="bg-black/5 px-4 py-2 rounded-2xl text-base group-hover:bg-red-600 group-hover:text-white transition-colors">${config.passPrice}</span>
                                </button>
                            ) : (
                                <div className="bg-green-500/10 border border-green-500/30 px-16 py-8 rounded-[2.5rem] text-green-500 font-black uppercase tracking-[0.3em] text-sm flex items-center gap-6 shadow-2xl">
                                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_30px_#22c55e]"></div>
                                    Event Access Authenticated
                                </div>
                            )}
                        </div>

                        <div className="pt-20 flex justify-center gap-16 opacity-40 text-[10px] font-black uppercase tracking-[0.6em] text-gray-500">
                             <div className="flex flex-col gap-2"><span>Resolution</span><span className="text-white">4K Native</span></div>
                             <div className="flex flex-col gap-2"><span>Stream</span><span className="text-white">Non-Linear</span></div>
                             <div className="flex flex-col gap-2"><span>Status</span><span className="text-white">Sync Stable</span></div>
                        </div>
                    </div>
                </div>

                {/* Festival Grid Area */}
                <div className="max-w-[1920px] mx-auto p-8 md:p-24 space-y-48 pb-64">
                    {config.movieBlocks.map((block, idx) => (
                        <section key={idx} className="space-y-16">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
                                <div className="space-y-4">
                                    <p className="text-red-500 font-black uppercase tracking-[0.6em] text-xs">Selection Cluster {idx + 1}</p>
                                    <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white italic">{block.title}</h2>
                                </div>
                                {!hasCrateFestPass && (
                                    <div className="flex items-center gap-4 bg-red-600/10 px-6 py-3 rounded-2xl border border-red-500/30">
                                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                        <span className="text-xs font-black uppercase tracking-[0.2em] text-red-500">Encrypted Content</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-12">
                                {block.movieKeys.map(key => {
                                    const movie = movies[key];
                                    if (!movie) return null;
                                    return (
                                        <div key={key} className={`transition-all duration-1000 ${!hasCrateFestPass ? 'opacity-20 grayscale blur-[4px] pointer-events-none scale-95' : 'hover:scale-105'}`}>
                                            <MovieCard movie={movie} onSelectMovie={handleSelectMovie} />
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            </main>

            <Footer />
            <BottomNavBar onSearchClick={() => {}} />
            
            {isPaymentModalOpen && (
                <SquarePaymentModal 
                    paymentType="crateFestPass" 
                    priceOverride={config.passPrice}
                    onClose={() => setIsPaymentModalOpen(false)} 
                    onPaymentSuccess={handlePurchaseSuccess} 
                />
            )}
        </div>
    );
};

export default CrateFestPage;