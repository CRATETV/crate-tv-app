import React from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import BackToTopButton from './BackToTopButton';

const Step: React.FC<{ number: string; title: string; children: React.ReactNode; }> = ({ number, title, children }) => (
    <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-purple-600/20 text-purple-300 rounded-full flex items-center justify-center border-2 border-purple-500 font-bold text-lg">
            {number}
        </div>
        <div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <div className="text-gray-300 leading-relaxed space-y-2">{children}</div>
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
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Publishing Your Roku Channel</h1>
                        <p className="text-lg text-gray-400">
                           The official Roku developer guide is complex, but the process is simple with our automated tools. Here is the definitive guide to getting your custom channel live.
                        </p>
                    </div>

                    <h2 className="text-3xl font-bold text-center mb-8 text-green-400">The Foolproof 4-Step Process</h2>

                    <div className="space-y-10">
                       <Step number="1" title="Enable Developer Mode on Your Roku">
                            <p>On your Roku remote, press the following sequence:</p>
                            <code className="bg-gray-700 p-2 rounded-md text-purple-300 font-mono">Home (3x), Up (2x), Right, Left, Right, Left, Right</code>
                            <p>Follow the on-screen steps and take note of the IP address shown on your TV screen.</p>
                        </Step>
                        
                        <Step number="2" title="Download Your Channel's Source Code">
                             <p>
                                Go to your Admin Panel, navigate to the <strong className="text-white">"Roku"</strong> tab, and click the <strong className="text-white">"Download Channel Source (.zip)"</strong> button. This bundles all your app's code and assets into a single file.
                             </p>
                        </Step>

                        <Step number="3" title="Sideload and Package on Your Roku Device">
                            <p>In a web browser on your computer, navigate to your Roku's IP address (e.g., <code className="bg-gray-700 p-1 rounded-md text-xs">http://192.168.1.100</code>).</p>
                            <ol className="list-decimal list-inside space-y-2 pl-4 mt-2">
                                <li>On the developer page, click **Upload** and select the <code className="bg-gray-700 p-1 rounded-md text-xs">.zip</code> file you just downloaded.</li>
                                <li>After it installs, click the **Packager** link.</li>
                                <li>
                                    **First-Time Setup:** If 'Packager' isn't clickable, you must generate a signing key. This is a one-time setup per device. See the official Roku guide for `genkey` instructions if needed.
                                </li>
                                <li>Enter a password for your key, then click **Package**.</li>
                                <li>Click the link to download the final, signed <strong className="text-white">.pkg</strong> file.</li>
                            </ol>
                        </Step>
                        
                        <Step number="4" title="Upload to the Roku Channel Store">
                            <p>
                                Log in to your <a href="https://developer.roku.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Roku Developer Dashboard</a>. Go to "Manage My Channels," select your channel, and find the "Package Upload" page.
                            </p>
                            <p>Upload the <strong className="text-white">.pkg file</strong> you just got from your Roku device. This is the correctly signed package that the store will accept.</p>
                        </Step>
                    </div>
                    
                    <div className="mt-12 bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                        <h3 className="font-bold text-lg mb-2 text-white">What About Updates?</h3>
                        <p className="text-gray-300"><strong className="text-green-400">Content Updates:</strong> Adding new movies or changing categories in your admin panel will appear on your Roku channel <strong className="text-green-400">automatically</strong>. No new package is needed.</p>
                        <p className="text-gray-300 mt-2"><strong className="text-yellow-400">App Updates:</strong> You only need to repeat these steps if we add a new feature to the Roku channel's code itself (like a new UI design).</p>
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
