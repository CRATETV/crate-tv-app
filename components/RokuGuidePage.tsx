
import React from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import BackToTopButton from './BackToTopButton';

const Step: React.FC<{ number: string; title: string; children: React.ReactNode; }> = ({ number, title, children }) => (
    <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-purple-600/20 text-purple-300 rounded-full flex items-center justify-center border-2 border-purple-500 font-bold text-xl">
            {number}
        </div>
        <div>
            <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
            <div className="text-gray-300 leading-relaxed space-y-2">{children}</div>
        </div>
    </div>
);

const RokuGuidePage: React.FC = () => {
    
    return (
        <div className="flex flex-col min-h-screen text-white bg-black">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
                showNavLinks={true}
            />

            <main className="flex-grow pt-24 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                     <div className="text-center mb-16 animate-[fadeIn_0.8s_ease-out]">
                        <div className="flex justify-center mb-6">
                            <div className="bg-purple-600/10 p-6 rounded-3xl border border-purple-500/30">
                                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/ruko+logo+.webp" alt="Roku Logo" className="w-40 h-auto" />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">Watch Crate TV on the Big Screen</h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                           Stream your favorite independent films, attend live festivals, and join watch parties directly from your Roku device.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-12 mb-20">
                       <Step number="1" title="Install the Channel">
                            <p>Turn on your Roku and search for <strong className="text-white">"Crate TV"</strong> in the Streaming Channels store. Select "Add Channel" to install it to your home screen.</p>
                        </Step>
                        
                        <Step number="2" title="Launch & Explore">
                             <p>Open the Crate TV channel. You can browse our collection of free films immediately, or dive into our "Vintage Visions" section for silent classics.</p>
                        </Step>

                        <Step number="3" title="Generate your Link Code">
                            <p>To sync your Watchlist and Liked films, navigate to the <strong className="text-white">"My Account"</strong> row at the bottom of the home screen and select <strong className="text-white">"Link Account"</strong>. Your TV will display a unique 6-character code.</p>
                        </Step>
                        
                        <Step number="4" title="Connect on Web">
                            <p>
                                Using your phone or computer, stay logged in here and visit:
                            </p>
                            <div className="mt-4 flex items-center gap-4">
                                <a 
                                    href="/link-roku" 
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-transform hover:scale-105 inline-block"
                                >
                                    Link Device Now
                                </a>
                                <span className="text-gray-500 font-mono text-sm">cratetv.net/link-roku</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-4 italic">Once you enter the code, your TV will automatically refresh and your profile will be active.</p>
                        </Step>
                    </div>
                    
                    <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border border-white/5 shadow-2xl">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-grow">
                                <h3 className="text-2xl font-bold mb-3 text-white">Why link your account?</h3>
                                <ul className="space-y-3 text-gray-400">
                                    <li className="flex items-center gap-2">
                                        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Sync your "My List" across all devices
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Access your purchased Film Festival blocks
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Support filmmakers with direct tips on TV
                                    </li>
                                </ul>
                            </div>
                            <div className="hidden md:block w-48 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
                                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" alt="Crate TV Logo" className="w-full h-auto" />
                            </div>
                        </div>
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
