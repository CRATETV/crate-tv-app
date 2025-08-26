import React, { useState, useMemo } from 'react';
import { moviesData } from './constants.ts';
import { Movie } from './types.ts';
import MovieEditor from './components/MovieEditor.tsx';

const AdminPage: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>(Object.values(moviesData));
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isNewMovie, setIsNewMovie] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const sortedMovies = useMemo(() => {
    return [...movies].sort((a, b) => a.title.localeCompare(b.title));
  }, [movies]);

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsNewMovie(false);
  };

  const handleAddNewMovie = () => {
    const newKey = `newmovie${Date.now()}`;
    const newMovie: Movie = {
      key: newKey,
      title: 'New Movie',
      synopsis: '',
      cast: [],
      director: '',
      trailer: '',
      fullMovie: '',
      poster: '',
      likes: 0,
      releaseDate: '',
    };
    setSelectedMovie(newMovie);
    setIsNewMovie(true);
  };

  const handleSaveMovie = (updatedMovie: Movie) => {
    if (isNewMovie) {
      setMovies(prev => [...prev, updatedMovie]);
    } else {
      setMovies(prev => prev.map(m => m.key === updatedMovie.key ? updatedMovie : m));
    }
    setSelectedMovie(null);
    setIsNewMovie(false);
  };

  const handleDeleteMovie = (movieKey: string) => {
    if(window.confirm("Are you sure you want to delete this movie? This cannot be undone.")) {
        setMovies(prev => prev.filter(m => m.key !== movieKey));
        if (selectedMovie && selectedMovie.key === movieKey) {
            setSelectedMovie(null);
        }
    }
  };

  const handleGenerateCode = () => {
    const moviesDataObject = movies.reduce((acc, movie) => {
        // Clean up empty strings for releaseDate
        const movieToProcess = { ...movie };
        if (movieToProcess.releaseDate === '') {
            delete movieToProcess.releaseDate;
        }

        acc[movie.key] = movieToProcess;
        return acc;
    }, {} as Record<string, Movie>);
    
    const codeString = `import { Category, Movie } from './types.ts';\n\nexport const moviesData: Record<string, Movie> = ${JSON.stringify(moviesDataObject, null, 2)};`;
    setGeneratedCode(codeString);
  };

  return (
    <div className="bg-gray-800 text-white min-h-screen p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-red-500">Crate TV Admin Panel</h1>
          <p className="text-gray-400">Manage your movie catalog here.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 bg-gray-900 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">Movie List</h2>
            <button
              onClick={handleAddNewMovie}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition mb-4"
            >
              + Add New Movie
            </button>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              {sortedMovies.map(movie => (
                <div 
                  key={movie.key}
                  className={`p-3 rounded-md transition mb-2 flex justify-between items-center ${selectedMovie?.key === movie.key ? 'bg-red-900/50' : 'bg-gray-700'}`}
                >
                  <div>
                    <p className="font-semibold">{movie.title}</p>
                    <p className="text-xs text-gray-400">{movie.releaseDate ? `Releases: ${movie.releaseDate}` : 'Released'}</p>
                  </div>
                  <button
                    onClick={() => handleSelectMovie(movie)}
                    className={`flex-shrink-0 ml-4 px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${selectedMovie?.key === movie.key ? 'bg-red-500 text-white cursor-default' : 'bg-gray-600 hover:bg-red-500 text-white'}`}
                    aria-label={`Edit ${movie.title}`}
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 bg-gray-900 p-6 rounded-lg shadow-lg">
            {selectedMovie ? (
              <MovieEditor
                movie={selectedMovie}
                onSave={handleSaveMovie}
                onCancel={() => setSelectedMovie(null)}
                onDelete={handleDeleteMovie}
              />
            ) : (
              <div className="text-center text-gray-400 py-16">
                <p className="text-lg">Select a movie to edit</p>
                <p className="mt-2">or</p>
                <p className="mt-2 text-lg">Add a new one</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-8 bg-gray-900 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Generate Code</h2>
            <p className="text-gray-400 mb-4">After making all your changes, click this button to generate the code for your `constants.ts` file. Copy the entire output and replace the `moviesData` object in the file.</p>
            <button 
                onClick={handleGenerateCode}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition"
            >
                Generate `moviesData` Object
            </button>
            {generatedCode && (
                <div className="mt-4">
                    <textarea 
                        readOnly 
                        value={generatedCode}
                        className="w-full h-64 bg-gray-800 border border-gray-700 rounded-md p-4 text-sm font-mono text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                        onClick={() => navigator.clipboard.writeText(generatedCode)}
                        className="mt-2 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition"
                    >
                        Copy to Clipboard
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;