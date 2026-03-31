import React, { useState, useRef } from 'react';
import Header from './Header';
import Footer from './Footer';

interface UploadProgress {
    poster: number;
    film: number;
}

const SubmitPage: React.FC = () => {
    const [step, setStep] = useState<'form' | 'uploading' | 'success' | 'error'>('form');
    const [error, setError] = useState('');
    
    // Form fields
    const [title, setTitle] = useState('');
    const [director, setDirector] = useState('');
    const [email, setEmail] = useState('');
    const [synopsis, setSynopsis] = useState('');
    const [runtime, setRuntime] = useState('');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [genre, setGenre] = useState('Drama');
    const [website, setWebsite] = useState('');
    const [instagram, setInstagram] = useState('');
    const [submitterName, setSubmitterName] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    
    // File uploads
    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [filmFile, setFilmFile] = useState<File | null>(null);
    const [posterPreview, setPosterPreview] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ poster: 0, film: 0 });
    
    const posterInputRef = useRef<HTMLInputElement>(null);
    const filmInputRef = useRef<HTMLInputElement>(null);

    const handlePosterSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file for the poster.');
                return;
            }
            if (file.size > 10 * 1024 * 1024) { // 10MB limit for posters
                setError('Poster image must be under 10MB.');
                return;
            }
            setPosterFile(file);
            setPosterPreview(URL.createObjectURL(file));
            setError('');
        }
    };

    const handleFilmSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('video/')) {
                setError('Please select a video file for the film.');
                return;
            }
            if (file.size > 5 * 1024 * 1024 * 1024) { // 5GB limit
                setError('Film file must be under 5GB.');
                return;
            }
            setFilmFile(file);
            setError('');
        }
    };

    const uploadFileWithProgress = async (
        file: File, 
        signedUrl: string, 
        onProgress: (progress: number) => void
    ): Promise<boolean> => {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    onProgress(percent);
                }
            });
            
            xhr.addEventListener('load', () => {
                resolve(xhr.status >= 200 && xhr.status < 300);
            });
            
            xhr.addEventListener('error', () => {
                resolve(false);
            });
            
            xhr.open('PUT', signedUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!title.trim() || !director.trim() || !email.trim()) {
            setError('Please fill in all required fields.');
            return;
        }
        if (!posterFile) {
            setError('Please upload a poster image.');
            return;
        }
        if (!filmFile) {
            setError('Please upload your film.');
            return;
        }
        if (!agreedToTerms) {
            setError('Please agree to the submission terms.');
            return;
        }

        setStep('uploading');
        setUploadProgress({ poster: 0, film: 0 });

        try {
            // Step 1: Get presigned URLs
            const urlResponse = await fetch('/api/submit-film', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get-upload-urls',
                    posterFileName: posterFile.name,
                    posterFileType: posterFile.type,
                    filmFileName: filmFile.name,
                    filmFileType: filmFile.type,
                }),
            });

            if (!urlResponse.ok) {
                const data = await urlResponse.json();
                throw new Error(data.error || 'Failed to get upload URLs.');
            }

            const { poster: posterUrls, film: filmUrls } = await urlResponse.json();

            // Step 2: Upload poster
            const posterSuccess = await uploadFileWithProgress(
                posterFile,
                posterUrls.signedUrl,
                (progress) => setUploadProgress(prev => ({ ...prev, poster: progress }))
            );

            if (!posterSuccess) {
                throw new Error('Failed to upload poster. Please try again.');
            }

            // Step 3: Upload film
            const filmSuccess = await uploadFileWithProgress(
                filmFile,
                filmUrls.signedUrl,
                (progress) => setUploadProgress(prev => ({ ...prev, film: progress }))
            );

            if (!filmSuccess) {
                throw new Error('Failed to upload film. Please try again.');
            }

            // Step 4: Save submission metadata
            const saveResponse = await fetch('/api/submit-film', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save-submission',
                    title,
                    director,
                    email,
                    synopsis,
                    runtime,
                    year,
                    genre,
                    posterUrl: posterUrls.publicUrl,
                    filmUrl: filmUrls.publicUrl,
                    website,
                    instagram,
                    submitterName: submitterName || director,
                }),
            });

            if (!saveResponse.ok) {
                const data = await saveResponse.json();
                throw new Error(data.error || 'Failed to save submission.');
            }

            setStep('success');

        } catch (err) {
            console.error('Submission error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
            setStep('error');
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    };

    const genres = ['Drama', 'Comedy', 'Horror', 'Thriller', 'Documentary', 'Sci-Fi', 'Romance', 'Action', 'Animation', 'Experimental', 'Music Video', 'Other'];

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <Header searchQuery="" onSearch={() => {}} />
            
            <main className="flex-grow px-4 py-12 max-w-3xl mx-auto w-full">
                {step === 'success' ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-6">🎬</div>
                        <h1 className="text-3xl font-black mb-4">Submission Received!</h1>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto">
                            Thank you for submitting your film to CRATE. Our team will review it and get back to you within 2-3 weeks.
                        </p>
                        <button 
                            onClick={() => window.location.href = '/'}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-full transition-colors"
                        >
                            Back to Home
                        </button>
                    </div>
                ) : step === 'error' ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-6">😔</div>
                        <h1 className="text-3xl font-black mb-4">Something Went Wrong</h1>
                        <p className="text-red-400 mb-8 max-w-md mx-auto">{error}</p>
                        <button 
                            onClick={() => setStep('form')}
                            className="bg-white text-black font-bold px-8 py-3 rounded-full hover:bg-gray-200 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : step === 'uploading' ? (
                    <div className="py-20">
                        <h1 className="text-3xl font-black text-center mb-12">Uploading Your Film...</h1>
                        
                        <div className="space-y-8 max-w-md mx-auto">
                            {/* Poster Progress */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-400">Poster</span>
                                    <span className={uploadProgress.poster === 100 ? 'text-green-500' : 'text-white'}>
                                        {uploadProgress.poster === 100 ? '✓ Complete' : `${uploadProgress.poster}%`}
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-300 ${uploadProgress.poster === 100 ? 'bg-green-500' : 'bg-red-600'}`}
                                        style={{ width: `${uploadProgress.poster}%` }}
                                    />
                                </div>
                            </div>
                            
                            {/* Film Progress */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-400">Film</span>
                                    <span className={uploadProgress.film === 100 ? 'text-green-500' : 'text-white'}>
                                        {uploadProgress.film === 100 ? '✓ Complete' : `${uploadProgress.film}%`}
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-300 ${uploadProgress.film === 100 ? 'bg-green-500' : 'bg-red-600'}`}
                                        style={{ width: `${uploadProgress.film}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-center text-gray-500 text-sm mt-12">
                            Please don't close this page while uploading.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-12">
                            <h1 className="text-4xl font-black mb-4">Submit Your Film</h1>
                            <p className="text-gray-400 max-w-lg mx-auto">
                                Share your work with the CRATE community. Upload your film and poster, and we'll review it for inclusion in our catalog.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-600/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Film Details */}
                            <section className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                                <h2 className="text-lg font-black uppercase tracking-wider text-red-500 mb-6">Film Details</h2>
                                
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Film Title *</label>
                                        <input 
                                            type="text" 
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Enter your film's title"
                                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Director *</label>
                                        <input 
                                            type="text" 
                                            value={director}
                                            onChange={(e) => setDirector(e.target.value)}
                                            placeholder="Director's name"
                                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Your Email *</label>
                                        <input 
                                            type="email" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@email.com"
                                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Runtime</label>
                                        <input 
                                            type="text" 
                                            value={runtime}
                                            onChange={(e) => setRuntime(e.target.value)}
                                            placeholder="e.g., 12 min or 1h 32m"
                                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Year</label>
                                        <input 
                                            type="text" 
                                            value={year}
                                            onChange={(e) => setYear(e.target.value)}
                                            placeholder="2024"
                                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Genre</label>
                                        <select 
                                            value={genre}
                                            onChange={(e) => setGenre(e.target.value)}
                                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors"
                                        >
                                            {genres.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Synopsis</label>
                                        <textarea 
                                            value={synopsis}
                                            onChange={(e) => setSynopsis(e.target.value)}
                                            placeholder="Tell us about your film..."
                                            rows={4}
                                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors resize-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* File Uploads */}
                            <section className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                                <h2 className="text-lg font-black uppercase tracking-wider text-red-500 mb-6">Upload Files</h2>
                                
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Poster Upload */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Poster Image *</label>
                                        <div 
                                            onClick={() => posterInputRef.current?.click()}
                                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-red-500 ${posterFile ? 'border-green-500 bg-green-500/5' : 'border-gray-700'}`}
                                        >
                                            {posterPreview ? (
                                                <div className="space-y-3">
                                                    <img src={posterPreview} alt="Poster preview" className="max-h-40 mx-auto rounded-lg" />
                                                    <p className="text-sm text-green-400">{posterFile?.name}</p>
                                                    <p className="text-xs text-gray-500">{posterFile && formatFileSize(posterFile.size)}</p>
                                                </div>
                                            ) : (
                                                <div className="py-8">
                                                    <div className="text-4xl mb-3">🖼️</div>
                                                    <p className="text-gray-400 text-sm">Click to upload poster</p>
                                                    <p className="text-gray-600 text-xs mt-1">JPG, PNG up to 10MB</p>
                                                </div>
                                            )}
                                        </div>
                                        <input 
                                            ref={posterInputRef}
                                            type="file" 
                                            accept="image/*"
                                            onChange={handlePosterSelect}
                                            className="hidden"
                                        />
                                    </div>
                                    
                                    {/* Film Upload */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Film File *</label>
                                        <div 
                                            onClick={() => filmInputRef.current?.click()}
                                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-red-500 ${filmFile ? 'border-green-500 bg-green-500/5' : 'border-gray-700'}`}
                                        >
                                            {filmFile ? (
                                                <div className="py-4 space-y-2">
                                                    <div className="text-4xl">🎬</div>
                                                    <p className="text-sm text-green-400 break-all">{filmFile.name}</p>
                                                    <p className="text-xs text-gray-500">{formatFileSize(filmFile.size)}</p>
                                                </div>
                                            ) : (
                                                <div className="py-8">
                                                    <div className="text-4xl mb-3">🎥</div>
                                                    <p className="text-gray-400 text-sm">Click to upload film</p>
                                                    <p className="text-gray-600 text-xs mt-1">MP4, MOV up to 5GB</p>
                                                </div>
                                            )}
                                        </div>
                                        <input 
                                            ref={filmInputRef}
                                            type="file" 
                                            accept="video/*"
                                            onChange={handleFilmSelect}
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Optional Info */}
                            <section className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                                <h2 className="text-lg font-black uppercase tracking-wider text-red-500 mb-6">Optional Info</h2>
                                
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Your Name</label>
                                        <input 
                                            type="text" 
                                            value={submitterName}
                                            onChange={(e) => setSubmitterName(e.target.value)}
                                            placeholder="If different from director"
                                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Website</label>
                                        <input 
                                            type="url" 
                                            value={website}
                                            onChange={(e) => setWebsite(e.target.value)}
                                            placeholder="https://yourfilm.com"
                                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors"
                                        />
                                    </div>
                                    
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Instagram</label>
                                        <input 
                                            type="text" 
                                            value={instagram}
                                            onChange={(e) => setInstagram(e.target.value)}
                                            placeholder="@yourusername"
                                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Terms & Submit */}
                            <section>
                                <label className="flex items-start gap-3 cursor-pointer mb-6">
                                    <input 
                                        type="checkbox" 
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                        className="mt-1 w-5 h-5 rounded border-gray-700 bg-black text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm text-gray-400">
                                        I confirm that I have the rights to distribute this film and agree to CRATE's{' '}
                                        <a href="/submission-terms" className="text-red-500 hover:underline">submission terms</a>.
                                    </span>
                                </label>
                                
                                <button 
                                    type="submit"
                                    disabled={!agreedToTerms}
                                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl text-lg uppercase tracking-wider transition-colors"
                                >
                                    Submit Film
                                </button>
                            </section>
                        </form>
                    </>
                )}
            </main>
            
            <Footer />
        </div>
    );
};

export default SubmitPage;
