import React, { useState, useEffect } from 'react';
import { moviesData as initialMoviesData, categoriesData as initialCategoriesData, festivalData as initialFestivalData, festivalConfigData as initialFestivalConfigData } from './constants.ts';
import { Movie, Category, FestivalDay, FestivalConfig } from './types.ts';
import MovieEditor from './components/MovieEditor.tsx';
import Header from './components/Header.tsx';
import Footer from './components/Footer.tsx';
import FestivalEditor from './components/FestivalEditor.tsx';

// Helper to format the current date/time for a datetime-local input
const getLocalDatetimeString = () => {
    const now = new Date();
    // Adjust for timezone offset to get local time
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    // Format as 'YYYY-MM-DDTHH:MM'
    return now.toISOString().slice(0, 16);
};

const AdminPage: React.FC = () => {
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
  const [festivalConfig, setFestivalConfig] = useState<FestivalConfig>(initialFestivalConfigData);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isFestivalLiveAdmin, setIsFestivalLiveAdmin] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);
  const [packagingError, setPackagingError] = useState('');


  useEffect(() => {
    // Check session storage for auth status on initial load
    if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
        setIsAuthenticated(true);
    }
    
    // Check feature toggles status from localStorage
    const festivalStatus = localStorage.getItem('crateTv_isFestivalLive');
    setIsFestivalLiveAdmin(festivalStatus === 'true');

    // On initial load, try to get data from localStorage, otherwise use initial data
    try {
        const storedMovies = localStorage.getItem('crateTvAdmin_movies');
        const storedCategories = localStorage.getItem('crateTvAdmin_categories');
        const storedFestival = localStorage.getItem('crateTvAdmin_festival');
        const storedFestivalConfig = localStorage.getItem('crateTvAdmin_festivalConfig');
        
        setMovies(storedMovies ? JSON.parse(storedMovies) : initialMoviesData);
        setCategories(storedCategories ? JSON.parse(storedCategories) : initialCategoriesData);
        setFestivalData(storedFestival ? JSON.parse(storedFestival) : initialFestivalData);
        setFestivalConfig(storedFestivalConfig ? JSON.parse(storedFestivalConfig) : initialFestivalConfigData);

    } catch (e) {
        console.error("Failed to parse data from localStorage", e);
        setMovies(initialMoviesData);
        setCategories(initialCategoriesData);
        setFestivalData(initialFestivalData);
        setFestivalConfig(initialFestivalConfigData);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsAuthenticating(true);

    try {
        const response = await fetch('/api/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });

        if (response.ok) {
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            // Store password for use in authenticated API calls like file uploads
            sessionStorage.setItem('adminPassword', password);
            setIsAuthenticated(true);
        } else {
            const data = await response.json();
            setLoginError(data.error || 'Login failed.');
        }
    } catch (error) {
        setLoginError('An error occurred. Please try again.');
    } finally {
        setIsAuthenticating(false);
    }
  };
  
  const persistChangesToPreview = (
    newMovies: Record<string, Movie>,
    newCategories: Record<string, Category>,
    newFestivalData: FestivalDay[],
    newFestivalConfig: FestivalConfig
  ) => {
    localStorage.setItem('crateTvAdmin_movies', JSON.stringify(newMovies));
    localStorage.setItem('crateTvAdmin_categories', JSON.stringify(newCategories));
    localStorage.setItem('crateTvAdmin_festival', JSON.stringify(newFestivalData));
    localStorage.setItem('crateTvAdmin_festivalConfig', JSON.stringify(newFestivalConfig));
  };

  const handleDownloadConstants = () => {
    const content = `import { Category, Movie, FestivalDay, FestivalConfig } from './types.ts';

export const festivalConfigData: FestivalConfig = ${JSON.stringify(festivalConfig, null, 2)};

export const categoriesData: Record<string, Category> = ${JSON.stringify(categories, null, 2)};

export const moviesData: Record<string, Movie> = ${JSON.stringify(movies, null, 2)};

export const festivalData: FestivalDay[] = ${JSON.stringify(festivalData, null, 2)};
`;
    const blob = new Blob([content], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'constants.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleDownloadRokuZip = async () => {
      setIsPackaging(true);
      setPackagingError('');
      try {
          const response = await fetch('/api/generate-roku-zip');
          if (!response.ok) {
              const errorText = await response.text();
              console.error('Roku packaging error response:', errorText);
              throw new Error(`Server returned status ${response.status}`);
          }
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'cratv.zip';
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
      } catch (error) {
          console.error('Download failed:', error);
          setPackagingError('An error occurred while packaging the channel. Check the console for details.');
      } finally {
          setIsPackaging(false);
      }
  };

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsAddingNew(false);
  };
  
  const handleAddNewMovie = () => {
    const newMovie: Movie = {
      key: `newmovie${Date.now()}`,
      title: '',
      synopsis: '',
      cast: [],
      director: '',
      trailer: '',
      fullMovie: '',
      poster: '',
      tvPoster: '',
      likes: 0,
      releaseDateTime: getLocalDatetimeString(),
    };
    setSelectedMovie(newMovie);
    setIsAddingNew(true);
  };
  
  const handleCancel = () => {
    setSelectedMovie(null);
    setIsAddingNew(false);
  };

  const handleSave = (updatedMovie: Movie) => {
    const newMovies = { ...movies, [updatedMovie.key]: updatedMovie };
    setMovies(newMovies);
    persistChangesToPreview(newMovies, categories, festivalData, festivalConfig);
    setSelectedMovie(null);
    setIsAddingNew(false);
  };

  const handleDelete = (movieKey: string) => {
    if (window.confirm('This will update the preview to delete this movie. You must "Publish Changes" to make it permanent. Are you sure?')) {
        const newMovies = { ...movies };
        delete newMovies[movieKey];
        setMovies(newMovies);
        
        const newCategories = { ...categories };
        Object.keys(newCategories).forEach(catKey => {
            newCategories[catKey].movieKeys = newCategories[catKey].movieKeys.filter(key => key !== movieKey);
        });
        setCategories(newCategories);
        
        persistChangesToPreview(newMovies, newCategories, festivalData, festivalConfig);
        setSelectedMovie(null);
    }
  };
  
  const handleSaveFestival = (updatedFestivalData: FestivalDay[], updatedFestivalConfig: FestivalConfig) => {
    setFestivalData(updatedFestivalData);
    setFestivalConfig(updatedFestivalConfig);
    persistChangesToPreview(movies, categories, updatedFestivalData, updatedFestivalConfig);
  };

  const toggleFestivalLive = () => {
      const newStatus = !isFestivalLiveAdmin;
      setIsFestivalLiveAdmin(newStatus);
      localStorage.setItem('crateTv_isFestivalLive', String(newStatus));
      alert(`Film Festival module has been ${newStatus ? 'made LIVE' : 'taken DOWN'}. Changes will be visible on the homepage for all users on their next page load.`);
  };


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
          <h1 className="text-2xl font-bold mb-6 text-center text-white">Admin Login</h1>
          <form onSubmit={handleAuth}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
              disabled={isAuthenticating}
            />
            {loginError && <p className="text-red-500 text-sm mt-2 text-center">{loginError}</p>}
            <button type="submit" className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-red-800 disabled:cursor-not-allowed" disabled={isAuthenticating}>
              {isAuthenticating ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
      <main className="flex-grow p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-bold mb-8">Admin Panel</h1>
          
           <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
                <h2 className="text-xl sm:text-2xl font-bold mb-3 text-green-400">Live Feature Toggles</h2>
                <p className="text-gray-400 mb-4 max-w-3xl">
                    Control the visibility of major site features for all users in real-time.
                </p>
                <div className="space-y-4">
                  {/* Festival Toggle */}
                  <div className="flex items-center gap-4">
                      <button
                          onClick={toggleFestivalLive}
                          className={`font-bold py-2 px-5 rounded-md transition-colors w-44 text-center ${
                              isFestivalLiveAdmin
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                      >
                          {isFestivalLiveAdmin ? 'Take Festival Down' : 'Make Festival Live'}
                      </button>
                      <span className={`text-sm font-semibold ${isFestivalLiveAdmin ? 'text-green-400' : 'text-gray-500'}`}>
                          Film Festival is currently {isFestivalLiveAdmin ? 'LIVE' : 'HIDDEN'}
                      </span>
                  </div>
                </div>
            </div>

           {/* Roku Packager Section */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 text-red-400">Automated Roku Channel Packager</h2>
              <p className="text-gray-400 mb-4 max-w-3xl">
                  This tool automatically generates a ready-to-upload Roku channel ZIP file. It uses your website's current URL to create the data feed, so it's best to use this after deploying your site to a public address (like Vercel).
              </p>
              <button
                onClick={handleDownloadRokuZip}
                disabled={isPackaging}
                className="inline-block bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-bold py-2 px-5 rounded-md transition-colors"
              >
                {isPackaging ? 'Generating...' : 'Generate & Download Roku ZIP'}
              </button>
              {packagingError && <p className="text-red-500 text-sm mt-2">{packagingError}</p>}
          </div>

           {/* Publish Section */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 text-yellow-400">Publish Changes</h2>
              <p className="text-gray-400 mb-4 max-w-3xl">
                  Your changes are saved in this browser for a live preview. To make them permanent for all users, download the updated constants file, replace `constants.ts` in your project, and then redeploy your application.
              </p>
              <button
                  onClick={handleDownloadConstants}
                  className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-2 px-5 rounded-md transition-colors"
              >
                  Download constants.ts
              </button>
          </div>
          
          {/* Festival Editor Section */}
           <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
              <FestivalEditor
                initialData={festivalData}
                initialConfig={festivalConfig}
                allMovies={movies}
                onSave={handleSaveFestival}
              />
          </div>

          <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold">Content Management</h2>
              <button
                  onClick={handleAddNewMovie}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-sm sm:text-base"
              >
                  Add New Movie
              </button>
          </div>

          {selectedMovie ? (
            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg border border-gray-700">
              <MovieEditor 
                movie={selectedMovie}
                onSave={handleSave}
                onCancel={handleCancel}
                onDelete={handleDelete}
              />
            </div>
          ) : (
            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Select a Movie to Edit</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.values(movies).sort((a, b) => a.title.localeCompare(b.title)).map(movie => (
                  <div key={movie.key} className="group" onClick={() => handleSelectMovie(movie)}>
                    <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden cursor-pointer bg-gray-900 transition-transform duration-300 ease-in-out hover:scale-105">
                        <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <p className="text-sm mt-2 text-center truncate group-hover:text-red-400 cursor-pointer">{movie.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminPage;