
import React, { useState } from 'react';
import { Movie } from '../types';

interface HeroManagerProps {
    allMovies: Movie[];
    featuredKeys: string[];
    onSave: (newKeys: string[]) => Promise<void>;
    isSaving: boolean;
}

const HeroManager: React.FC<HeroManagerProps> = ({ allMovies, featuredKeys, onSave, isSaving }) => {
    const [selectedKeys, setSelectedKeys] = useState<string[]>(featuredKeys);
    const [searchTerm, setSearchTerm] = useState('');

    const toggleMovie = (key: string) => {
        setSelectedKeys(prev => 
            prev.includes(key) 
                ? prev.filter(k => k !== key) 
                : [...prev, key]
        );
    };

    const filteredMovies = allMovies
        .filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.title.localeCompare(b.title));

    const selectedMovies = selectedKeys
        .map(key => allMovies.find(m => m.key === key))
        .filter((m): m is Movie => !!m);

    return (
        <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-bold text-red-400 mb-2">Hero Spotlight Manager</h2>
                <p className="text-gray-400">Select the films that should rotate in the main hero section of the home page. These should ideally have high-quality trailers.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Selector Section */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-xl font-bold text-white">Select Films</h3>
                    <input
                        type="text"
                        placeholder="Search all films..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="form-input"
                    />
                    <div className="bg-gray-900 border border-gray-700 rounded-lg max-h-[600px] overflow-y-auto pr-2">
                        {filteredMovies.map(movie => (
                            <button
                                key={movie.key}
                                onClick={() => toggleMovie(movie.key)}
                                className={`w-full text-left p-3 border-b border-gray-800 last:border-0 flex items-center gap-3 transition-colors ${selectedKeys.includes(movie.key) ? 'bg-purple-900/30 text-purple-300' : 'hover:bg-gray-800 text-gray-300'}`}
                            >
                                <img src={movie.poster} alt="" className="w-10 h-14 object-cover rounded" />
                                <div className="flex-grow">
                                    <p className="font-bold text-sm leading-tight">{movie.title}</p>
                                    <p className="text-xs opacity-60">{movie.director}</p>
                                </div>
                                {selectedKeys.includes(movie.key) && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">Rotation Preview ({selectedKeys.length} films)</h3>
                        <button
                            onClick={() => onSave(selectedKeys)}
                            disabled={isSaving}
                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded-md shadow-lg transition-transform active:scale-95"
                        >
                            {isSaving ? 'Publishing...' : 'Update Hero Spotlight'}
                        </button>
                    </div>
                    
                    {selectedMovies.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                            {selectedMovies.map(movie => (
                                <div key={movie.key} className="relative group aspect-video rounded-lg overflow-hidden border-2 border-gray-700">
                                    <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-4">
                                        <p className="text-white font-bold text-sm truncate">{movie.title}</p>
                                        <button 
                                            onClick={() => toggleMovie(movie.key)}
                                            className="absolute top-2 right-2 p-1.5 bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-700 rounded-xl text-gray-500">
                            No films selected for the spotlight.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HeroManager;
