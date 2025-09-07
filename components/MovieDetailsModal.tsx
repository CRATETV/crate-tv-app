import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Movie, Actor, Category } from '../types.ts';
import DirectorCreditsModal from './DirectorCreditsModal.tsx';

interface MovieDetailsModalProps {
  movie: Movie;
  isLiked: boolean;
  onToggleLike: (movieKey: string) => void;
  onClose: (clearUrl?: boolean) => void;
  onSelectActor: (actor: Actor) => void;
  allMovies: Record<string, Movie>;
  allCategories: Record<string, Category>;
  onSelectRecommendedMovie: (movie: Movie) => void;
}

type PlayerMode = 'poster' | 'full';

const RecommendedMovieCard: React.FC<{ movie: Movie; onClick: (movie: Movie) => void; }> = ({ movie, onClick }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    return (
        <div
            className="group cursor-pointer rounded-md overflow-hidden"
            onClick={() => onClick(movie)}
        >
            <div className="relative aspect-[3/4] bg-gray-800 overflow-hidden">
                <img
                    src={movie.poster}
                    alt={movie.title}
                    className={`w-full h-full object-cover transition-all duration-500 ease-in-out ${isLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-50 scale-110 blur-md'}`}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => setIsLoaded(true)}
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
        </div>
    );
};


const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({ 
  movie, 
  isLiked,
  onToggleLike,
  onClose, 
  onSelectActor, 
  all