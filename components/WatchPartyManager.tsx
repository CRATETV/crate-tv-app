import React, { useState, useCallback } from 'react';
import { Movie } from '../types';
import ChatMonitorModal from './ChatMonitorModal';

interface WatchPartyManagerProps {
    allMovies: Record<string, Movie>;
    onSave: (movie: Movie) => Promise<void>;
}

const MovieRow: React.FC<{ movie: Movie; onSave: (movie: Movie) => Promise<void>; onMonitorChat: (movieKey: string) => void; }> = ({ movie, onSave, onMonitorChat }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isEnabled, setIsEnabled] = useState(movie.isWatchPartyEnabled || false);
    const [startTime, setStartTime] = useState(movie.watchPartyStartTime || '');

    const debounce = (func: Function, delay: number) => {
        let timeout: ReturnType<typeof setTimeout>;
        return (...args: any) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    };

    const handleSave = async (updatedMovie: Movie) => {
        setIsSaving(true);
        try {
            await onSave(updatedMovie);
        } catch (error) {
            console.error("Failed to save movie", error);
        } finally {
            // Add a small delay so the user sees the "Saving..." text
            setTimeout(() => setIsSaving(false), 500);
        }
    };
    
    const debouncedSave = useCallback(debounce(handleSave, 1000), [onSave]);

    const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsEnabled(checked);
        const updatedMovie = { ...movie, isWatchPartyEnabled: checked };
        handleSave(updatedMovie);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value;
        setStartTime(newTime);
        const updatedMovie = { ...movie, watchPartyStartTime: newTime };
        debouncedSave(updatedMovie);
    };

    return (
        <tr className="border-b border-gray-700">
            <td className="p-3 font-medium text-white">{movie.title}</td>
            <td className="p-3">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isEnabled} onChange={handleToggle} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-pink-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
            </td>
            <td className="p-3">
                <input
                    type="datetime-local"
                    value={startTime}
                    onChange={handleTimeChange}
                    className="form-input !py-1 text-sm"
                    disabled={!isEnabled}
                />
            </td>
            <td className="p-3">
                {isSaving ? <span className="text-xs text-yellow-400">Saving...</span> : <span className="text-xs text-green-500">Saved</span>}
            </td>
            <td className="p-3">
                <button onClick={() => onMonitorChat(movie.key)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md">
                    Monitor Chat
                </button>
            </td>
        </tr>
    );
};


const WatchPartyManager: React.FC<WatchPartyManagerProps> = ({ allMovies, onSave }) => {
    const [filter, setFilter] = useState('');
    const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);
    const [monitoringMovieKey, setMonitoringMovieKey] = useState<string | null>(null);

    // FIX: Explicitly cast the result of `Object.values(allMovies)` to `Movie[]` to resolve TypeScript errors where properties of `movie` were not recognized.
    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(movie => movie.title.toLowerCase().includes(filter.toLowerCase()))
        .filter(movie => !showOnlyEnabled || movie.isWatchPartyEnabled)
        .sort((a, b) => a.title.localeCompare(b.title));

    return (
        <>
            <div className="bg-gray-950 p-6 rounded-lg text-gray-200">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 text-pink-400">Watch Party Manager</h2>
                <p className="text-sm text-gray-400 mb-6">Enable watch parties and set start times for any film. Changes are saved automatically.</p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Filter movies..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="form-input flex-grow"
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                            type="checkbox"
                            checked={showOnlyEnabled}
                            onChange={e => setShowOnlyEnabled(e.target.checked)}
                            className="h-4 w-4 bg-gray-700 border-gray-600 text-pink-500 rounded focus:ring-pink-500"
                        />
                        Show only enabled
                    </label>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                            <tr>
                                <th className="p-3">Film Title</th>
                                <th className="p-3">Enabled</th>
                                <th className="p-3">Start Time</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMovies.map(movie => (
                                <MovieRow key={movie.key} movie={movie} onSave={onSave} onMonitorChat={setMonitoringMovieKey} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {monitoringMovieKey && (
                <ChatMonitorModal
                    movieKey={monitoringMovieKey}
                    movieTitle={allMovies[monitoringMovieKey]?.title || ''}
                    onClose={() => setMonitoringMovieKey(null)}
                />
            )}
        </>
    );
};

export default WatchPartyManager;
