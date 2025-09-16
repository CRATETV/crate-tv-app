import React, { useState, useEffect } from 'react';
import Header from './Header.tsx';
import Footer from './Footer.tsx';
import BackToTopButton from './BackToTopButton.tsx';
import { fetchAndCacheLiveData } from '../services/dataService.ts';
import { FestivalDay, FestivalConfig, Movie } from '../types.ts';
import LoadingSpinner from './LoadingSpinner.tsx';
import FestivalView from './FestivalView.tsx'; // Import new view component

const FestivalPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
  const [festivalConfig, setFestivalConfig] = useState<FestivalConfig>({ title: '', description: '' });
  const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});

  useEffect(() => {
    const initPage = async () => {
        setIsLoading(true);
        try {
            const { data: liveData } = await fetchAndCacheLiveData();
            setFestivalData(liveData.festivalData);
            setFestivalConfig(liveData.festivalConfig);
            setAllMovies(liveData.movies);
        } catch (error) {
            console.error("Failed to load festival data:", error);
        } finally {
            setIsLoading(false);
        }
    };
    initPage();
  }, []);

  if (isLoading) {
      return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] text-white">
      <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

      <main className="flex-grow pt-16"> {/* Add padding for fixed header */}
        <FestivalView 
            festivalData={festivalData}
            festivalConfig={festivalConfig}
            allMovies={allMovies}
        />
      </main>

      <Footer />
      <BackToTopButton />
    </div>
  );
};

export default FestivalPage;