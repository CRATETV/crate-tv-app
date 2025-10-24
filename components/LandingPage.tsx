import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from './Header';
import Hero from './Hero';
import { Movie, Category } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

const LandingPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [heroIndex, setHeroIndex] = useState(0);
  const heroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data } = await fetchAndCacheLiveData();
        setMovies(data.movies);
        setCategories(data.categories);
      } catch (error) {
        console.error("Failed to load landing page data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const heroMovies = useMemo(() => {
    if (!categories.featured?.movieKeys) return [];
    return categories.featured.movieKeys.map(key => movies[key]).filter(Boolean);
  }, [movies, categories.featured]);

  useEffect(() => {
    if (heroMovies.length > 1) {
      heroIntervalRef.current = setInterval(() => {
        setHeroIndex(prevIndex => (prevIndex + 1) % heroMovies.length);
      }, 7000);
    }
    return () => {
      if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
    };
  }, [heroMovies.length]);

  const handleSetHeroIndex = (index: number) => {
    setHeroIndex(index);
    if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
  };

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#141414]">
      <Header
        searchQuery=""
        onSearch={() => {}}
        isScrolled={true}
        onMobileSearchClick={() => {}}
        showSearch={false}
        isLandingPage={true}
      />
      <main className="flex-grow">
        <Hero
          movies={heroMovies}
          currentIndex={heroIndex}
          onSetCurrentIndex={handleSetHeroIndex}
          onSelectMovie={(movie) => {
            // For logged-out users, clicking "More Info" on hero goes to login
            const loginUrl = new URL('/login', window.location.origin);
            loginUrl.searchParams.set('redirect', `/movie/${movie.key}`);
            window.location.href = loginUrl.toString();
          }}
        />
        <div className="relative z-10 mt-[-2rem] md:mt-[-4rem] text-center px-4 pb-16">
          <div className="max-w-3xl mx-auto bg-black/30 backdrop-blur-sm rounded-lg py-12 px-6">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
              Fresh Independent Films Await.
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              Join a community of filmmakers and film lovers. Discover your next favorite movie, support emerging artists, and explore a curated library of unique stories.
            </p>
            <a 
              href="/login" 
              onClick={(e) => handleNavigate(e, '/login')}
              className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-10 rounded-lg text-lg shadow-lg transition-transform hover:scale-105"
            >
              Sign In & Start Watching
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
