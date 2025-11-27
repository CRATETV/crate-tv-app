
import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import { ActorProfile, Movie } from '../types';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';

const ActorCard: React.FC<{ actor: ActorProfile }> = ({ actor }) => {
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        window.history.pushState({}, '', `/actors-directory/${actor.slug}`);
        window.dispatchEvent(new Event('pushstate'));
    };
    return (
        <a href={`/actors-directory/${actor.slug}`} onClick={handleNavigate} className="group block text-center">
            <div className="relative aspect-square w-full rounded-full overflow-hidden mx-auto max-w-[200px] border-4 border-gray-800 group-hover:border-purple-500 transition-colors duration-300 bg-gray-900">
                <img src={actor.photo} alt={actor.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-white group-hover:text-purple-400 transition-colors">{actor.name}</h3>
        </a>
    );
};

const ActorsDirectoryPage: React.FC = () => {
    const [actors, setActors] = useState<ActorProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { movies } = useFestival();

    useEffect(() => {
        const fetchActors = async () => {
            try {
                const response = await fetch('/api/get-public-actors');
                if (!response.ok) throw new Error('Failed to fetch actors.');
                const data = await response.json();
                setActors(data.actors || []);
            } catch (error) {
                console.error("Error fetching actors:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchActors();
    }, []);

    const filteredActors = useMemo(() => {
        if (!searchTerm) return actors;
        return actors.filter(actor => actor.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [actors, searchTerm]);
    
    const handleSearch = (query: string) => {
        window.history.pushState({}, '', `/?search=${encodeURIComponent(query)}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleMobileSearch = () => {
        window.history.pushState({}, '', '/?action=search');
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col min-h-screen text-white">
            <Header searchQuery="" onSearch={handleSearch} isScrolled={true} onMobileSearchClick={handleMobileSearch} showSearch={true} showNavLinks={false} />
            <main className="flex-grow pt-24 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Meet the Actors</h1>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto">Discover the talented individuals who bring our films to life. Click on an actor to learn more about them and see their work on Crate TV.</p>
                    </div>

                    <div className="mb-8 max-w-md mx-auto">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search actors by name..."
                            className="form-input w-full"
                        />
                    </div>
                    
                    {filteredActors.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
                            {filteredActors.map(actor => (
                                <ActorCard key={actor.slug} actor={actor} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-500">
                            <p>No actors found matching your search.</p>
                        </div>
                    )}
                </div>
            </main>
            <Footer showActorLinks={true} />
            <BackToTopButton />
            <BottomNavBar onSearchClick={handleMobileSearch} />
        </div>
    );
};

export default ActorsDirectoryPage;
