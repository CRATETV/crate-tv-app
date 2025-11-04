

import React, { useState, useMemo } from 'react';
import { Movie, Actor, Category } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { isMovieReleased } from '../constants';

interface MovieDetailsModalProps {
  movie: Movie;
  isLiked: boolean;
  onToggleLike: (movieKey: string) => void;
  onClose: () => void;
  onSelectActor: (actor: Actor) => void;
  allMovies: Record<string, Movie>;
  allCategories: Record<string, Category>;
  onSelectRecommendedMovie: (movie: Movie) => void;
  isPremiumMovie?: boolean;
  isPremiumSubscriber?: boolean;
  onSubscribe?: () => void;
}

// A smaller, self-contained card for recommended movies inside the modal.
const RecommendedMovieCard: React.FC<{ movie: Movie; onClick: (movie: Movie) => void }> = ({ movie, onClick }) => (
    <div className="group relative aspect-[3/4] rounded-md overflow-hidden cursor-pointer" onClick={() => onClick(movie)}>
        <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
            <h4 className="text-white text-sm font-bold">{movie.title}</h4>
        </div>
    </div>
);


const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({
  movie,
  isLiked,
  onToggleLike,
  onClose,
  onSelectActor,
  allMovies,
  allCategories,
  onSelectRecommendedMovie,
  isPremiumMovie = false,
  isPremiumSubscriber = false,
  onSubscribe
}) => {
    const { user } = useAuth();
    const [isCreatingParty, setIsCreatingParty] = useState(false);
    
    const recommendedMovies = React.useMemo(() => {
        if (!movie) return [];
        const recommendedKeys = new Set<string>();
        // FIX: Cast the parameter `cat` to type `Category` to resolve TypeScript inference errors.
        const currentMovieCategories = Object.values(allCategories).filter((cat: Category) => cat.movieKeys.includes(movie.key));
        currentMovieCategories.forEach((cat: Category) => {
            cat.movieKeys.forEach(key => {
                if (key !== movie.key) recommendedKeys.add(key);
            });
        });
        return Array.from(recommendedKeys).map(key => allMovies[key]).filter(Boolean).slice(0, 5);
    }, [movie, allMovies, allCategories]);

    const canWatch = !isPremiumMovie || (isPremiumMovie && isPremiumSubscriber);
    const isReleased = isMovieReleased(movie);
    const canStartWatchParty = isReleased && movie.isWatchPartyEligible;

    const handlePlay = () => {
        if (canWatch) {
            window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
            window.dispatchEvent(new Event('pushstate'));
        } else if (onSubscribe) {
            onSubscribe();
        }
    }

    const handleCreateWatchParty = async () => {
        if (isCreatingParty) return;
        setIsCreatingParty(true);
        try {
            const response = await fetch('/api/create-watch-party', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey: movie.key }),
            });
            if (!response.ok) throw new Error('Failed to create party.');
            const { partyId } = await response.json();
            window.history.pushState({}, '', `/watch-party/${partyId}`);
            window.dispatchEvent(new Event('pushstate'));
        } catch (error) {
            console.error('Watch Party Error:', error);
            // Optionally show an error to the user
            setIsCreatingParty(false);
        }
    };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
      <div className="bg-[#181818] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="relative h-64 md:h-96">
          <img src={movie.poster} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] to-transparent"></div>
          <div className="absolute bottom-8 left-8 text-white z-10">
            <h1 className="text-4xl font-bold">{movie.title}</h1>
            <div className="flex items-center gap-4 mt-4">
                <button onClick={handlePlay} className="flex items-center justify-center px-6 py-2 bg-white text-black font-bold rounded-md hover:bg-gray-300 transition-colors">
                    {canWatch ? (
                        <><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>Play</>
                    ) : (
                        <><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>Join Premium</>
                    )}
                </button>
              <button onClick={() => onToggleLike(movie.key)} className="h-10 w-10 flex items-center justify-center rounded-full border-2 border-gray-400 text-white hover:border-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isLiked ? 'text-red-500' : 'text-inherit'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </button>
              {user && canStartWatchParty && (
                  <button 
                      onClick={handleCreateWatchParty} 
                      disabled={isCreatingParty}
                      className="flex items-center justify-center px-4 py-2 bg-blue-600/80 text-white font-bold rounded-md hover:bg-blue-700/80 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      {isCreatingParty ? 'Starting...' : 'Start a Watch Party'}
                  </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <p className="text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Cast</h3>
              <div className="space-y-2 text-white">
                {movie.cast.map(actor => (
                  <p key={actor.name} className="group cursor-pointer" onClick={() => onSelectActor(actor)}><span className="group-hover:text-red-400 transition">{actor.name}</span></p>
                ))}
              </div>
              <h3 className="text-lg font-semibold text-gray-400 mt-4 mb-2">Director</h3>
              <p className="text-white">{movie.director}</p>
            </div>
          </div>
          
          {recommendedMovies.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-700">
                  <h2 className="text-xl font-bold text-white mb-4">More Like This</h2>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {recommendedMovies.map(recMovie => (
                          <RecommendedMovieCard key={recMovie.key} movie={recMovie} onClick={onSelectRecommendedMovie} />
                      ))}
                  </div>
              </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default MovieDetailsModal;