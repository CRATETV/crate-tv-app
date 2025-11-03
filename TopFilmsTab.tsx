import React, { useState, useEffect, useMemo } from 'react';
import { AnalyticsData, Movie } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import LoadingSpinner from './components/LoadingSpinner';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;
const formatNumber = (num: number) => num.toLocaleString();

const TopFilmsTab: React.FC = () => {
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<{ critical: string | null }>({ critical: null });
    const [selectedGeoMovie, setSelectedGeoMovie] = useState<string>('');


    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const password = sessionStorage.getItem('adminPassword');
            if (!password) {
                setError({ critical: 'Authentication error. Please log in again.' });
                setIsLoading(false);
                return;
            }
            try {
                const [analyticsRes, liveDataRes] = await Promise.all([
                    fetch('/api/get-sales-data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password }),
                    }),
                    fetchAndCacheLiveData({ force: true })
                ]);
                
                const analyticsJson = await analyticsRes.json();
                if (analyticsJson.errors?.critical) throw new Error(analyticsJson.errors.critical);
                
                setAnalyticsData(analyticsJson.analyticsData);
                setAllMovies(liveDataRes.data.movies);
                
                if (analyticsJson.analyticsData?.viewLocations) {
                    const firstMovieWithGeo = Object.keys(analyticsJson.analyticsData.viewLocations)[0];
                    setSelectedGeoMovie(firstMovieWithGeo || '');
                }
                
            } catch (err) {
                setError({ critical: err instanceof Error ? err.message : 'An unknown error occurred during data fetch.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const topFilmsData = useMemo(() => {
        if (!analyticsData || !allMovies) return [];
        
        return (Object.values(allMovies) as Movie[]).map(movie => {
            const donations = analyticsData.filmmakerPayouts.find(p => p.movieTitle === movie.title)?.totalDonations || 0;
            return {
                key: movie.key,
                title: movie.title,
                views: analyticsData.viewCounts[movie.key] || 0,
                likes: analyticsData.movieLikes[movie.key] || 0,
                donations: donations,
            };
        }).sort((a, b) => b.likes - a.likes); // Sort by likes, descending
    }, [analyticsData, allMovies]);

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error.critical) {
        return <div className="p-4 text-red-300 bg-red-900/50 border border-red-700 rounded-md">{error.critical}</div>
    }

    if (!analyticsData) {
        return <div className="p-4 text-yellow-300 bg-yellow-900/50 border border-yellow-700 rounded-md">Could not load analytics data to generate top films list.</div>
    }

    return (
        <div className="space-y-10">
            <div>
                <h2 className="text-2xl font-bold mb-4 text-white">Top Films by Likes</h2>
                <p className="text-sm text-gray-400 mb-6">This list ranks all films by their total like count, providing a clear view of audience favorites.</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                            <tr>
                                <th className="p-3">Rank</th>
                                <th className="p-3">Film</th>
                                <th className="p-3 text-center">Likes</th>
                                <th className="p-3 text-center">Views</th>
                                <th className="p-3 text-right">Donations</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topFilmsData.map((film, index) => (
                                <tr key={film.key} className="border-b border-gray-700">
                                    <td className="p-3 font-bold text-lg">{index + 1}</td>
                                    <td className="p-3 font-medium text-white">{film.title}</td>
                                    <td className="p-3 text-center font-semibold text-red-400">{formatNumber(film.likes)}</td>
                                    <td className="p-3 text-center">{formatNumber(film.views)}</td>
                                    <td className="p-3 text-right font-medium text-green-400">{formatCurrency(film.donations)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-white mt-8">Viewership by Country</h2>
                <select value={selectedGeoMovie} onChange={e => setSelectedGeoMovie(e.target.value)} className="form-input my-4 max-w-sm">
                    <option value="">Select a Film</option>
                    {Object.keys(allMovies).map(key => <option key={key} value={key}>{allMovies[key].title}</option>)}
                </select>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                            <tr>
                                <th className="p-3">Country Code</th>
                                <th className="p-3">Views</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedGeoMovie && analyticsData.viewLocations[selectedGeoMovie] ? 
                                Object.entries(analyticsData.viewLocations[selectedGeoMovie]).sort(([, a], [, b]) => Number(b) - Number(a)).map(([code, count]) => (
                                    <tr key={code} className="border-b border-gray-700">
                                        <td className="p-3 font-medium text-white">{code}</td>
                                        <td className="p-3">{formatNumber(Number(count))}</td>
                                    </tr>
                                )) : 
                                <tr>
                                    <td colSpan={2} className="p-4 text-center text-gray-500">No location data for this film.</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TopFilmsTab;