
import React from 'react';
import { Movie } from '../types';

interface TopTenListProps {
    movies: Movie[];
    onSelectMovie: (movie: Movie) => void;
}

const TopTenList: React.FC<TopTenListProps> = ({ movies, onSelectMovie }) => {
    return (
        <div className="space-y-2">
            {movies.map((movie, index) => (
                <div 
                    key={movie.key} 
                    onClick={() => onSelectMovie(movie)}
                    className="group flex items-center bg-transparent hover:bg-gray-800/60 transition-colors duration-300 rounded-lg p-3 cursor-pointer"
                >
                    <div className="flex items-center justify-center w-24 flex-shrink-0">
                       <span 
                            className="font-black text-6xl md:text-7xl leading-none select-none text-gray-800 group-hover:text-gray-700 transition-colors duration-300"
                            style={{ WebkitTextStroke: '1px rgba(255,255,255,0.1)' }}
                        >
                            {index + 1}
                        </span>
                    </div>
                    <div className="relative w-20 h-28 flex-shrink-0 rounded-md overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105">
                        <img 
                            src={movie.poster} 
                            alt={movie.title} 
                            className="w-full h-full object-cover" 
                            onContextMenu={(e) => e.preventDefault()} 
                        />
                    </div>
                    <div className="flex-grow min-w-0 pl-6">
                        <h2 className="text-lg md:text-xl font-bold text-white truncate transition-colors duration-300 group-hover:text-red-400">{movie.title}</h2>
                        <p className="text-sm text-gray-400 truncate">{movie.director}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TopTenList;
