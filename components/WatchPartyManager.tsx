import React, { useState, useEffect, useMemo } from 'react';
import { Movie, WatchPartyState } from '../types';
import ChatMonitorModal from './ChatMonitorModal';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';

interface MovieRowProps {
    movie: Movie;
    partyState?: WatchPartyState;
    onChange: (updates: Partial<Movie>) => void;
    onMonitorChat: (movieKey: string) => void;
    onStartParty: (movieKey: string) => void;
}

const getPartyStatusText = (movie: Movie, partyState?: WatchPartyState) => {
    if (!movie.isWatchPartyEnabled || !movie.watchPartyStartTime) {
        return { text: 'Disabled', color: 'bg-gray-500' };
    }
    const now = new Date();
    const startTime = new Date(movie.watchPartyStartTime);
    if (now < startTime) {
        return { text: 'Upcoming', color: 'bg-blue-500' };
    }
    if (partyState?.status === 'live') {
        return { text: 'Live', color: 'bg-red-500 animate-pulse' };
    }
    if (partyState?.status === 'waiting') {
        return { text: 'Waiting for Host', color: 'bg-yellow-500' };
    }
    return { text: 'Ended', color: 'bg-gray-700' };
};

const MovieRow: React.FC<MovieRowProps> = ({ movie, partyState, onChange, onMonitorChat, onStartParty }) => {
    const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ isWatchPartyEnabled: e.target.checked });
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ watchPartyStartTime: e.target.value });
    };

    const status = getPartyStatusText(movie, partyState);
    const canStart = movie.isWatchPartyEnabled && movie.watchPartyStartTime && new Date() >= new Date(movie.watchPartyStartTime) && partyState?.status === 'waiting';

    return (
        <tr className="border-b border-gray-700">
            <td className="p-3 font-medium text-white">{movie.title}</td>
            <td className="p-3">
                <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${status.color}`}>
                    {status.text}
                </span>
            </td>
            <td className="p-3">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={movie.isWatchPartyEnabled || false} onChange={handleToggle} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-pink-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
            </td>
            <td className="p-3">
                <input
                    type="datetime-local"
                    value={movie.watchPartyStartTime || ''}
                    onChange={handleTimeChange}
                    className="form-input !py-1 text-sm"
                    disabled={!movie.isWatchPartyEnabled}
                />
            </td>
            <td className="p-3 flex gap-2">
                <button 
                    onClick={() => onStartParty(movie.key)}
                    disabled={!canStart}
                    className="text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-1 px-3 rounded-md"
                >
                    Start Party
                </button>
                <button onClick={() => onMonitorChat(movie.key)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md">
                    Monitor Chat
                </button>
            </td>
        </tr>
    );
};

interface WatchPartyManagerProps {
    allMovies: Record<string, Movie>;
    onSave: (movie: Movie) => Promise<void>;
}

const WatchPartyManager: React.FC<WatchPartyManagerProps> = ({ allMovies, onSave }) => {
    const [movieSettings, setMovieSettings] = useState<Record<string, Movie>>(allMovies);
    const [partyStates, setPartyStates] = useState<Record<string, WatchPartyState>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [filter, setFilter] = useState('');
    const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);
    const [monitoringMovieKey, setMonitoringMovieKey] = useState<string | null>(null);
    
    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const unsub = db.collection('watch_parties').onSnapshot(snapshot => {
            const states: Record<string, WatchPartyState> = {};
            snapshot.forEach(doc => {
                states[doc.id] = doc.data() as WatchPartyState;
            });
            setPartyStates(states);
        });
        return () => unsub();
    }, []);

    const hasUnsavedChanges = useMemo(() => {
        return JSON.stringify(allMovies) !== JSON.stringify(movieSettings);
    }, [allMovies, movieSettings]);

    const handleMovieChange = (movieKey: string, updates: Partial<Movie>) => {
        setMovieSettings(prev => ({
            ...prev,
            [movieKey]: { ...prev[movieKey], ...updates },
        }));
    };
    
    const handleSaveAll = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        const changedMovies: Movie[] = [];
        for (const key in movieSettings) {
            if (JSON.stringify(allMovies[key]) !== JSON.stringify(movieSettings[key])) {
                changedMovies.push(movieSettings[key]);
            }
        }
        
        try {
            await Promise.all(changedMovies.map(movie => onSave(movie)));
            setSaveStatus('success');
        } catch (error) {
            console.error("Failed to save watch party settings:", error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };
    
    const handleStartParty = async (movieKey: string) => {
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/start-watch-party', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey, password }),
            });
            if (!response.ok) {
                throw new Error((await response.json()).error || 'Failed to start party.');
            }
            // The listener will automatically update the UI status.
        } catch (error) {
            console.error("Failed to start party:", error);
            alert(`Error: Could not start the party. ${(error as Error).message}`);
        }
    };

    // FIX: Cast the result of Object.values to Movie[] to provide a concrete type for the chained array methods.
    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(movie => movie.title.toLowerCase().includes(filter.toLowerCase()))
        .filter(movie => !showOnlyEnabled || movieSettings[movie.key]?.isWatchPartyEnabled)
        .sort((a, b) => a.title.localeCompare(b.title));

    return (
        <>
            <div className="bg-gray-950 p-6 rounded-lg text-gray-200">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 text-pink-400">Watch Party Manager</h2>
                <p className="text-sm text-gray-400 mb-6">Enable parties, set start times, and manually start events. Click "Save All Changes" to update schedules.</p>
                
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
                                <th className="p-3">Status</th>
                                <th className="p-3">Enabled</th>
                                <th className="p-3">Start Time</th>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMovies.map(movie => (
                                <MovieRow 
                                    key={movie.key} 
                                    movie={movieSettings[movie.key]} 
                                    partyState={partyStates[movie.key]}
                                    onChange={(updates) => handleMovieChange(movie.key, updates)} 
                                    onMonitorChat={setMonitoringMovieKey} 
                                    onStartParty={handleStartParty}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-700 flex items-center gap-4">
                    <button
                        onClick={handleSaveAll}
                        disabled={!hasUnsavedChanges || isSaving}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-2 px-5 rounded-md transition-colors"
                    >
                        {isSaving ? 'Saving...' : 'Save All Changes'}
                    </button>
                    {saveStatus === 'success' && <span className="text-green-500 text-sm">Changes saved successfully!</span>}
                    {saveStatus === 'error' && <span className="text-red-500 text-sm">Failed to save changes.</span>}
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