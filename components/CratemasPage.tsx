import React, { useMemo } from 'react';
import Header from './Header';
import BackToTopButton from './BackToTopButton';
import LoadingSpinner from './LoadingSpinner';
import { Movie } from '../types';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import SeasonShowcase from './SeasonShowcase';
import { useFestival } from '../contexts/FestivalContext';
import { currentSeason, legacyCratemasKeys, normalizeSeasons } from '../api/_lib/seasons';

// /cratemas — the full page for whichever season is on (Cratemas, Valentine's…). `?season=<id>` previews a
// specific one. Looks come from SeasonShowcase; this page only adds the site header and footer.
const CratemasPage: React.FC = () => {
    const { isLoading, movies, categories, settings } = useFestival();

    const season = useMemo(() => {
        const wanted = new URLSearchParams(window.location.search).get('season');
        const picked = wanted ? normalizeSeasons((settings as any).seasons).find(s => s.id === wanted) : null;
        return picked || currentSeason(settings as any, legacyCratemasKeys(categories as any));
    }, [settings, categories]);

    const seasonMovies = useMemo(() => (season?.movieKeys || []).map(k => movies[k]).filter((m: Movie | undefined): m is Movie => !!m && !m.isUnlisted), [season, movies]);

    const go = (path: string) => { window.history.pushState({}, '', path); window.dispatchEvent(new Event('pushstate')); };
    const handleSelectMovie = (movie: Movie) => go(`/movie/${movie.key}?play=true`);

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#0a0a0a]">
            <Header searchQuery="" onSearch={(q) => go(`/?search=${encodeURIComponent(q)}`)} isScrolled={true} onMobileSearchClick={() => go('/?action=search')} showSearch={true} showNavLinks={true} />
            <main className="flex-grow pb-24 md:pb-0 px-3 md:px-8 pt-20">
                {season ? (
                    <SeasonShowcase season={season} movies={seasonMovies} onSelect={handleSelectMovie} variant="page" />
                ) : (
                    <div className="text-center py-32">
                        <div className="text-6xl mb-6">🎬</div>
                        <p className="text-gray-400 text-xl font-bold">No seasonal collection right now. Check back soon!</p>
                    </div>
                )}
            </main>
            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => go('/?action=search')} />
        </div>
    );
};

export default CratemasPage;
