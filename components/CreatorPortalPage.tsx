
import React from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';

const PortalCard: React.FC<{ title: string; description: string; signupPath: string; loginPath: string; bgImage: string; }> = ({ title, description, signupPath, loginPath, bgImage }) => {
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div className="relative rounded-lg overflow-hidden border border-gray-700 group flex flex-col justify-between min-h-[400px] md:min-h-[500px]">
            <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent"></div>
            <div className="relative z-10 p-8 flex flex-col justify-end h-full">
                <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
                <p className="text-gray-300 mb-6">{description}</p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <a 
                        href={signupPath} 
                        onClick={(e) => handleNavigate(e, signupPath)}
                        className="flex-1 text-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        Signup
                    </a>
                    <a 
                        href={loginPath} 
                        onClick={(e) => handleNavigate(e, loginPath)}
                        className="flex-1 text-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        Login
                    </a>
                </div>
            </div>
        </div>
    );
};


const CreatorPortalPage: React.FC = () => {
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
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Creator Portals</h1>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                           Access your dashboard to view analytics, update your profile, and connect with the community.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <PortalCard 
                            title="For Filmmakers"
                            description="Access performance analytics for your films, track revenue from donations and ads, and manage payouts."
                            signupPath="/filmmaker-signup"
                            loginPath="/login?redirect=/filmmaker-dashboard"
                            bgImage="https://cratetelevision.s3.us-east-1.amazonaws.com/filmmaker-bg.jpg"
                        />
                         <PortalCard 
                            title="For Actors"
                            description="Update your public profile with a new bio and headshots, and connect with other actors in the Green Room."
                            signupPath="/actor-signup"
                            loginPath="/login?redirect=/actor-portal"
                            bgImage="https://cratetelevision.s3.us-east-1.amazonaws.com/actor-bg.jpg"
                        />
                    </div>
                </div>
            </main>
            <CollapsibleFooter showActorLinks={true} />
        </div>
    );
};

export default CreatorPortalPage;