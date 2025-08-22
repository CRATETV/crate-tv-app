import React, { useState, useCallback } from 'react';
import { Movie, Category, Actor } from './types.ts';
import MovieEditor from './components/MovieEditor.tsx';

const AdminPage: React.FC = () => {
  const [rawCode, setRawCode] = useState('');
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [generatedCode, setGeneratedCode] = useState('');
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

  const parseDataFromCode = useCallback(() => {
    try {
      const script = rawCode
        .replace(/import.*?from '.*?';/gs, '')
        .replace(/export const moviesData:.*?=/, 'const moviesData =')
        .replace(/export const categoriesData:.*?=/, 'const categoriesData =')
        + '; return { moviesData, categoriesData };';
      
      const func = new Function(script);
      const data = func();

      if (!data.moviesData || !data.categoriesData) {
        throw new Error("Could not find moviesData or categoriesData objects.");
      }

      setMovies(data.moviesData);
      setCategories(data.categoriesData);
      alert('Data loaded successfully!');
    } catch (e) {
      console.error("Parsing error:", e);
      alert("Failed to parse the code. Please check the console for errors and make sure the format is correct.");
    }
  }, [rawCode]);

  const generateCode = useCallback(() => {
    const moviesString = JSON.stringify(movies, null, 2);
    const categoriesString = JSON.stringify(categories, null, 2);

    const code = `import { Movie, Category } from './types';

export const moviesData: Record<string, Movie> = ${moviesString};

export const categoriesData: Record<string, Category> = ${categoriesString};
`;
    setGeneratedCode(code);
  }, [movies, categories]);
  
  const handleSaveMovie = (movieToSave: Movie) => {
    setMovies(prevMovies => ({
      ...prevMovies,
      [movieToSave.key]: movieToSave
    }));
    setEditingMovie(null);
  };

  const handleAddNewMovie = () => {
    const newMovie: Movie = {
      key: `newMovie${Date.now()}`,
      title: 'New Movie',
      synopsis: '',
      cast: [],
      director: '',
      trailer: '',
      fullMovie: '',
      poster: '',
      likes: 0,
      releaseDate: ''
    };
    setEditingMovie(newMovie);
  };
  
  const handleDeleteMovie = (movieKey: string) => {
    if (window.confirm(`Are you sure you want to delete movie: ${movies[movieKey].title}? This cannot be undone.`)) {
        // This is a complex operation as it also requires removing the key from categories
        const newMovies = { ...movies };
        delete newMovies[movieKey];
        setMovies(newMovies);

        const newCategories = { ...categories };
        Object.keys(newCategories).forEach(catKey => {
            newCategories[catKey].movieKeys = newCategories[catKey].movieKeys.filter(key => key !== movieKey);
        });
        setCategories(newCategories);

        alert(`Movie "${movieKey}" deleted. Remember to also remove it from any categories if needed.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
        <div className="fixed top-0 left-0 w-full h-2.5 bg-gradient-to-r from-red-500 via-blue-500 to-green-500 bg-[length:300%_100%] animate-colorChange z-50"></div>
        <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold mb-2 text-red-500">Crate TV Content Manager</h1>
            <p className="text-gray-400 mb-8">A tool to update movie and category data without manually editing code.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Step 1 & 4 */}
                <div>
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                        <h2 className="text-2xl font-semibold mb-3">Step 1: Load Your Data</h2>
                        <p className="text-gray-400 mb-4 text-sm">Paste the entire content of your <code className="bg-gray-700 p-1 rounded">constants.ts</code> file below and click "Load Data".</p>
                        <textarea
                            className="w-full h-48 bg-gray-900 border border-gray-600 rounded-md p-3 text-sm font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                            value={rawCode}
                            onChange={(e) => setRawCode(e.target.value)}
                            placeholder="Paste constants.ts content here..."
                        />
                        <button onClick={parseDataFromCode} className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            Load Data
                        </button>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-semibold mb-3">Step 4: Generate New Code</h2>
                        <p className="text-gray-400 mb-4 text-sm">After making your changes, click the button below to generate the new code. Copy the output and replace the content of your <code className="bg-gray-700 p-1 rounded">constants.ts</code> file.</p>
                         <button onClick={generateCode} className="mb-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            Generate Output Code
                        </button>
                        <textarea
                            readOnly
                            className="w-full h-48 bg-gray-900 border border-gray-600 rounded-md p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={generatedCode}
                            placeholder="Generated code will appear here..."
                        />
                    </div>
                </div>

                {/* Step 2 & 3 */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold mb-3">Step 2 & 3: Manage Movies</h2>
                     <button onClick={handleAddNewMovie} className="mb-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Add New Movie
                    </button>
                    <p className="text-gray-400 mb-4 text-sm">Edit or delete existing movies. Changes to categories must be done manually in the generated code for now.</p>
                    <div className="max-h-[80vh] overflow-y-auto pr-2">
                      {Object.values(movies).map(movie => (
                        <div key={movie.key} className="flex items-center justify-between bg-gray-700 p-3 rounded-md mb-3">
                          <div className="flex items-center">
                            <img src={movie.poster} alt={movie.title} className="w-12 h-16 object-cover rounded-sm mr-4"/>
                            <div>
                                <p className="font-bold">{movie.title}</p>
                                <p className="text-xs text-gray-400">{movie.key}</p>
                                {movie.releaseDate && (
                                  <div className="flex items-center text-xs text-yellow-400 mt-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    <span>Releases: {movie.releaseDate}</span>
                                  </div>
                                )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button onClick={() => setEditingMovie(movie)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">Edit</button>
                            <button onClick={() => handleDeleteMovie(movie.key)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
            </div>
            {editingMovie && (
                <MovieEditor 
                    movie={editingMovie}
                    onSave={handleSaveMovie}
                    onClose={() => setEditingMovie(null)}
                />
            )}
        </div>
    </div>
  );
};

export default AdminPage;