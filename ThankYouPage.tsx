import React from 'react';
import Header from './components/Header';
import CollapsibleFooter from './components/CollapsibleFooter';

const ThankYouPage: React.FC = () => {
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
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Submission Complete!</h1>
                    <p className="text-gray-300 mb-8">
                        Thank you! We have received your film and its details. Our team will review your submission, and we will be in touch if it's a good fit for Crate TV.
                    </p>
                    <div>
                        <a href="/" onClick={(e) => handleNavigate(e, '/')} className="submit-btn inline-block">
                            &larr; Return to Homepage
                        </a>
                    </div>
                </div>
            </main>
            <CollapsibleFooter />
        </div>
    );
};

export default ThankYouPage;