import React, { useState, useEffect } from 'react';
import Header from './Header';
// FIX: Corrected import path
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';

const Step: React.FC<{ number: string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {number}
        </div>
        <div>
            <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
            <p className="text-gray-400">{children}</p>
        </div>
    </div>
);

const RokuGuidePage: React.FC = () => {
    const { isFestivalLive } = useFestival();

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
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
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/ruko+logo+.webp" alt="Roku Logo" className="w-32 h-auto mx-auto mb-4" />
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Watch Crate TV on Roku</h1>
                        <p className="text-lg text-gray-400">
                           Follow these simple steps to install the official Crate TV channel and enjoy our films on your television.
                        </p>
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 space-y-8">
                        <Step number="1" title="Go to the Channel Store">
                            Turn on your Roku device and navigate to the "Streaming Channels" option on the left-hand menu. This is the Roku Channel Store.
                        </Step>
                        <Step number="2" title="Search for Crate TV">
                            Select "Search Channels" and type in <strong className="text-purple-400">"Crate TV"</strong> using the on-screen keyboard.
                        </Step>
                        <Step number="3" title="Add the Channel">
                            Select the Crate TV channel from the search results and then select "Add channel". It's completely free.
                        </Step>
                        <Step number="4" title="Find and Watch">
                            The Crate TV channel will now be on your Roku home screen. Open it up and enjoy our library of independent films!
                        </Step>
                    </div>
                </div>
            </main>

            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar 
                isFestivalLive={isFestivalLive}
                onSearchClick={() => {
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new Event('pushstate'));
                }}
            />
        </div>
    );
};

export default RokuGuidePage;