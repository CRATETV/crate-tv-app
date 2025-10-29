import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import MoviePage from './components/MoviePage';
import AdminPage from './AdminPage';
import AboutPage from './components/AboutPage';
import AccountPage from './components/AccountPage';
import ClassicsPage from './components/ClassicsPage';
import ContactPage from './components/ContactPage';
import DeveloperGuidePage from './components/DeveloperGuidePage';
import LoginPage from './components/LoginPage';
import MerchPage from './components/MerchPage';
import PremiumPage from './components/PremiumPage';
import RokuGuidePage from './components/RokuGuidePage';
import SubmitPage from './components/SubmitPage';
import WatchlistPage from './components/WatchlistPage';
import FestivalPage from './components/FestivalPage';
import ActorSignupPage from './components/ActorSignupPage';
import ActorPortalPage from './components/ActorPortalPage';
import ActorsDirectoryPage from './components/ActorsDirectoryPage';
import ActorProfilePage from './components/ActorProfilePage';
import FilmmakerSignupPage from './components/FilmmakerSignupPage';
import FilmmakerPortalPage from './components/FilmmakerPortalPage';
import TopTenPage from './components/TopTenPage';
import ComingSoonPage from './components/ComingSoonPage';
import ThankYouPage from './components/ThankYouPage';

import { useAuth } from './contexts/AuthContext.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';

const App: React.FC = () => {
    const { authInitialized } = useAuth();
    const [route, setRoute] = useState(window.location.pathname);

    useEffect(() => {
        const onNavigate = () => {
            setRoute(window.location.pathname);
        };
        window.addEventListener('pushstate', onNavigate);
        window.addEventListener('popstate', onNavigate);
        return () => {
            window.removeEventListener('pushstate', onNavigate);
            window.removeEventListener('popstate', onNavigate);
        };
    }, []);

    if (!authInitialized) {
        return <LoadingSpinner />;
    }
    
    const path = route.toLowerCase();

    if (path.startsWith('/movie/')) {
        const movieKey = route.split('/')[2];
        return <MoviePage movieKey={movieKey} />;
    }
    
    if (path.startsWith('/actor/')) {
      const actorSlug = route.split('/')[2];
      return <ActorProfilePage slug={actorSlug} />;
    }

    switch (path) {
        case '/admin': return <AdminPage />;
        case '/about': return <AboutPage />;
        case '/account': return <AccountPage />;
        case '/classics': return <ClassicsPage />;
        case '/contact': return <ContactPage />;
        case '/developer': return <DeveloperGuidePage />;
        case '/login': return <LoginPage />;
        case '/merch': return <MerchPage />;
        case '/premium': return <PremiumPage />;
        case '/roku-guide': return <RokuGuidePage />;
        case '/submit': return <SubmitPage />;
        case '/watchlist': return <WatchlistPage />;
        case '/festival': return <FestivalPage />;
        case '/actor-signup': return <ActorSignupPage />;
        case '/actor-portal': return <ActorPortalPage />;
        case '/actors': return <ActorsDirectoryPage />;
        case '/filmmaker-signup': return <FilmmakerSignupPage />;
        case '/filmmaker-portal': return <FilmmakerPortalPage />;
        case '/top-ten': return <TopTenPage />;
        case '/coming-soon': return <ComingSoonPage />;
        case '/thank-you': return <ThankYouPage />;
        default: return <LandingPage />;
    }
};

export default App;
