import React from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';

const TalentPage: React.FC = () => {
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div className="flex flex-col min-h-screen text-white">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true} 
                onMobileSearchClick={() => {}}
                showSearch={false} 
                showNavLinks={false}
            />
            <main className="flex-grow">
                {/* Hero Section */}
                <div 
                    className="relative py-32 md:py-48 bg-cover bg-center"
                    style={{ backgroundImage: `url('https://cratetelevision.s3.us-east-1.amazonaws.com/talent-bg.jpg')` }}
                >
                    <div className="absolute inset-0 bg-black/70"></div>
                    <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
                        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4">Discover Emerging Talent</h1>
                        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
                            Crate TV is more than a streaming service—it's a launchpad for the next generation of actors. Explore our curated directory of dedicated, independent talent.
                        </p>
                        <a 
                            href="/actors-directory"
                            onClick={(e) => handleNavigate(e, '/actors-directory')}
                            className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-10 rounded-lg text-lg transition-transform hover:scale-105"
                        >
                            Browse the Directory
                        </a>
                    </div>
                </div>

                {/* Features Section */}
                <div className="py-20 md:py-24">
                    <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-white mb-3">Authentic Performances</h3>
                            <p className="text-gray-400">Our actors are featured in original short films, showcasing their range and passion in complete narrative contexts—not just isolated reels.</p>
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-white mb-3">Direct & Detailed Profiles</h3>
                            <p className="text-gray-400">Each actor manages their own public profile, complete with a professional bio, headshots, and links to their IMDb page for easy vetting.</p>
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-white mb-3">A Hub of New Voices</h3>
                            <p className="text-gray-400">With deep roots in the Philadelphia indie film scene, Crate TV is a constantly growing source of fresh, dedicated, and undiscovered talent.</p>
                        </div>
                    </div>
                </div>
            </main>
            <CollapsibleFooter />
        </div>
    );
};

export default TalentPage;