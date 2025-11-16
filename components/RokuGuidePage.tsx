import React from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import BackToTopButton from './BackToTopButton';

const Step: React.FC<{ number: string; title: string; children: React.ReactNode; icon: React.ReactNode }> = ({ number, title, children, icon }) => (
    <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-purple-600/20 text-purple-300 rounded-full flex items-center justify-center">
            {icon}
        </div>
        <div>
            <h3 className="text-xl font-bold text-white mb-1"><span className="text-gray-500 mr-2">{number}.</span>{title}</h3>
            <p className="text-gray-400">{children}</p>
        </div>
    </div>
);

const RokuGuidePage: React.FC = () => {
    
    return (
        <div className="flex flex-col min-h-screen text-white">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
            />

            <main className="flex-grow pt-24 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-3xl mx-auto">
                     <div className="text-center mb-12">
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/roku+logo+.webp" alt="Roku Logo" className="w-32 h-auto mx-auto mb-4" />
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Watch Crate TV on Roku</h1>
                        <p className="text-lg text-gray-400">
                           Follow these simple steps to install the official Crate TV channel and enjoy our films on your television.
                        </p>
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 space-y-8">
                        <Step number="1" title="Go to the Channel Store" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}>
                            Turn on your Roku device and navigate to the "Streaming Channels" option on the left-hand menu. This is the Roku Channel Store.
                        </Step>
                        <Step number="2" title="Search for Crate TV" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}>
                            Select "Search Channels" and type in <strong className="text-purple-400">"Crate TV"</strong> using the on-screen keyboard.
                        </Step>
                        <Step number="3" title="Add the Channel" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
                            Select the Crate TV channel from the search results and then select "Add channel". It's completely free.
                        </Step>
                        <Step number="4" title="Find and Watch" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}>
                            The Crate TV channel will now be on your Roku home screen. Open it up and enjoy our library of independent films!
                        </Step>
                    </div>
                </div>
            </main>

            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar 
                onSearchClick={() => {
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new Event('pushstate'));
                }}
            />
        </div>
    );
};

export default RokuGuidePage;