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
    
    const rokuFeedUrl = `${window.location.origin}/api/roku-feed`;
    const instantTvFeedUrl = `${window.location.origin}/api/instant-tv-feed`;

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header 
                searchQuery={searchQuery} 
                onSearch={setSearchQuery} 
                isScrolled={true}
                onMobileSearchClick={() => setIsMobileSearchOpen(true)}
                onSearchSubmit={handleSearchSubmit}
            />

            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">Roku &amp; TV Channel Publishing Guide</h1>
                    <p className="text-lg text-gray-400 mb-10 text-center">
                        Tools and feeds to publish your Crate TV content on Roku and other platforms.
                    </p>

                    <div className="bg-green-800/20 border border-green-600 text-green-200 rounded-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-3">Recommended Method: Automated Packager</h2>
                        <p className="mb-4">
                            The easiest way to create your Roku channel is with the automated packager on the Admin Panel. This tool generates a ready-to-upload ZIP file with all the necessary code and automatically configures it to use this website as its data source.
                        </p>
                        <ol className="list-decimal list-inside space-y-2 mb-4">
                            <li>First, deploy this website to a public server (like Vercel).</li>
                            <li>Go to the <a href="/admin" className="font-bold underline hover:text-white">Admin Panel</a> on your live website.</li>
                            <li>Use the "Automated Roku Channel Packager" to download your ZIP file.</li>
                            <li>Follow the Roku Developer instructions to upload and install the ZIP file on your device.</li>
                        </ol>
                        <a href="/admin" className="inline-block mt-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-sm">
                            Go to Admin Panel
                        </a>
                    </div>

                    <h2 className="text-3xl font-bold text-center my-10 text-gray-500">Advanced / Manual Feeds</h2>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold text-red-400 mb-3">Instant TV Channel Feed</h2>
                        <p className="text-gray-300 mb-4">
                            For developers using Instant TV Channel, use the following JSON feed URL. This feed is formatted specifically for Instant TV Channel's requirements.
                        </p>
                        <div className="bg-gray-900 p-4 rounded-md">
                            <code className="text-yellow-300 break-all">{instantTvFeedUrl}</code>
                        </div>
                         <a href={instantTvFeedUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm">
                            Open Feed
                        </a>
                    </div>
                    
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold text-red-400 mb-3">Generic Roku Feed</h2>
                        <p className="text-gray-300 mb-4">
                           For developers building a custom SDK channel, use this generic JSON feed.
                        </p>
                        <div className="bg-gray-900 p-4 rounded-md">
                            <code className="text-yellow-300 break-all">{rokuFeedUrl}</code>
                        </div>
                        <a href={rokuFeedUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm">
                            Open Feed
                        </a>
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
                  onSubmit={(query) => {
                    handleSearchSubmit(query);
                    setIsMobileSearchOpen(false);
                  }}
                />
            )}
        </div>
    );
};

export default RokuGuidePage;