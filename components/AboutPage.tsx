import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import LoadingSpinner from './LoadingSpinner';
import { AboutData } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';

const AboutPage: React.FC = () => {
    const [aboutData, setAboutData] = useState<AboutData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const footerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const loadAboutData = async () => {
            try {
                const { data: liveData } = await fetchAndCacheLiveData();
                setAboutData(liveData.aboutData);
            } catch (error) {
                console.error("Failed to load About Us data", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadAboutData();
    }, []);

    // Effect to automatically navigate to landing page when user scrolls to the bottom
    useEffect(() => {
        if (isLoading) return; // Don't run until content is loaded

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    // If the footer is visible and no timer is set, start one
                    if (!timeoutRef.current) {
                        timeoutRef.current = window.setTimeout(() => {
                            // After a delay, navigate to the landing page
                            window.history.pushState({}, '', '/');
                            window.dispatchEvent(new Event('pushstate'));
                        }, 2500); // 2.5-second delay
                    }
                } else {
                    // If the footer is not visible, clear any existing timer
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                        timeoutRef.current = null;
                    }
                }
            },
            { threshold: 0.5 } // Trigger when 50% of the footer is visible
        );

        const currentFooter = footerRef.current;
        if (currentFooter) {
            observer.observe(currentFooter);
        }

        return () => {
            if (currentFooter) {
                observer.unobserve(currentFooter);
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isLoading]);

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (!aboutData) {
        return (
            <div className="flex flex-col min-h-screen bg-[#141414] text-white">
                 <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
                 <main className="flex-grow flex items-center justify-center text-center p-4">
                    <p>Could not load page content. Please try again later.</p>
                 </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
            />

            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-12 text-center animate-fadeInHeroContent">
                        <img
                            src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png"
                            alt="Crate TV Logo"
                            className="mx-auto w-full max-w-md"
                            onContextMenu={(e) => e.preventDefault()}
                        />
                    </div>

                    {/* Mission Statement */}
                    <section className="text-center mb-16 animate-fadeInHeroContent">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Our Mission</h1>
                        <p className="text-xl md:text-2xl text-[#FF2400] italic leading-relaxed">
                            "{aboutData.missionStatement}"
                        </p>
                    </section>

                    <div className="space-y-12">
                        {/* Our Story */}
                        <section>
                            <h2 className="text-3xl font-bold text-white mb-4 border-b-2 border-red-500 pb-2 inline-block">Our Story</h2>
                            <p className="text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: aboutData.story }}></p>
                        </section>

                        {/* What We Believe In */}
                        <section>
                            <h2 className="text-3xl font-bold text-white mb-6">What We Believe In</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                                <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                                    <h3 className="text-xl font-bold text-white mb-2">{aboutData.belief1Title}</h3>
                                    <p className="text-gray-400">{aboutData.belief1Body}</p>
                                </div>
                                <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                                    <h3 className="text-xl font-bold text-white mb-2">{aboutData.belief2Title}</h3>
                                    <p className="text-gray-400">{aboutData.belief2Body}</p>
                                </div>
                                <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                                    <h3 className="text-xl font-bold text-white mb-2">{aboutData.belief3Title}</h3>
                                    <p className="text-gray-400">{aboutData.belief3Body}</p>
                                </div>
                            </div>
                        </section>

                        {/* Meet the Founder */}
                        <section className="bg-gray-800/50 border border-gray-700 rounded-lg p-8">
                            <h2 className="text-3xl font-bold text-white mb-6 text-center">Meet the Founder</h2>
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <img 
                                    src={aboutData.founderPhoto} 
                                    alt={aboutData.founderName}
                                    className="w-40 h-40 rounded-full object-cover border-4 border-red-500 flex-shrink-0"
                                    onContextMenu={(e) => e.preventDefault()}
                                />
                                <div>
                                    <h3 className="text-2xl font-bold text-white">{aboutData.founderName}</h3>
                                    <p className="text-red-400 font-semibold mb-2">{aboutData.founderTitle}</p>
                                    <p className="text-gray-300 leading-relaxed">{aboutData.founderBio}</p>
                                </div>
                            </div>
                        </section>

                         {/* Call to Action */}
                        <section className="text-center py-10">
                            <h2 className="text-3xl font-bold text-white mb-4">Join the Movement</h2>
                            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">Whether you're a filmmaker with a story to tell or a film lover searching for something new, you have a home at Crate TV.</p>
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                                <a href="/submit" onClick={(e) => handleNavigate(e, '/submit')} className="submit-btn">
                                    Submit Your Film
                                </a>
                                <a href="/" onClick={(e) => handleNavigate(e, '/')} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                                    Start Exploring
                                </a>
                            </div>
                        </section>

                    </div>
                </div>
            </main>
            <div ref={footerRef}>
                <Footer />
            </div>
            <BackToTopButton />
        </div>
    );
};

// FIX: Add default export to allow the component to be imported correctly.
export default AboutPage;
