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
    const { user, hasCrateFestPass, grantCrateFestPass } = useAuth();
    const { isLoading, movies, settings } = useFestival();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const config = settings.crateFestConfig;
    
    // Safety check for date handling
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

    const handleJoinWatchParty = () => {
        if (!config?.featuredWatchPartyKey) return;
        window.history.pushState({}, '', `/watchparty/${config.featuredWatchPartyKey}`);
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
                {/* Immersive Hero Section */}
                <div className="relative h-[85vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden border-b border-white/5">
                    {/* Atmospheric Layer */}
                    <div className="absolute inset-0 bg-black">
                        <div className="absolute inset-0 bg-[url('https://cratetelevision.s3.us-east-1.amazonaws.com/filmmaker-bg.jpg')] opacity-20 blur-xl scale-125 animate-[pulse_10s_infinite]"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black to-black"></div>
                    </div>
                    
                    <div className="relative z-10 max-w-5xl space-y-10 animate-[fadeIn_1.2s_ease-out]">
                        <div className="flex justify-center">
                            <div className={`inline-flex items-center gap-3 ${isLive ? 'bg-red-600 shadow-[0_0_50px_rgba(239,68,68,0.5)]' : 'bg-gray-800'} px-8 py-3 rounded-full border border-white/10`}>
                                {isLive && <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>}
                                <span className="text-[11px] font-black uppercase tracking-[0.4em] leading-none">
                                    {isLive ? 'SYSTEM LIVE' : 'PRE-SESSION'}
                                </span>
                            </div>
                        </div>

                        <h1 className="text-7xl md:text-[11rem] font-black uppercase tracking-tighter leading-[0.8] italic drop-shadow-2xl">
                            {config.title.split(' ')[0]}<br/>
                            <span className="text-red-600">{config.title.split(' ').slice(1).join(' ')}</span>
                        </h1>

                        <p className="text-xl md:text-3xl text-gray-400 font-medium max-w-3xl mx-auto leading-tight">
                            {config.tagline}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-10">
                            {!hasCrateFestPass ? (
                                <button 
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="group w-full sm:w-auto bg-white text-black font-black px-16 py-6 rounded-3xl text-2xl uppercase tracking-tighter shadow-[0_30px_100px_rgba(255,255,255,0.1)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-4"
                                >
                                    Get Digital Pass
                                    <span className="bg-black/5 px-3 py-1 rounded-lg text-sm group-hover:bg-red-600 group-hover:text-white transition-colors">${config.passPrice}</span>
                                </button>
                            ) : (
                                <div className="bg-green-500/10 border border-green-500/30 px-12 py-5 rounded-3xl text-green-500 font-black uppercase tracking-[0.2em] text-sm flex items-center gap-4 shadow-xl">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_15px_#22c55e]"></div>
                                    Full Session Access Authenticated
                                </div>
                            )}
                            
                            {config.featuredWatchPartyKey && (
                                <button 
                                    onClick={handleJoinWatchParty}
                                    className="w-full sm:w-auto bg-gray-900 hover:bg-white/5 text-white font-black px-12 py-6 rounded-3xl text-sm uppercase tracking-[0.3em] border border-white/10 transition-all shadow-2xl"
                                >
                                    Join The Hub
                                </button>
                            )}
                        </div>

                        <div className="pt-12 flex justify-center gap-12 opacity-30 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
                             <div className="flex flex-col gap-1"><span>Resolution</span><span className="text-white">4K Native</span></div>
                             <div className="flex flex-col gap-1"><span>Format</span><span className="text-white">Non-Linear</span></div>
                             <div className="flex flex-col gap-1"><span>Latency</span><span className="text-white">Sub-Second</span></div>
                        </div>
                    </div>
                </div>

                {/* Festival Blocks Container */}
                <div className="max-w-[1800px] mx-auto p-6 md:p-20 space-y-32 pb-40">
                    {config.movieBlocks.map((block, idx) => (
                        <section key={idx} className="space-y-12 group">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                                <div className="space-y-2">
                                    <p className="text-red-500 font-black uppercase tracking-[0.5em] text-[10px]">Collection Block {idx + 1}</p>
                                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white italic">{block.title}</h2>
                                </div>
                                {!hasCrateFestPass && (
                                    <div className="flex items-center gap-3 bg-red-600/10 px-4 py-2 rounded-xl border border-red-500/20">
                                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Locked Content</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                                {block.movieKeys.map(key => {
                                    const movie = movies[key];
                                    if (!movie) return null;
                                    return (
                                        <div key={key} className={`transition-all duration-700 ${!hasCrateFestPass ? 'opacity-30 grayscale blur-[2px] pointer-events-none' : 'hover:scale-105'}`}>
                                            <MovieCard 
                                                movie={movie} 
                                                onSelectMovie={handleSelectMovie}
                                            />
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