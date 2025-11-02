import React, { useState } from 'react';

const ACTOR_PASSWORD = 'cratebio';

const MonologueGenerator: React.FC = () => {
    const [genre, setGenre] = useState('Drama');
    const [emotion, setEmotion] = useState('Heartbreak');
    const [monologue, setMonologue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    const handleGenerate = async () => {
        setIsLoading(true);
        setError('');
        setMonologue('');
        setCopyStatus('idle');

        try {
            const response = await fetch('/api/generate-monologue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ genre, emotion, password: ACTOR_PASSWORD }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate monologue.');
            }

            const data = await response.json();
            setMonologue(data.monologue);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (!monologue) return;
        navigator.clipboard.writeText(monologue).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        });
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 p-6 md:p-8 rounded-lg">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">AI Monologue Generator</h2>
            <p className="text-gray-400 mb-6">Hone your craft with a unique monologue generated just for you.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label htmlFor="genre" className="block text-sm font-medium text-gray-400 mb-2">Genre</label>
                    <input
                        type="text"
                        id="genre"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        className="form-input"
                        placeholder="e.g., Comedy, Sci-Fi, Thriller"
                    />
                </div>
                <div>
                    <label htmlFor="emotion" className="block text-sm font-medium text-gray-400 mb-2">Character Emotion</label>
                    <input
                        type="text"
                        id="emotion"
                        value={emotion}
                        onChange={(e) => setEmotion(e.target.value)}
                        className="form-input"
                        placeholder="e.g., Joyful, Betrayed, Anxious"
                    />
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="submit-btn bg-purple-600 hover:bg-purple-700 w-full md:w-auto"
            >
                {isLoading ? 'Generating...' : 'Generate Monologue'}
            </button>

            {error && <p className="text-red-400 mt-4">{error}</p>}

            {isLoading && (
                <div className="mt-6 text-center">
                    <LoadingSpinner />
                    <p className="text-gray-400 mt-2">Crafting your monologue...</p>
                </div>
            )}

            {monologue && (
                <div className="mt-6 bg-gray-900/50 border border-gray-700 p-6 rounded-lg animate-[fadeIn_0.5s_ease-out]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-purple-400">Your Monologue</h3>
                        <button onClick={handleCopy} className="text-sm bg-gray-700 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded-md">
                            {copyStatus === 'copied' ? 'Copied!' : 'Copy Text'}
                        </button>
                    </div>
                    <pre className="text-gray-300 whitespace-pre-wrap font-sans text-base leading-relaxed">{monologue}</pre>
                </div>
            )}
        </div>
    );
};

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center py-4">
      <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-purple-400"></div>
  </div>
);

export default MonologueGenerator;