import React, { useState } from 'react';
import Header from './Header.tsx';
import Footer from './Footer.tsx';
import BackToTopButton from './BackToTopButton.tsx';
import SearchOverlay from './SearchOverlay.tsx';

const RokuGuidePage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    const handleSearchSubmit = (query: string) => {
        if (query) {
          window.location.href = `/?search=${encodeURIComponent(query)}`;
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header 
                searchQuery={searchQuery} 
                onSearch={setSearchQuery} 
                isScrolled={true}
                onMobileSearchClick={() => setIsMobileSearchOpen(true)}
                onSearchSubmit={handleSearchSubmit}
            />

            <main className="flex-grow pt-24 px-4 md:px-12 flex items-center justify-center text-center">
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Roku Guide</h1>
                    <p className="text-lg text-gray-400">
                        Information about Roku integration will be available here soon.
                    </p>
                </div>
            </main>

            <Footer />
            <BackToTopButton />

            {isMobileSearchOpen && (
                <SearchOverlay 
                  searchQuery={searchQuery}
                  onSearch={setSearchQuery}
                  onClose={() => setIsMobileSearchOpen(false)}
                  onSubmit={handleSearchSubmit}
                />
            )}
        </div>
    );
};

export default RokuGuidePage;