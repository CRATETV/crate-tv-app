

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
// FIX: Corrected import path for types to be relative.
import { Movie, Actor, Category } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import ActorBioModal from './ActorBioModal';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';
// FIX: Corrected casing for BackToTopButton import.
import BackToTopButton from './BackToTopButton';
import SearchOverlay from './SearchOverlay';
import StagingBanner from './StagingBanner';
import DirectorCreditsModal from './DirectorCreditsModal';
import Countdown from './Countdown';
import CastButton from './CastButton';
import RokuBanner from './RokuBanner';
import SquarePaymentModal from './SquarePaymentModal';
import DonationSuccessModal from './DonationSuccessModal';
import { isMovieReleased } from '../constants';
import Footer from './Footer';

declare const google: any; // Declare Google IMA SDK global

interface MoviePageProps {
  movieKey: string;
}

type PlayerMode = 'poster' | 'full';

// Helper function to create/update meta tags
const setMetaTag = (attr: 'name' | 'property', value: string, content: string) => {
  let element = document.querySelector(`meta[${attr}="${value}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, value);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

// A self-contained component for displaying a recommended movie.
const RecommendedMovieLink: React.FC<{ movie: Movie }> = ({ movie }) => {
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        window.scrollTo(0, 0); // Scroll to top for a new page feel
    };

    return (
        <a
            href={`/movie/${movie.key}`}
            onClick={(e) => handleNavigate(e, `/movie/${movie.key}`)}
            className="group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer transform transition-transform duration-300 hover:scale-105 bg-gray-900"
        >
              <img 
                  src={movie.poster} 
                  alt={movie.title} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onContextMenu={(e) => e.preventDefault()}
              />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </a>
    );
}

const MoviePage: React.FC<MoviePageProps> = ({ movieKey }) => {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
  const [allCategories, setAllCategories] = useState<Record<string, Category>>({});
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [selectedDirector, setSelectedDirector] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [released, setReleased] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasTrackedViewRef = useRef(false);

  // Like state
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);

  // Player state
  const [playerMode, setPlayerMode] = useState<PlayerMode>('poster');
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  
  // Staging and feature toggles
  const [isStaging, setIsStaging] = useState(false);
  const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);
  
  // Payment Modal State
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isDonationSuccessModalOpen, setIsDonationSuccessModalOpen] = useState(false);
  const [lastDonationDetails, setLastDonationDetails] = useState<{amount: number; email?: string} | null>(null);

  // Ad State
  const adContainerRef = useRef<HTMLDivElement>(null);
  const adsLoaderRef = useRef<any>(null);
  const adsManagerRef = useRef<any>(null);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);


  const playContent = useCallback(() => {
    setIsAdPlaying(false);
    if (videoRef.current) {
        if (