import React from 'react';
import Header from './Header.tsx';
import Footer from './Footer.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';

const AccountPage: React.FC = () => {
    const { user, logout } = useAuth();

    // If user is not logged in, redirect them.
    if (!user) {
        if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/login');
            window.dispatchEvent(new Event('pushstate'));
        }
        return null; // Render nothing while redirecting
    }
    
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-xl bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-white mb-6">My Account</h1>
                    
                    <div className="space-y-4">
                        <div className="bg-gray-700/50 p-4 rounded-md">
                            <p className="text-sm text-gray-400">Email Address</p>
                            <p className="text-lg text-white font-medium">{user.email}</p>
                        </div>
                        <div className="bg-gray-700/50 p-4 rounded-md">
                            <p className="text-sm text-gray-400">Subscription</p>
                            {user.isPremiumSubscriber ? (
                                <p className="text-lg text-yellow-400 font-medium flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    Premium Member
                                </p>
                            ) : (
                                <p className="text-lg text-gray-300">
                                    Not a premium member. 
                                    <a href="/premium" onClick={(e) => handleNavigate(e, '/premium')} className="text-red-400 hover:underline ml-2">Upgrade Now</a>
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-md transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default AccountPage;
