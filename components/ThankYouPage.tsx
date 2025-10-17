import React from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';

const ThankYouPage: React.FC = () => {
    const dropboxLink = "https://www.dropbox.com/scl/fo/y70i8ce1muwlrwpp10ipj/AIeiyA9JJUAtQEUXBxhHU2k?rlkey=06ah0cg3cmd24933u1wcyr8gq&st=fnvy5rd2&dl=0";

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
            />
            <main className="flex-grow flex items-center justify-center text-center p-4">
                <div className="max-w-2xl bg-gray-800/50 border border-gray-700 rounded-lg p-8 sm:p-12 animate-[fadeIn_0.5s_ease-out]">
                    <div className="mb-6">
                        <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Submission Received!</h1>
                    <p className="text-gray-300 mb-8">
                        Thank you for submitting your film details. The final and most important step is to upload your film files.
                    </p>
                    <a 
                        href={dropboxLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-block submit-btn text-lg mb-6"
                    >
                        Upload Film Files to Dropbox
                    </a>
                    <div>
                        <a href="/" onClick={(e) => handleNavigate(e, '/')} className="text-sm text-gray-400 hover:text-white transition">
                            &larr; Return to Homepage
                        </a>
                    </div>
                </div>
            </main>
            <Footer />
            <BackToTopButton />
        </div>
    );
};

export default ThankYouPage;
