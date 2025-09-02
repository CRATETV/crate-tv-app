import React, { useState, useRef } from 'react';
import Header from './Header.tsx';
import Footer from './Footer.tsx';
import BackToTopButton from './BackToTopButton.tsx';
import SearchOverlay from './SearchOverlay.tsx';

const SubmitPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    
    // Form submission state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState<'success' | 'error' | null>(null);

    const formRef = useRef<HTMLFormElement>(null);
    
    // Hardcoded Dropbox file request link
    const dropboxLink = "https://www.dropbox.com/scl/fo/y70i8ce1muwlrwpp10ipj/AIeiyA9JJUAtQEUXBxhHU2k?rlkey=06ah0cg3cmd24933u1wcyr8gq&st=fnvy5rd2&dl=0";

    const handleSearchSubmit = (query: string) => {
        if (query) {
          window.location.href = `/?search=${encodeURIComponent(query)}`;
        }
    };
    
    // Form submission handler
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmissionStatus(null);

        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/send-submission', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Server responded with an error.');
            }

            setSubmissionStatus('success');
            formRef.current?.reset();

        } catch (error) {
            console.error('Submission error:', error);
            setSubmissionStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formInputClasses = "form-input";
    
    return (
        <div className="flex flex-col min-h-screen" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#000000', color: '#e0e0e0' }}>
            <Header 
                searchQuery={searchQuery} 
                onSearch={setSearchQuery} 
                isScrolled={true}
                onMobileSearchClick={() => setIsMobileSearchOpen(true)}
                onSearchSubmit={handleSearchSubmit}
            />

            <main className="flex-grow pt-20">
                <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4 text-white">Film Submission</h1>
                    <p className="text-center mb-10 text-lg sm:text-xl text-gray-400">
                        Showcase your work and share your story with the world.
                    </p>

                    <div className="bg-[#111111] p-6 sm:p-8 rounded-xl shadow-lg border border-[#4a4a6e] mb-12">
                        {submissionStatus === 'success' ? (
                            <div className="text-center p-8">
                                <h2 className="text-3xl font-bold text-green-500 mb-4">Information Sent!</h2>
                                <p className="text-gray-300 mb-6">Thank you! We have received your submission details.</p>
                                <p className="text-lg text-white mb-4">Your final step is to upload your film files:</p>
                                <a 
                                    href={dropboxLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-block submit-btn text-lg"
                                >
                                    Upload Files to Dropbox
                                </a>
                            </div>
                        ) : (
                            <form ref={formRef} id="submissionForm" onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="filmTitle" className="block text-sm font-medium text-gray-400 mb-2">Film Title</label>
                                    <input type="text" id="filmTitle" name="filmTitle" className={formInputClasses} required />
                                </div>
                                <div>
                                    <label htmlFor="directorName" className="block text-sm font-medium text-gray-400 mb-2">Director's Name</label>
                                    <input type="text" id="directorName" name="directorName" className={formInputClasses} required />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                                    <input type="email" id="email" name="email" className={formInputClasses} required />
                                </div>
                                <div>
                                    <label htmlFor="synopsis" className="block text-sm font-medium text-gray-400 mb-2">Synopsis</label>
                                    <textarea id="synopsis" name="synopsis" rows={4} className={formInputClasses} required></textarea>
                                </div>
                                <div>
                                    <label htmlFor="actorBio" className="block text-sm font-medium text-gray-400 mb-2">Actor Bios</label>
                                    <textarea id="actorBio" name="actorBio" rows={4} className={formInputClasses} placeholder="Provide a brief biography for the main actors."></textarea>
                                </div>
                                <div>
                                    <label htmlFor="awards" className="block text-sm font-medium text-gray-400 mb-2">Awards & Recognition</label>
                                    <textarea id="awards" name="awards" rows={2} className={formInputClasses} placeholder="List any awards the film has won."></textarea>
                                </div>
                                <div>
                                    <label htmlFor="relevantInfo" className="block text-sm font-medium text-gray-400 mb-2">Relevant Information</label>
                                    <textarea id="relevantInfo" name="relevantInfo" rows={4} className={formInputClasses} placeholder="Any other relevant details you'd like to share about the film."></textarea>
                                </div>

                                <button type="submit" className="submit-btn w-full mt-8" disabled={isSubmitting}>
                                    {isSubmitting ? 'Submitting...' : 'Submit Information'}
                                </button>
                                
                                {submissionStatus === 'error' && (
                                    <div className="mt-4 text-center text-red-500">
                                        <p>Something went wrong. Please try again later.</p>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
            <BackToTopButton />

            {isMobileSearchOpen && (
                <SearchOverlay 
                  searchQuery={searchQuery}
                  onSearch={setSearchQuery}
                  onClose={() => setIsMobileSearchOpen(false)}
                  onSubmit={(query) => {
                    handleSearchSubmit(query);
                    setIsMobileSearchOpen(false);
                  }}
                />
            )}
        </div>
    );
};

export default SubmitPage;