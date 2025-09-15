import React, { useState, useEffect } from 'react';
// FIX: Imported the 'LiveData' type to resolve 'Cannot find name' errors.
import { fetchAndCacheLiveData, invalidateCache, LiveData } from './services/dataService.ts';
import { Movie, Category, FestivalDay, FestivalConfig, FilmBlock } from './types.ts';
import MovieEditor from './components/MovieEditor.tsx';
import Footer from './components/Footer.tsx';
import ConstantsUploader from './components/ConstantsUploader.tsx';

// Helper to format the current date/time for a datetime-local input
const getLocalDatetimeString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
};

// --- MovieSelectorModal Component (Used by Festival Editor) ---
interface MovieSelectorModalProps {
  allMovies: Movie[];
  initialSelectedKeys: string[];
  onSave: (newMovieKeys: string[]) => void;
  onClose: () => void;
}
const MovieSelectorModal: React.FC<MovieSelectorModalProps> = ({ allMovies, initialSelectedKeys, onSave, onClose }) => {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(initialSelectedKeys));
  const [searchTerm, setSearchTerm] = useState('');

  const toggleSelection = (key: string) => {
    const newSelection = new Set(selectedKeys);
    if (newSelection.has(key)) newSelection.delete(key);
    else newSelection.add(key);
    setSelectedKeys(newSelection);
  };

  const handleSave = () => onSave(Array.from(selectedKeys));

  const filteredMovies = allMovies
    .filter(movie => movie.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col border border-gray-600" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">Select Films</h3>
          <input type="text" placeholder="Search films..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full mt-2 form-input" />
        </div>
        <div className="p-4 overflow-y-auto">
          <div className="space-y-2">
            {filteredMovies.map(movie => (
              <label key={movie.key} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                <input type="checkbox" checked={selectedKeys.has(movie.key)} onChange={() => toggleSelection(movie.key)} className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-red-500 focus:ring-red-500" />
                <img src={movie.poster} alt="" className="w-10 h-10 object-cover rounded-md" />
                <span className="text-gray-200">{movie.title}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-700 flex justify-end gap-4">
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">Cancel</button>
          <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">Save Selection</button>
        </div>
      </div>
    </div>
  );
};

// Main Admin Page
const AdminPage: React.FC = () => {
  const [data, setData] = useState<LiveData | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [publishStatus, setPublishStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [publishError, setPublishError] = useState('');
  const [activeTab, setActiveTab] = useState('festival');
  const [editingBlock, setEditingBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);

  const fetchAdminData = async () => {
    try {
        invalidateCache();
        const liveData = await fetchAndCacheLiveData();
        setData(liveData);
    } catch (e) {
        console.error("Failed to fetch live data for admin.", e);
        setPublishError("Could not load live data.");
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
        setIsAuthenticated(true);
        fetchAdminData();
    }
  }, []);

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
        const resData = await response.json();
        if (response.ok && resData.success) {
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            sessionStorage.setItem('adminPassword', password);
            setIsAuthenticated(true);
            if (resData.firstLogin) {
                setLoginMessage("Setup complete! Secure your admin panel by adding this password as the ADMIN_PASSWORD environment variable.");
            }
            fetchAdminData();
        } else {
            setLoginError(resData.error || 'Login failed.');
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
    setPassword('');
    setLoginError('');
  };

  const publishData = async () => {
    setPublishStatus('saving');
    setPublishError('');
    try {
        const adminPassword = sessionStorage.getItem('adminPassword');
        if (!adminPassword) throw new Error('Authentication error. Please log in again.');
        
        const response = await fetch('/api/publish-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword, data: data }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Publishing failed.');
        }

        invalidateCache();
        setPublishStatus('success');
        const updateChannel = new BroadcastChannel('cratetv_data_update');
        updateChannel.postMessage({ type: 'update' });
        updateChannel.close();
        setTimeout(() => setPublishStatus('idle'), 2500);
    } catch (error) {
        setPublishStatus('error');
        setPublishError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  };

  const handleAddNewMovie = () => setSelectedMovie({
    key: `newmovie${Date.now()}`, title: '', synopsis: '', cast: [], director: '',
    trailer: '', fullMovie: '', poster: '', tvPoster: '',
    likes: 0, releaseDateTime: getLocalDatetimeString(), mainPageExpiry: '',
  });

  const handleMovieSave = (updatedMovie: Movie) => {
    setData((prev: LiveData | null) => {
        if (!prev) return null;
        const newMovies = { ...prev.movies, [updatedMovie.key]: updatedMovie };
        const newCats = { ...prev.categories };
        if (newCats.newReleases && !newCats.newReleases.movieKeys.includes(updatedMovie.key)) {
            newCats.newReleases.movieKeys.unshift(updatedMovie.key);
        }
        return { ...prev, movies: newMovies, categories: newCats };
    });
    setSelectedMovie(null);
  };

  const handleMovieDelete = (movieKey: string) => {
     if (window.confirm('Are you sure you want to permanently delete this film?')) {
        setData((prev: LiveData | null) => {
            if (!prev) return null;
            const newMovies = { ...prev.movies };
            delete newMovies[movieKey];
            const newCategories = JSON.parse(JSON.stringify(prev.categories));
            Object.keys(newCategories).forEach(catKey => {
                newCategories[catKey].movieKeys = newCategories[catKey].movieKeys.filter((key: string) => key !== movieKey);
            });
            const newFestivalData = JSON.parse(JSON.stringify(prev.festivalData));
            newFestivalData.forEach((day: FestivalDay) => {
                day.blocks.forEach((block: FilmBlock) => {
                    block.movieKeys = block.movieKeys.
