
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage.tsx';
import MoviePage from './components/MoviePage.tsx';
import AdminPage from './AdminPage.tsx';
import AboutPage from './components/AboutPage.tsx';
import AccountPage from './components/AccountPage.tsx';
import ClassicsPage from './components/ClassicsPage.tsx';
import ContactPage from './components/ContactPage.tsx';
import DeveloperGuidePage from './components/DeveloperGuidePage.tsx';
import LoginPage from './components/LoginPage.tsx';
import MerchPage from './components/MerchPage.tsx';
import PremiumPage from './components/PremiumPage.tsx';
import RokuGuidePage from './components/RokuGuidePage.tsx';
import SubmitPage from './components/SubmitPage.tsx';
import WatchlistPage from './components/WatchlistPage.tsx';
import FestivalPage from './components/FestivalPage.tsx';
import ActorSignupPage from './components/ActorSignupPage.tsx';
import ActorPortalPage from './components/ActorPortalPage.tsx';
import ActorsDirectoryPage from './components/ActorsDirectoryPage.tsx';
import ActorProfilePage from './components/ActorProfilePage.tsx';
import FilmmakerSignupPage from './components/FilmmakerSignupPage.tsx';
import FilmmakerPortalPage from './components/FilmmakerPortalPage.tsx';
import TopTenPage from './components/TopTenPage.tsx';
import ComingSoonPage from './components/ComingSoonPage.tsx';
import ThankYouPage from './components/ThankYouPage.tsx';

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
