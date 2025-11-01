import React, { useState, useEffect, useMemo } from 'react';
import { Movie, FilmmakerAnalytics } from '../types';
import LoadingSpinner from './LoadingSpinner';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;

const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-gray-900/50 p-6 rounded-lg text-center border border-gray-700">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
);

interface FilmmakerDashboardViewProps {
    allMovies: Record<string, Movie>;
}

const FilmmakerDashboardView: React.FC<FilmmakerDashboardViewProps> = ({ allMovies }) => {
    const [selectedFilmmaker, setSelectedFilmmaker] = useState('');
    const [analytics, setAnalytics] = useState<FilmmakerAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const allFilmmakers = useMemo(() => {
        const filmmakerSet = new Set<string>();
        // FIX: Add explicit type 'Movie' to the 'movie' parameter to fix TypeScript inference issue.
        Object.values(allMovies).forEach((movie: Movie) => {
            (movie.director || '').split(',').map(d => d.trim()).filter(Boolean).forEach(d => filmmakerSet.add(d));
            (movie.producers || '').split(',').map(p => p.trim()).filter(Boolean).forEach(p => filmmakerSet.add(p));
        });
        return Array.from(filmmakerSet).sort();
    }, [allMovies]);

    useEffect(() => {
        if (!selectedFilmmaker) {
            setAnalytics(null);
            return;
        }

        const fetchAnalytics = async () => {
            setIsLoading(true);
            setError('');
            const password = sessionStorage.getItem('adminPassword');
            if (!password) {
                setError("Admin authentication is missing.");
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch('/api/get-filmmaker-analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ directorName: selectedFilmmaker, password }),
                });
                if (!response.ok) throw new Error((await response.json()).error || 'Failed to load analytics.');
                const data = await response.json();
                setAnalytics(data.analytics);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, [selectedFilmmaker]);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4 text-white">Filmmaker Dashboard Overview</h2>
            <div className="max-w-md mb-6">
                <label htmlFor="filmmaker-select" className="block text-sm font-medium text-gray-400 mb-2">Select a Filmmaker</label>
                <select
                    id="filmmaker-select"
                    value={selectedFilmmaker}
                    onChange={(e) => setSelectedFilmmaker(e.target.value)}
                    className="form-input w-full"
                >
                    <option value="">-- Choose a filmmaker --</option>
                    {allFilmmakers.map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>

            {isLoading && <LoadingSpinner />}
            {error && <p className="text-red-400">{error}</p>}
            
            {analytics && (
                <div className="space-y-8 mt-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard title="Available Balance" value={formatCurrency(analytics.balance)} />
                        <StatCard title="Total Donations" value={formatCurrency(analytics.totalDonations)} />
                        <StatCard title="Total Paid Out" value={formatCurrency(analytics.totalPaidOut)} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">Film Performance</h3>
                        <div className="space-y-4">
                            {analytics.films.map(film => (
                                <div key={film.key} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <h4 className="font-bold text-lg text-white">{film.title}</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2 text-center">
                                        <div><p className="text-gray-400 text-sm">Views</p><p className="font-bold text-xl">{film.views.toLocaleString()}</p></div>
                                        <div><p className="text-gray-400 text-sm">Likes</p><p className="font-bold text-xl">{film.likes.toLocaleString()}</p></div>
                                        <div><p className="text-gray-400 text-sm">Donations</p><p className="font-bold text-xl text-green-400">{formatCurrency(film.donations)}</p></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilmmakerDashboardView;
