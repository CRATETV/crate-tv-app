import React, { useState } from 'react';
import Header from './components/Header';
import CollapsibleFooter from './components/CollapsibleFooter';
import BottomNavBar from './components/BottomNavBar';
import PublicS3Uploader from './components/PublicS3Uploader';

const FilmFreewayButton: React.FC<{ className?: string }> = ({ className = "" }) => (
    <a 
        href="https://filmfreeway.com" 
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-3 bg-[#2D3A44] hover:bg-[#3d4c58] text-white px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 active:scale-95 shadow-xl border border-white/10 ${className}`}
    >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="white"/>
        </svg>
        <span>Submit via FilmFreeway</span>
    </a>
);

const SubmitPage: React.FC = () => {
    const [posterUrl, setPosterUrl] = useState('');
    const [movieUrl, setMovieUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDirectForm, setShowDirectForm] = useState(false);
    
    const handleNavigate = (path: string) => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleEmailSubmit = () => {
        const emailSubject = encodeURIComponent("Film Submission for Crate TV Catalog Consideration");
        const emailBody = encodeURIComponent(`Hello Crate TV Team,

I would like to submit my work for consideration in your year-round streaming catalog.

FILM METADATA:
-------------------
Film Title: 
Director: 
Production Year: 
Duration: 
Genre: 

SCREENER ACCESS:
-------------------
Link (Vimeo/Drive/YouTube): 
Password (if applicable): 

LEGAL CONFIRMATION:
-------------------
[ ] I have reviewed the Submission Terms at cratetv.net/submission-terms and I agree to the Exhibition terms.
[ ] I certify that I own the rights to all music and content within this film.

Thank you,
[Your Name]`);

        window.location.href = `mailto:cratetiv@gmail.com?subject=${emailSubject}&body=${emailBody}`;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!posterUrl || !movieUrl) {
            setError('Please upload both a poster and a movie file before submitting.');
            return;
        }

        const formData = new FormData(e.target as HTMLFormElement);
        const musicRights = formData.get('musicRights');

        if (!musicRights) {
            setError('You must confirm that you possess the rights to the music in your film.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const data = Object.fromEntries(formData.entries());
        
        const submissionData = {
            ...data,
            posterUrl,
            movieUrl,
            musicRightsConfirmation: true
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
        <div className="flex flex-col min-h-screen bg-[#050505] text-white">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
                showNavLinks={true}
            />

            <main className="flex-grow pt-24 pb-24 md:pb-0">
                <section className="relative py-20 px-4 text-center overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://cratetelevision.s3.us-east-1.amazonaws.com/filmmaker-bg.jpg')] bg-cover bg-center opacity-10 blur-sm scale-110"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]"></div>
                    
                    <div className="relative z-10 max-w-4xl mx-auto">
                        <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter animate-[fadeIn_0.8s_ease-out]">
                            For <span className="text-red-600">Creators.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-300 mb-12 font-medium leading-relaxed max-w-3xl mx-auto">
                            Join a community dedicated to the bold and the unique. Choose your submission path below.
                        </p>
                    </div>
                </section>

                <div className="max-w-6xl mx-auto px-4 pb-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                        
                        {/* FESTIVAL PATH */}
                        <div className="bg-gray-900/40 border border-white/5 p-8 md:p-12 rounded-3xl flex flex-col items-center text-center group hover:bg-gray-900/60 transition-all duration-500 hover:border-red-500/20 shadow-2xl">
                            <div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 group-hover:scale-110 transition-transform">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            </div>
                            <h2 className="text-3xl font-black mb-4 uppercase tracking-tight">The Festival Path</h2>
                            <p className="text-gray-400 mb-8 flex-grow leading-relaxed">
                                Enter your film for **Official Selection** in our upcoming Film Festival. Compete for awards, digital laurels, and live watch party screenings.
                            </p>
                            <div className="space-y-4 w-full">
                                <FilmFreewayButton className="w-full justify-center py-4 text-lg" />
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Global Festival Circuit Selection</p>
                            </div>
                        </div>

                        {/* PLATFORM PATH */}
                        <div className="bg-gray-900/40 border border-white/5 p-8 md:p-12 rounded-3xl flex flex-col items-center text-center group hover:bg-gray-900/60 transition-all duration-500 hover:border-purple-500/20 shadow-2xl">
                            <div className="w-16 h-16 bg-purple-600/10 rounded-full flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform">
                                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            </div>
                            <h2 className="text-3xl font-black mb-4 uppercase tracking-tight">The Catalog Path</h2>
                            <p className="text-gray-400 mb-8 flex-grow leading-relaxed">
                                Submit directly to the **Crate TV Streaming Catalog**. Best for filmmakers looking for non-exclusive year-round distribution and direct monetization.
                            </p>
                            <div className="space-y-4 w-full">
                                <button 
                                    onClick={handleEmailSubmit}
                                    className="block w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-purple-900/20 text-lg text-center"
                                >
                                    Email us Your Film
                                </button>
                                <button 
                                    onClick={() => setShowDirectForm(!showDirectForm)}
                                    className="text-xs text-gray-500 hover:text-white transition-colors uppercase font-black tracking-widest border-b border-transparent hover:border-gray-500 pb-1"
                                >
                                    {showDirectForm ? 'Hide Form' : 'Use Direct Upload Form'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-16 text-center">
                        <button 
                            onClick={() => handleNavigate('/submission-terms')}
                            className="text-gray-400 hover:text-red-500 transition-colors text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 010.707 0.293l5.414 5.414a1 1 0 010.293 0.707V19a2 2 0 01-2 2z" /></svg>
                            Review Submission Rules & Non-Exclusive Terms
                        </button>
                    </div>

                    {showDirectForm && (
                        <div className="mt-20 animate-[fadeIn_0.5s_ease-out]">
                            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-[#111] p-8 sm:p-12 rounded-3xl shadow-2xl border border-white/5 space-y-6">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">Direct Submission</h2>
                                    <p className="text-gray-500 text-sm mt-2">Preferred for large files or private screeners.</p>
                                </div>
                                
                                <div>
                                    <label htmlFor="filmTitle" className="form-label">Film Title</label>
                                    <input type="text" id="filmTitle" name="filmTitle" className={formInputClasses} required />
                                </div>
                                <div>
                                    <label htmlFor="directorName" className="form-label">Director's Name</label>
                                    <input type="text" id="directorName" name="directorName" className={formInputClasses} required />
                                </div>
                                <div>
                                    <label htmlFor="email" className="form-label">Contact Email</label>
                                    <input type="email" id="email" name="email" className={formInputClasses} required />
                                </div>
                                <div>
                                    <label htmlFor="synopsis" className="form-label">Synopsis</label>
                                    <textarea id="synopsis" name="synopsis" rows={4} className={formInputClasses} required></textarea>
                                </div>
                                
                                <div className="space-y-4">
                                    <PublicS3Uploader
                                        label="Upload Film Poster (2:3 aspect ratio)"
                                        onUploadSuccess={setPosterUrl}
                                        accept="image/png, image/jpeg, image/webp"
                                    />
                                     <PublicS3Uploader
                                        label="Upload Full Movie File (or provide link below)"
                                        onUploadSuccess={setMovieUrl}
                                        accept="video/mp4,video/quicktime,video/x-msvideo,video/x-m4v"
                                    />
                                </div>

                                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            name="musicRights" 
                                            required 
                                            className="mt-1 w-5 h-5 rounded bg-gray-700 border-gray-600 text-red-600 focus:ring-red-500"
                                        />
                                        <span className="text-xs text-gray-400 leading-snug">
                                            <strong>Rights Confirmation:</strong> I certify that I own the distribution rights to this content and all music contained within. I agree to the <button type="button" onClick={() => handleNavigate('/submission-terms')} className="text-white underline">Submission Terms</button>.
                                        </span>
                                    </label>
                                </div>

                                <button type="submit" className="submit-btn w-full mt-2 py-4 text-lg" disabled={isSubmitting}>
                                    {isSubmitting ? 'Uploading to Review Pipeline...' : 'Submit Film Directly'}
                                </button>
                                
                                {error && (
                                    <div className="mt-4 text-center text-red-500 font-bold">
                                        <p>{error}</p>
                                    </div>
                                )}
                            </form>
                        </div>
                    )}
                </div>
            </main>

            <CollapsibleFooter />
            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export default SubmitPage;