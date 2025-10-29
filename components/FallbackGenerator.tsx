import React, { useState } from 'react';
import { Movie, Category, FestivalDay, FestivalConfig, AboutData } from '../types.ts';
import { moviesData as currentFallbackMovies } from '../constants.ts';

interface FallbackGeneratorProps {
  movies: Record<string, Movie>;
  categories: Record<string, Category>;
  festivalData: FestivalDay[];
  festivalConfig: FestivalConfig | null;
  aboutData: AboutData | null;
}

const FallbackGenerator: React.FC<FallbackGeneratorProps> = ({
  movies,
  categories,
  festivalData,
  festivalConfig,
  aboutData,
}) => {
  const [generatedCode, setGeneratedCode] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const generateConstantsFileContent = () => {
    if (!festivalConfig || !aboutData) {
      setGeneratedCode('Error: Festival or About configuration is missing. Cannot generate code.');
      return;
    }
    
    // Defensive merge: Preserve poster URLs from the old fallback if they are missing in the new live data.
    const mergedMovies: Record<string, Movie> = JSON.parse(JSON.stringify(movies));
    for (const key in currentFallbackMovies) {
        const liveMovie = mergedMovies[key];
        const fallbackMovie = currentFallbackMovies[key];

        if (liveMovie && fallbackMovie) {
            if (!liveMovie.poster && fallbackMovie.poster) {
                liveMovie.poster = fallbackMovie.poster;
            }
            if (!liveMovie.tvPoster && fallbackMovie.tvPoster) {
                liveMovie.tvPoster = fallbackMovie.tvPoster;
            }
        }
    }

    const header = `import { Category, Movie, FestivalDay, FestivalConfig, AboutData } from './types.ts';\n\n`;
    
    // Re-add the isMovieReleased utility function to the generated file
    const utilityFunction = `
// Utility function to robustly check if a movie is past its release time.
export const isMovieReleased = (movie: Movie | undefined | null): boolean => {
    if (!movie || !movie.releaseDateTime) {
        return true; // No release date means it's always available
    }
    // Compare the release time with the current time
    return new Date(movie.releaseDateTime) <= new Date();
};\n\n`;
    
    const categoriesString = `export const categoriesData: Record<string, Category> = ${JSON.stringify(categories, null, 2)};\n\n`;
    const moviesString = `export const moviesData: Record<string, Movie> = ${JSON.stringify(mergedMovies, null, 2)};\n\n`;
    const aboutDataString = `export const aboutData: AboutData = ${JSON.stringify(aboutData, null, 2)};\n\n`;
    const festivalConfigString = `export const festivalConfigData: FestivalConfig = ${JSON.stringify(festivalConfig, null, 2)};\n\n`;
    const festivalDataString = `export const festivalData: FestivalDay[] = ${JSON.stringify(festivalData, null, 2)};\n`;

    const fullCode = header + utilityFunction + categoriesString + moviesString + aboutDataString + festivalConfigString + festivalDataString;
    setGeneratedCode(fullCode);
  };

  const copyToClipboard = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <h2 className="text-2xl font-bold text-yellow-400 mb-4">Fallback Data Generator</h2>
      <div className="bg-yellow-900/30 border border-yellow-800 text-yellow-300 text-sm rounded-lg p-4 mb-6">
        <h3 className="font-bold mb-2">What is this?</h3>
        <p>This tool generates the code for the <code className="bg-gray-700 p-1 rounded-md text-xs">constants.ts</code> file. This file acts as a built-in backup for the website. If the live data from the server ever fails to load, the site will use this fallback data to ensure it never appears broken.</p>
        <h3 className="font-bold mt-4 mb-2">How to Update the Fallback</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click the <strong>"Generate Code"</strong> button below to create the file content from your current drafts.</li>
          <li>Click <strong>"Copy to Clipboard"</strong>.</li>
          <li>In your local project code, open the file <code className="bg-gray-700 p-1 rounded-md text-xs">constants.ts</code>.</li>
          <li>Delete all of its content and paste the code you copied.</li>
          <li>Commit this change and redeploy the application to update the built-in fallback.</li>
        </ol>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={generateConstantsFileContent}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition-colors"
        >
          Generate Code
        </button>
        {generatedCode && (
          <button
            onClick={copyToClipboard}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition-colors"
          >
            {copyStatus === 'idle' ? 'Copy to Clipboard' : 'Copied!'}
          </button>
        )}
      </div>

      {generatedCode && (
        <div>
          <label htmlFor="code-output" className="block text-sm font-medium text-gray-300 mb-2">Generated constants.ts</label>
          <textarea
            id="code-output"
            readOnly
            value={generatedCode}
            className="w-full h-96 bg-gray-900/70 border border-gray-600 rounded-md p-4 text-xs font-mono text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
};

export default FallbackGenerator;
