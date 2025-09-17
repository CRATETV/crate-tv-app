import React, { useState, useEffect } from 'react';
import { moviesData as initialMoviesData, categoriesData as initialCategoriesData, festivalData as initialFestivalData, festivalConfigData as initialFestivalConfigData } from './constants.ts';
import { Movie, Category, FestivalDay, FestivalConfig } from './types.ts';
import MovieEditor from './components/MovieEditor.tsx';
import Footer from './components/Footer.tsx';
import FestivalEditor from './components/FestivalEditor.tsx';
import { fetchAndCacheLiveData, invalidateCache } from './services/dataService.ts';

// Helper to format the current date/time for a datetime-local input
const getLocalDatetimeString = () => {
    const now = new Date();
    // Adjust for timezone offset to get local time
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    // Format as 'YYYY-MM-DDTHH:MM'
    return now.toISOString().slice(0, 16);
};

const StatCard: React.FC<{ title: string; value: string | number; icon: JSX.Element }> = ({ title, value, icon }) => (
    <div className="bg-gray-800 p-4 rounded-lg flex items-center gap-4 border border-gray-700">
        <div className="bg-gray-700 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);


const AdminPage: React.FC = () => {
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
  const [festivalConfig, setFestivalConfig] = useState<FestivalConfig>(initialFestivalConfigData);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [loggedInWithMaster, setLoggedInWithMaster] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [hasElevatedPrivileges, setHasElevatedPrivileges] = useState(false);
  
  // Auto-publishing state
  const [autoPublishStatus, setAutoPublishStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [autoPublishError, setAutoPublishError] = useState('');
  
  // Sales Dashboard State
  const [salesData, setSalesData] = useState<{ totalRevenue: number; fullPassesSold: number; filmBlocksSold: number; individualFilmsSold: number; transactions: any[] } | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState('');
  
  // Roku Packager State
  const [isPackaging, setIsPackaging] = useState(false);

  const fetchAdminData = async () => {
    try {
        invalidateCache(); // Ensure fresh data on admin login
        const { data: liveData } = await fetchAndCacheLiveData();
        setMovies(liveData.movies);
        setCategories(liveData.categories);
        setFestivalData(liveData.festivalData);
        setFestivalConfig(liveData.festivalConfig);
    } catch (e) {
        console.error("Failed to fetch live data for admin, falling back to initial data.", e);
        setMovies(initialMoviesData);
        setCategories(initialCategoriesData);
        setFestivalData(initialFestivalData);
        setFestivalConfig(initialFestivalConfigData);
    }
  };

  useEffect(() => {
    // Check session storage for auth status on initial load
    if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
        setIsAuthenticated(true);
        if (sessionStorage.getItem('usedMasterKey') === 'true') {
            setLoggedInWithMaster(true);
        }
        if (sessionStorage.getItem('isDeveloperMode') === 'true') {
            setIsDeveloperMode(true);
        }
        if (sessionStorage.getItem('hasElevatedPrivileges') === 'true') {
            setHasElevatedPrivileges(true);
            fetchSalesData();
        }
        fetchAdminData();
    }
  }, []);

  const fetchSalesData = async () => {
    setIsLoadingSales(true);
    setSalesError('');
    try {
      const adminPassword = sessionStorage.getItem('adminPassword');
      if (!adminPassword) throw new Error('Authentication error. Please log in again.');

      const response = await fetch('/api/get-sales-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch sales data.');
      }
      
      const data = await response.json();
      setSalesData(data);
    } catch (error) {
      setSalesError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsLoadingSales(false);
    }
  };


  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginMessage('');
    setIsAuthenticating(true);

    try {
        const response = await fetch('/api/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });

        const data = await response.json();
        
        if (response.ok && (data.success || data.firstLogin)) {
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            sessionStorage.setItem('adminPassword', password);
            setIsAuthenticated(true);
            
            if (data.usedMasterKey) {
                sessionStorage.setItem('usedMasterKey', 'true');
                setLoggedInWithMaster(true);
            } else {
                sessionStorage.removeItem('usedMasterKey');
                setLoggedInWithMaster(false);
            }

            if (data.isDeveloper) {
                sessionStorage.setItem('isDeveloperMode', 'true');
                setIsDeveloperMode(true);
            } else {
                sessionStorage.removeItem('isDeveloperMode');
                setIsDeveloperMode(false);
            }

            if (data.hasElevatedPrivileges) {
                sessionStorage.setItem('hasElevatedPrivileges', 'true');
                setHasElevatedPrivileges(true);
                fetchSalesData();
            } else {
                sessionStorage.removeItem('hasElevatedPrivileges');
                setHasElevatedPrivileges(false);
            }

            if (data.firstLogin) {
                setLoginMessage("Setup complete! To secure your admin panel, add this password as the ADMIN_PASSWORD environment variable in your project's settings.");
            }
            
            fetchAdminData();
        } else {
            setLoginError(data.error || 'Login failed.');
        }
    } catch (error) {
        setLoginError('An error occurred. Please try again.');
    } finally {
        setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setIsAuthenticated(false);
    setIsDeveloperMode(false);
    setHasElevatedPrivileges(false);
    setPassword('');
    setLoginError('');
    setMovies({});
    setCategories({});
    setFestivalData([]);
    setSalesData(null);
  };

  const publishData = async (
    updatedData: {
        movies: Record<string, Movie>,
        categories: Record<string, Category>,
        festivalData: FestivalDay[],
        festivalConfig: FestivalConfig
    }
  ): Promise<boolean> => {
    setAutoPublishStatus('saving');
    setAutoPublishError('');
    try {
        const adminPassword = sessionStorage.getItem('adminPassword');
        if (!adminPassword) throw new Error('Authentication error. Please log in again.');

        const response = await fetch('/api/publish-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword, data: updatedData }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Publishing failed.');
        }

        invalidateCache();
        setAutoPublishStatus('success');
        setTimeout(() => setAutoPublishStatus('idle'), 2500);
        return true;

    } catch (error) {
        setAutoPublishStatus('error');
        setAutoPublishError(error instanceof Error ? error.message : 'An unknown error occurred.');
        return false;
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
      mainPageExpiry: '',
    };
    setSelectedMovie(newMovie);
    setIsAddingNew(true);
  };
  
  const handleCancel = () => {
    setSelectedMovie(null);
    setIsAddingNew(false);
  };

  const handleSave = async (updatedMovie: Movie) => {
    const newMovies = { ...movies, [updatedMovie.key]: updatedMovie };
    const success = await publishData({ movies: newMovies, categories, festivalData, festivalConfig });
    if (success) {
      setMovies(newMovies);
      setSelectedMovie(null);
      setIsAddingNew(false);
    }
  };

  const handleDelete = async (movieKey: string) => {
    if (window.confirm('This will immediately delete the movie from the live site. This action cannot be undone. Are you sure?')) {
        const newMovies = { ...movies };
        delete newMovies[movieKey];
        
        const newCategories = JSON.parse(JSON.stringify(categories));
        Object.keys(newCategories).forEach((catKey: string) => {
            newCategories[catKey].movieKeys = newCategories[catKey].movieKeys.filter((key: string) => key !== movieKey);
        });
        
        const success = await publishData({ movies: newMovies, categories: newCategories, festivalData, festivalConfig });

        if (success) {
            setMovies(newMovies);
            setCategories(newCategories);
            setSelectedMovie(null);
        }
    }
  };
  
  const handleSaveFestival = async (updatedFestivalData: FestivalDay[], updatedFestivalConfig: FestivalConfig) => {
    const success = await publishData({ movies, categories, festivalData: updatedFestivalData, festivalConfig: updatedFestivalConfig });
    if (success) {
      setFestivalData(updatedFestivalData);
      setFestivalConfig(updatedFestivalConfig);
    }
  };

  const handlePublishLiveStatus = async (isLive: boolean) => {
    const updatedConfig = { ...festivalConfig, isFestivalLive: isLive };
    const success = await publishData({
      movies,
      categories,
      festivalData,
      festivalConfig: updatedConfig,
    });
    if (success) {
      setFestivalConfig(updatedConfig);
    }
  };

  const toggleFestivalLive = async () => {
      const newStatus = !festivalConfig.isFestivalLive;
      const updatedConfig = { ...festivalConfig, isFestivalLive: newStatus };
      
      const success = await publishData({
          movies,
          categories,
          festivalData,
          festivalConfig: updatedConfig,
      });

      if (success) {
        setFestivalConfig(updatedConfig);
        alert(`Film Festival module status updated to: ${newStatus ? 'LIVE' : 'HIDDEN'}. The change is now live.`);
      } else {
        alert('Failed to update the festival status. Please check the error message on the page.');
      }
  };

  const handleGenerateRokuZip = async () => {
    setIsPackaging(true);
    try {
        const response = await fetch('/api/generate-roku-zip');
        if (!response.ok) {
            throw new Error('Failed to generate Roku package. Server responded with an error.');
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
        console.error('Roku packaging error:', error);
        alert('Could not generate the Roku package. Please check the console for errors.');
    } finally {
        setIsPackaging(false);
    }
  };

  const handleDownloadConstants = () => {
    const header = `import { Category, Movie, FestivalDay, FestivalConfig } from './types.ts';\n\n`;
    
    const festivalConfigString = `export const festivalConfigData: FestivalConfig = ${JSON.stringify(festivalConfig, null, 2)};\n\n`;
    const categoriesString = `export const categoriesData: Record<string, Category> = ${JSON.stringify(categories, null, 2)};\n\n`;
    const moviesString = `export const moviesData: Record<string, Movie> = ${JSON.stringify(movies, null, 2)};\n\n`;
    const festivalDataString = `export const festivalData: FestivalDay[] = ${JSON.stringify(festivalData, null, 2)};\n`;

    const fileContent = header + festivalConfigString + categoriesString + moviesString + festivalDataString;
    
    const blob = new Blob([fileContent], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'constants.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
          <h1 className="text-2xl font-bold mb-6 text-center text-white">Admin Login</h1>
          {loginMessage && <p className="text-green-400 text-sm mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md">{loginMessage}</p>}
          <form onSubmit={handleAuth}>
            <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500 pr-10"
                  disabled={isAuthenticating}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                >
                    {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.477 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          <path d="M2 10s3.939 4 8 4 8-4 8-4-3.939-4-8-4-8 4-8 4zm13.707 1.293a1 1 0 01-1.414 1.414l-1.473-1.473A3.003 3.003 0 0110 12a3 3 0 01-3-3 2.999 2.999 0 01.176-1.041l-1.56-1.56a1 1 0 111.414-1.414l1.473 1.473A3.003 3.003 0 0110 8a3 3 0 013 3c0 .54-.14 1.04-.383 1.464z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.523 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
            </div>
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
      <main className="flex-grow p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
           {loginMessage && <p className="text-green-400 text-sm mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md">{loginMessage}</p>}
           
           {loggedInWithMaster && (
                <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-300 text-sm rounded-lg p-4 mb-8">
                    <p className="font-bold mb-1">Security Notice: Logged in with Master Password</p>
                    <p>You have accessed the admin panel using the `ADMIN_MASTER_PASSWORD`. For maximum security, please update your primary `ADMIN_PASSWORD` in your Vercel project settings, then remove the `ADMIN_MASTER_PASSWORD` variable.</p>
                </div>
            )}

           <div className="flex justify-between items-start mb-8">
                <h1 className="text-2xl sm:text-4xl font-bold">Admin Panel</h1>
                <div className="flex items-center gap-4">
                    {autoPublishStatus !== 'idle' && (
                        <div className={`text-sm px-3 py-1 rounded-md ${
                            autoPublishStatus === 'saving' ? 'bg-blue-500/20 text-blue-300' :
                            autoPublishStatus === 'success' ? 'bg-green-500/20 text-green-300' :
                            'bg-red-500/20 text-red-300'
                        }`}>
                            {autoPublishStatus === 'saving' && 'Saving...'}
                            {autoPublishStatus === 'success' && '✓ Saved & Published'}
                            {autoPublishStatus === 'error' && 'Error Saving!'}
                        </div>
                    )}
                    <button onClick={handleLogout} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md text-sm">
                        Log Out
                    </button>
                </div>
            </div>
          {autoPublishStatus === 'error' && <p className="text-red-400 text-sm mb-4 -mt-6">{autoPublishError}</p>}
          
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
                          disabled={autoPublishStatus === 'saving'}
                          className={`font-bold py-2 px-5 rounded-md transition-colors w-44 text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                              festivalConfig.isFestivalLive
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                      >
                          {autoPublishStatus === 'saving' ? '...' : (festivalConfig.isFestivalLive ? 'Take Festival Down' : 'Make Festival Live')}
                      </button>
                      <span className={`text-sm font-semibold ${festivalConfig.isFestivalLive ? 'text-green-400' : 'text-gray-500'}`}>
                          Film Festival is currently {festivalConfig.isFestivalLive ? 'LIVE' : 'HIDDEN'}
                      </span>
                  </div>
                </div>
            </div>
          
          {hasElevatedPrivileges && (
            <>
                {/* Sales Dashboard Section */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-green-400">Sales Dashboard</h2>
                        <button onClick={fetchSalesData} disabled={isLoadingSales} className="text-sm bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md disabled:opacity-50">
                            {isLoadingSales ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                    {isLoadingSales && (
                        <div className="text-center py-8">
                            <p className="text-gray-400">Loading sales data...</p>
                        </div>
                    )}
                    {salesError && (
                        <div className="text-center py-8 text-red-400">
                            <p>Error: {salesError}</p>
                        </div>
                    )}
                    {salesData && !isLoadingSales && (
                        <div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <StatCard title="Total Revenue" value={`$${salesData.totalRevenue.toFixed(2)}`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>} />
                                <StatCard title="Full Passes Sold" value={salesData.fullPassesSold} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>} />
                                <StatCard title="Film Blocks Sold" value={salesData.filmBlocksSold} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} />
                                <StatCard title="Individual Films Sold" value={salesData.individualFilmsSold} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>} />
                            </div>
                            <h3 className="text-lg font-semibold mb-2 text-gray-300">Recent Transactions</h3>
                            <div className="overflow-x-auto max-h-64">
                                <table className="w-full text-sm text-left text-gray-400">
                                    <thead className="text-xs text-gray-300 uppercase bg-gray-700 sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-4 py-2">Date</th>
                                            <th scope="col" className="px-4 py-2">Item</th>
                                            <th scope="col" className="px-4 py-2">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salesData.transactions.map((tx, index) => (
                                            <tr key={index} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                                <td className="px-4 py-2">{new Date(tx.date).toLocaleString()}</td>
                                                <td className="px-4 py-2">{tx.item}</td>
                                                <td className="px-4 py-2 font-medium text-white">${tx.amount.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {salesData.transactions.length === 0 && <p className="text-center py-4 text-gray-500">No transactions found for the last 90 days.</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Festival Editor Section */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
                    <FestivalEditor
                        initialData={festivalData}
                        initialConfig={festivalConfig}
                        allMovies={movies}
                        onSave={handleSaveFestival}
                        onPublishLiveStatus={handlePublishLiveStatus}
                    />
                </div>
            </>
          )}

           {/* Roku Channel Packager */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
                <h2 className="text-xl sm:text-2xl font-bold mb-3 text-cyan-400">Automated Roku Channel Packager</h2>
                <p className="text-gray-400 mb-4 max-w-3xl">
                    Generate a ready-to-upload ZIP file for the Crate TV Roku channel. The channel will automatically be configured to pull content from your live website.
                </p>
                <button
                    onClick={handleGenerateRokuZip}
                    disabled={isPackaging}
                    className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 text-white font-bold py-2 px-5 rounded-md transition-colors"
                >
                    {isPackaging ? 'Packaging...' : 'Generate & Download Roku ZIP'}
                </button>
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

          {/* Developer Tools Section */}
          {isDeveloperMode && (
              <div className="bg-gray-800 p-6 rounded-lg border border-red-700 mt-8">
                  <h2 className="text-xl sm:text-2xl font-bold mb-3 text-red-400">Developer Tools</h2>
                  <p className="text-gray-400 mb-4 max-w-3xl">
                      Download the current live content data as a `constants.ts` file. This is useful for creating a local backup or for manual bulk edits.
                  </p>
                  <button
                      onClick={handleDownloadConstants}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                  >
                      Download constants.ts
                  </button>
              </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminPage;