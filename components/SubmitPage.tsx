
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Header from './Header';
// FIX: Corrected import path
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import SearchOverlay from './SearchOverlay';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';
import { Movie } from '../types';

const SubmitPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
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
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/send-submission', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server responded with an error.');
            }

            window.history.pushState({}, '', '/thank-you');
            window.dispatchEvent(new Event('pushstate'));

        } catch (error) {
            console.error('Submission error:', error);
            setError(error instanceof Error ? error.message : "An unknown error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formInputClasses = "form-input";
    
    return (
        <div className="flex flex-col min-h-screen" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#000000', color: '#e0e0e0' }}>
            <Header 
                searchQuery={searchQuery} 
                onSearch={setSearchQuery} 
                isScrolled={true}
                onMobileSearchClick={() => setIsMobileSearchOpen(true)}
            />

            <main className="flex-grow pt-20 pb-24 md:pb-0">
                <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4 text-white">Film Submission</h1>
                    <p className="text-center mb-10 text-lg sm:text-xl text-gray-400">
                        Showcase your work and share your story with the world.
                    </p>

                    <div className="bg-[#111111] p-6 sm:p-8 rounded-xl shadow-lg border border-[#4a4a6e] mb-12">
                        <form ref={formRef} id="submissionForm" onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="filmTitle" className="block text-sm font-medium text-gray-400 mb-2">Film Title</label>
                                <input type="text" id="filmTitle" name="filmTitle" className={formInputClasses} required />
                            </div>
                            <div>
                                <label htmlFor="directorName" className="block text-sm font-medium text-gray-400 mb-2">Director's Name</label>
                                <input type="text" id="directorName" name="directorName" className={formInputClasses} required />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                                <input type="email" id="email" name="email" className={formInputClasses} required />
                            </div>
                            <div>
                                <label htmlFor="synopsis" className="block text-sm font-medium text-gray-400 mb-2">Synopsis</label>
                                <textarea id="synopsis" name="synopsis" rows={4} className={formInputClasses} required></textarea>
                            </div>
                            <div>
                                <label htmlFor="actorBio" className="block text-sm font-medium text-gray-400 mb-2">Actor Bios</label>
                                <textarea id="actorBio" name="actorBio" rows={4} className={formInputClasses} placeholder="Provide a brief biography for the main actors."></textarea>
                            </div>
                            <div>
                                <label htmlFor="awards" className="block text-sm font-medium text-gray-400 mb-2">Awards & Recognition</label>
                                <textarea id="awards" name="awards" rows={2} className={formInputClasses} placeholder="List any awards the film has won."></textarea>
                            </div>
                            <div>
                                <label htmlFor="relevantInfo" className="block text-sm font-medium text-gray-400 mb-2">Relevant Information</label>
                                <textarea id="relevantInfo" name="relevantInfo" rows={4} className={formInputClasses} placeholder="Any other relevant details you'd like to share about the film."></textarea>
                            </div>

                            <button type="submit" className="submit-btn w-full mt-8" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Submit Information'}
                            </button>
                            
                            {error && (
                                <div className="mt-4 text-center text-red-500">
                                    <p>{error}</p>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </main>

            <CollapsibleFooter />
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
             <BottomNavBar 
                onSearchClick={() => setIsMobileSearchOpen(true)}
            />
        </div>
    );
};

export default SubmitPage;