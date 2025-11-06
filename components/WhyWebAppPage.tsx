import React from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
        <div className="flex items-center gap-4 mb-3">
            <div className="bg-red-600/20 text-red-400 p-2 rounded-lg">{icon}</div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        <p className="text-gray-400">{children}</p>
    </div>
);


const WhyWebAppPage: React.FC = () => {
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
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                            Why Isn't Crate TV in the App Store?
                        </h1>
                        <p className="text-lg text-gray-400">
                           We built Crate TV as a modern web app for a reason. It’s about speed, freedom, and putting creators first. Here’s why it’s better for you and for indie film.
                        </p>
                    </div>

                    <div className="space-y-8 mb-12">
                        <FeatureCard 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                            title="Instant Access, No Downloads"
                        >
                            No searching app stores, no waiting for downloads, no storage space wasted. Just go to cratetv.net on any device—phone, tablet, or desktop—and start watching instantly. It’s streaming, simplified.
                        </FeatureCard>

                        <FeatureCard 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5V4H4zm0 11h5v5H4v-5zm11 0h5v5h-5v-5zm0-11h5v5h-5V4z" /></svg>}
                            title="Always Up-to-Date"
                        >
                            We roll out new features and films all the time. With a web app, you never have to manually update anything. Every time you visit, you automatically have the latest and greatest version of Crate TV.
                        </FeatureCard>

                        <FeatureCard 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                            title="A Direct Connection"
                        >
                            By skipping the app stores, we bypass the gatekeepers. This means we have a direct relationship with you, our audience. It also means more of your support goes directly to filmmakers, not to platform fees. It’s the independent way.
                        </FeatureCard>
                    </div>

                    <div className="text-center bg-gray-800/50 border border-gray-700 rounded-lg p-8">
                        <h2 className="text-3xl font-bold text-white mb-4">Ready for a Better Experience?</h2>
                        <p className="text-gray-300 mb-6 max-w-xl mx-auto">
                            Join Crate TV today and experience a platform built for the love of film. It’s free to sign up and start exploring.
                        </p>
                        <a 
                            href="/login?view=signup"
                            onClick={(e) => handleNavigate(e, '/login?view=signup')}
                            className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform hover:scale-105"
                        >
                            Sign Up Now
                        </a>
                    </div>
                </div>
            </main>
            <CollapsibleFooter />
        </div>
    );
};

export default WhyWebAppPage;