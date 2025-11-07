import React, { useState, useMemo } from 'react';
import Header from './Header';
// FIX: Corrected import path
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import SearchOverlay from './SearchOverlay';
import { useFestival } from '../contexts/FestivalContext';
// FIX: Corrected import path
import { Movie } from '../types';

// Data for merchandise items
const merchItems = [
    {
        name: 'Crate TV Classic Tee',
        imageUrl: 'https://cratetelevision.s3.us-east-1.amazonaws.com/merch-tee.jpg',
        storeUrl: 'https://cratetv.creator-spring.com/listing/crate-tv-logo-apparel',
        description: 'The official Crate TV logo on a comfortable, high-quality classic tee. Perfect for filmmakers, film lovers, and supporters of indie cinema.'
    },
];

const MerchPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const { movies } = useFestival();

    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        // FIX: Cast movie to Movie type to resolve properties.
        return (Object.values(movies) as Movie[]).filter(movie =>
            movie && (
                (movie.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (movie.director || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (movie.cast || []).some(actor => (actor.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
            )
        );
    }, [searchQuery, movies]);

    const handleSelectFromSearch = (movie: Movie) => {
        setIsMobileSearchOpen(false);
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header 
                searchQuery={searchQuery} 
                onSearch={setSearchQuery} 
                isScrolled={true}
                onMobileSearchClick={() => setIsMobileSearchOpen(true)}
            />

            <main className="flex-grow">
                <div 
                    className="relative py-24 md:py-32 bg-cover bg-center"
                    style={{ backgroundImage: `url('https://cratetelevision.s3.us-east-1.amazonaws.com/merch-bg.jpg')` }}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
                    <div className="relative z-10 max-w-4xl mx-auto text-center px-4 animate-fadeInHeroContent">
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">Wear Your Love for Indie Film</h1>
                        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
                            Shop the official Crate TV merchandise. Every purchase helps us continue to support and showcase independent filmmakers.
                        </p>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto p-8 md:p-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {merchItems.map((item, index) => (
                            <div key={index} className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden flex flex-col group">
                                <div className="aspect-square overflow-hidden">
                                    <img 
                                        src={item.imageUrl} 
                                        alt={item.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                        onContextMenu={(e) => e.preventDefault()}
                                    />
                                </div>
                                <div className="p-6 flex flex-col flex-grow">
                                    <h2 className="text-2xl font-bold text-white mb-2">{item.name}</h2>
                                    <p className="text-gray-400 mb-6 flex-grow">{item.description}</p>
                                    <a
                                        href={item.storeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-auto text-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-transform duration-300 transform hover:scale-105"
                                    >
                                        Shop Now
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
            <BackToTopButton />

            {isMobileSearchOpen && (
                <SearchOverlay 
                  searchQuery={searchQuery}
                  onSearch={setSearchQuery}
                  onClose={() => setIsMobileSearchOpen(false)}
                  results={searchResults}
                  onSelectMovie={handleSelectFromSearch}
                />
            )}
        </div>
    );
};

export default MerchPage;
