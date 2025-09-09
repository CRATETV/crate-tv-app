import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { moviesData as initialMoviesData, categoriesData as initialCategoriesData } from '../constants.ts';
import { Movie, Actor } from '../types.ts';
import Header from './Header.tsx';
import BackToTopButton from './BackToTopButton.tsx';
import MovieDetailsModal from './MovieDetailsModal.tsx';
import ActorBioModal from './ActorBioModal.tsx';
import MovieCard from './MovieCard.tsx';
import StagingBanner from './StagingBanner.tsx';

// Data for new features
const classicGenreMap: Record<string, string> = {
  'atriptothemoon': 'Sci-Fi',
  'suspense': 'Suspense',
  'thepawnshop': 'Comedy',
  'theimmigrant': 'Comedy',
  'thefallofthehouseofusher': 'Avant-Garde',
  'unchienandalou': 'Avant-Garde',
  'meshesofafternoon': 'Avant-Garde',
  'bridelessgroom': 'Comedy',
};

const filmmakers = [
    {
        name: 'Georges Méliès',
        bioSnippet: 'A French illusionist and film director who led many technical and narrative developments in the earliest days of cinema.',
        photo: 'https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Me%CC%81lie%CC%80s_portrait_(cropped).jpg'
    },
    {
        name: 'Charlie Chaplin',
        bioSnippet: 'An English comic actor, filmmaker, and composer who rose to fame in the era of silent film, becoming a worldwide icon.',
        photo: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Charlie_Chaplin.jpg'
    },
    {
        name: 'Lois Weber',
        bioSnippet: 'An American silent film actress, screenwriter, producer, and director, identified as the most important female director the industry has known.',
        photo: 'https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/LoisWeber.jpg'
    },
];

const genreFilters = ['All', 'Comedy', 'Sci-Fi', 'Suspense', 'Avant-Garde'];

