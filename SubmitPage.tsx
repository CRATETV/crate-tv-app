import React, { useState } from 'react';
import Header from './components/Header';
import CollapsibleFooter from './components/CollapsibleFooter';
import BottomNavBar from './components/BottomNavBar';
import PublicS3Uploader from './components/PublicS3Uploader';

const SubmitPage: React.FC = () => {
    const [posterUrl, setPosterUrl] = useState('');
    const [movieUrl, setMovieUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!posterUrl || !movieUrl) {
            setError('Please upload both a poster and a movie file before submitting.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());
        
        const submissionData = {
            ...data,
            posterUrl,
            movieUrl,
        };

        try {
            const response = await fetch('/api/send-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server responded with an error.');
            }

            window.history.pushState({}, '', '/thank-you');
            window.dispatchEvent(new Event('pushstate'));

        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formInputClasses = "form-input";
    
    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
            />

            <main className="flex-grow pt-20 pb-24 md:pb-0">
                <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4 text-white">Film Submission Portal</h1>
                    <p className="text-center mb-10 text-lg sm:text-xl text-gray-400">
                        Showcase your work and share your story with the world.
                    </p>

                    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-[#1a1a1a] p-6 sm:p-8 rounded-xl shadow-lg border border-[#4a4a6e] space-y-6">
                        <div>
                            <label htmlFor="filmTitle" className="block text-sm font-medium text-gray-400 mb-2">Film Title</label>
                            <input type="text" id="filmTitle" name="filmTitle" className={formInputClasses} required />
                        </div>
                        <div>
                            <label htmlFor="directorName" className="block text-sm font-medium text-gray-400 mb-2">Director's Name</label>
                            <input type="text" id="directorName" name="directorName" className={formInputClasses} required />
                        </div>
                         <div>
                            <label htmlFor="cast" className="block text-sm font-medium text-gray-400 mb-2">Main Cast (comma-separated)</label>
                            <input type="text" id="cast" name="cast" className={formInputClasses} required placeholder="e.g., Actor One, Actor Two" />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Contact Email</label>
                            <input type="email" id="email" name="email" className={formInputClasses} required />
                        </div>
                        <div>
                            <label htmlFor="synopsis" className="block text-sm font-medium text-gray-400 mb-2">Synopsis</label>
                            <textarea id="synopsis" name="synopsis" rows={4} className={formInputClasses} required></textarea>
                        </div>
                        
                        <div className="space-y-4">
                            <PublicS3Uploader
                                label="Upload Film Poster (2:3 aspect ratio recommended)"
                                onUploadSuccess={setPosterUrl}
                                accept="image/png, image/jpeg, image/webp"
                            />
                             <PublicS3Uploader
                                label="Upload Full Movie File"
                                onUploadSuccess={setMovieUrl}
                                accept="video/mp4,video/quicktime,video/x-msvideo,video/x-m4v"
                            />
                        </div>

                        <button type="submit" className="submit-btn w-full mt-8" disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Film'}
                        </button>
                        
                        {error && (
                            <div className="mt-4 text-center text-red-500">
                                <p>{error}</p>
                            </div>
                        )}
                    </form>
                </div>
            </main>

            <CollapsibleFooter />
            <BottomNavBar 
                onSearchClick={() => {}}
            />
        </div>
    );
};

export default SubmitPage;