const ClassicsPage: React.FC = () => {
  const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [categories, setCategories] = useState(initialCategoriesData);
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  const [isStaging, setIsStaging] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const movieGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for staging environment
    const params = new URLSearchParams(window.location.search);
    const env = params.get('env');
    if (env === 'staging') {
      sessionStorage.setItem('crateTvStaging', 'true');
      setIsStaging(true);
    } else if (sessionStorage.getItem('crateTvStaging') === 'true') {
      setIsStaging(true);
    }

    // Check for admin-edited data in localStorage for live preview
    const storedMovies = localStorage.getItem('crateTvAdmin_movies');
    const storedCategories = localStorage.getItem('crateTvAdmin_categories');
    
    let moviesDataSource = initialMoviesData;
    if (storedMovies) {
        moviesDataSource = JSON.parse(storedMovies);
        setCategories(JSON.parse(storedCategories || '{}'));
    }
  
    // Initialize movies with likes from local storage
    const newMoviesState = { ...moviesDataSource };
    Object.keys(newMoviesState).forEach(key => {
      const storedLikes = localStorage.getItem(`cratetv-${key}-likes`);
      if (storedLikes) {
        newMoviesState[key].likes = parseInt(storedLikes, 10);
      }
    });
    setMovies(newMoviesState);

    // Initialize the set of liked movies
    const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
    if (storedLikedMovies) {
      setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
    }
  }, []);

  const classicFilms = useMemo(() => {
    if (!categories.publicDomainIndie) return [];
    
    const allClassics = categories.publicDomainIndie.movieKeys
      .map(key => movies[key])
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate) : new Date(0);
        const dateB = b.releaseDate ? new Date(b.releaseDate) : new Date(0);
        return dateA.getTime() - dateB.getTime();
      });

    if (activeFilter === 'All') {
      return allClassics;
    }
    
    // Check if filter is a director's name
    if (filmmakers.some(f => f.name === activeFilter)) {
        return allClassics.filter(movie => movie.director.includes(activeFilter));
    }
    
    // Otherwise, filter by genre
    return allClassics.filter(movie => classicGenreMap[movie.key] === activeFilter);
      
  }, [movies, categories, activeFilter]);

  const handleDirectorClick = (directorName: string) => {
      setActiveFilter(directorName);
      movieGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectMovie = useCallback((movie: Movie) => {
    setDetailsMovie(movie);
  }, []);
  
  const handleCloseDetailsModal = useCallback(() => {
    setDetailsMovie(null);
  }, []);

  const handleSelectActor = (actor: Actor) => {
    setSelectedActor(actor);
  };
  
  const handleCloseActorModal = () => {
    setSelectedActor(null);
  };
  
  const exitStaging = () => {
    sessionStorage.removeItem('crateTvStaging');
    const params = new URLSearchParams(window.location.search);
    params.delete('env');
    window.location.search = params.toString();
  };

  const toggleLikeMovie = useCallback((movieKey: string) => {
    const newLikedMovies = new Set(likedMovies);
    let likesChange = 0;

    if (newLikedMovies.has(movieKey)) {
      newLikedMovies.delete(movieKey);
      likesChange = -1;
    } else {
      newLikedMovies.add(movieKey);
      likesChange = 1;
    }

    setLikedMovies(newLikedMovies);
    localStorage.setItem('cratetv-likedMovies', JSON.stringify(Array.from(newLikedMovies)));

    setMovies(prevMovies => {
      const updatedMovie = { 
        ...prevMovies[movieKey], 
        likes: Math.max(0, (prevMovies[movieKey].likes || 0) + likesChange) 
      };
      localStorage.setItem(`cratetv-${movieKey}-likes`, updatedMovie.likes.toString());
      return { ...prevMovies, [movieKey]: updatedMovie };
    });
  }, [likedMovies]);
  
  return (
    <div className="flex flex-col min-h-screen bg-[#141414] text-white">
      {isStaging && <StagingBanner onExit={exitStaging} />}
      <Header 
        searchQuery="" 
        onSearch={() => {}} 
        isScrolled={true}
        onMobileSearchClick={() => {}}
        isStaging={isStaging}
        showSearch={false}
      />
      
      <main className="flex-grow pt-24 px-4 md:px-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Classic Independent Films</h1>
            <p className="text-lg text-gray-400 mb-6">
              Independent films have always been the lifeblood of cinematic innovation. Free from the constraints of the studio system, these works often pushed the boundaries of storytelling, visual style, and thematic depth.
            </p>
        </div>

        {/* Filmmaker Spotlights */}
        <div className="max-w-6xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Filmmaker Spotlights</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {filmmakers.map(filmmaker => (
                    <div key={filmmaker.name} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center text-center transform transition-transform duration-300 hover:scale-105 hover:border-red-500">
                        <img src={filmmaker.photo} alt={filmmaker.name} className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-gray-600"/>
                        <h3 className="text-2xl font-bold text-white mb-2">{filmmaker.name}</h3>
                        <p className="text-gray-400 text-sm mb-4 flex-grow">{filmmaker.bioSnippet}</p>
                        <button 
                            onClick={() => handleDirectorClick(filmmaker.name)}
                            className="mt-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors w-full"
                        >
                            View Films
                        </button>
                    </div>
                ))}
            </div>
        </div>
        
        {/* Collection Grid with Filters */}
        <div ref={movieGridRef} id="classics-collection" className="max-w-7xl mx-auto border-t border-gray-800 pt-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">Explore the Collection</h2>
            <div className="flex justify-center flex-wrap gap-3 mb-8">
                {genreFilters.map(filter => (
                    <button 
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${activeFilter === filter ? 'bg-white text-black' : 'bg-gray-700/60 text-gray-300 hover:bg-gray-600'}`}
                    >
                        {filter}
                    </button>
                ))}
                 {filmmakers.map(filmmaker => (
                     <button
                        key={filmmaker.name}
                        onClick={() => setActiveFilter(filmmaker.name)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${activeFilter === filmmaker.name ? 'bg-white text-black' : 'bg-gray-700/60 text-gray-300 hover:bg-gray-600'}`}
                     >
                        {filmmaker.name}
                     </button>
                 ))}
            </div>
            
            {classicFilms.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mb-16">
                    {classicFilms.map(movie => (
                       <div key={movie.key} className="animate-[fadeIn_0.5s_ease-out]">
                         <MovieCard
                            movie={movie}
                            onSelectMovie={handleSelectMovie}
                         />
                       </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <h3 className="text-xl font-bold text-white">No films found</h3>
                    <p className="text-gray-400 mt-2">No classic films match the "{activeFilter}" filter.</p>
                </div>
            )}
        </div>
      </main>

      <BackToTopButton />

      {detailsMovie && (
        <MovieDetailsModal
            movie={movies[detailsMovie.key] || detailsMovie}
            isLiked={likedMovies.has(detailsMovie.key)}
            onToggleLike={toggleLikeMovie}
            onClose={handleCloseDetailsModal}
            onSelectActor={handleSelectActor}
            allMovies={movies}
            allCategories={categories}
            onSelectRecommendedMovie={handleSelectMovie}
        />
      )}
      {selectedActor && (
          <ActorBioModal actor={selectedActor} onClose={handleCloseActorModal} />
      )}
    </div>
  );
};

export default ClassicsPage;