
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FestivalProvider } from './contexts/FestivalContext';
import { inject } from '@vercel/analytics';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

// Inject Vercel Analytics
inject();

// Import all page components
import App from './App';
import AdminPage from './AdminPage';
import LandingPage from './components/LandingPage';
import ClassicsPage from './components/ClassicsPage';
import PublicSquarePage from './components/PublicSquarePage';
import CratemasPage from './components/CratemasPage';
import SubmitPage from './SubmitPage';
import MoviePage from './components/MoviePage';
import MerchPage from './components/MerchPage';
import ContactPage from './components/ContactPage';
import AboutPage from './components/AboutPage';
import LoginPage from './components/LoginPage';
import AccountPage from './components/AccountPage';
import FestivalPage from './components/FestivalPage';
import CrateFestPage from './components/CrateFestPage';
import FilmFestivalModule from './FilmFestivalModule';
import DeveloperGuidePage from './components/DeveloperGuidePage';
import ThankYouPage from './ThankYouPage';
import TopTenPage from './components/TopTenPage';
import ActorPortalPage from './components/ActorPortalPage';
import ActorSignupPage from './ActorSignupPage';
import ActorsDirectoryPage from './components/ActorsDirectoryPage';
import ActorProfilePage from './components/ActorProfilePage';
import WatchlistPage from './components/WatchlistPage';
import FilmmakerPortalPage from './components/FilmmakerPortalPage';
import FilmmakerSignupPage from './components/FilmmakerSignupPage';
import RokuGuidePage from './components/RokuGuidePage';
import LoadingSpinner from './components/LoadingSpinner';
import Intro from './components/Intro';
import CreatorPortalPage from './components/CreatorPortalPage';
import CreatorDashboardPage from './components/CreatorDashboardPage';
import { WatchPartyPage } from './components/WatchPartyPage';
import TalentPage from './components/TalentPage';
import LinkRokuPage from './components/LinkRokuPage';
import SubmissionTermsPage from './components/SubmissionTermsPage';
import PitchDeckPage from './components/PitchDeckPage';
import ZinePage from './components/ZinePage';
import JuryRoomPage from './components/JuryRoomPage';


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// This component now contains the router and authentication logic.
const AppRouter: React.FC = () => {
  const [route, setRoute] = useState(window.location.pathname);
  const { user, authInitialized, claimsLoaded } = useAuth();

  useEffect(() => {
    const onNavigate = () => {
      setRoute(window.location.pathname);
      window.scrollTo(0, 0);
      
      // Track engagement for smart install prompt
      const views = parseInt(localStorage.getItem('crate_tv_engagement_views') || '0', 10);
      localStorage.setItem('crate_tv_engagement_views', (views + 1).toString());
    };
    
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('pushstate', onNavigate);

    return () => {
      window.removeEventListener('popstate', onNavigate);
      window.removeEventListener('pushstate', onNavigate);
    };
  }, []);
  
  const RedirectToLogin: React.FC = () => {
    useEffect(() => {
      const currentPath = window.location.pathname + window.location.search;
      const loginUrl = new URL('/login', window.location.origin);
      if (currentPath !== '/' && currentPath !== '/login') {
          loginUrl.searchParams.set('redirect', currentPath);
          if (currentPath.startsWith('/watchparty')) {
              loginUrl.searchParams.set('view', 'signup');
          }
      }
      window.history.replaceState({}, '', loginUrl.toString());
      window.dispatchEvent(new Event('pushstate'));
    }, []);
    return <LoginPage />;
  };

  const movieMatch = route.match(/^\/movie\/([a-zA-Z0-9_-]+)/);
  if (movieMatch && movieMatch[1]) {
    return user ? <MoviePage movieKey={movieMatch[1]} /> : <RedirectToLogin />;
  }

  const watchPartyMatch = route.match(/^\/watchparty\/([a-zA-Z0-9_-]+)/);
  if (watchPartyMatch && watchPartyMatch[1]) {
    return user ? <WatchPartyPage movieKey={watchPartyMatch[1]} /> : <RedirectToLogin />;
  }

  const actorProfileMatch = route.match(/^\/actors-directory\/([a-zA-Z0-9_-]+)/);
  if (actorProfileMatch && actorProfileMatch[1]) {
    return <ActorProfilePage slug={actorProfileMatch[1]} />;
  }

  const zineMatch = route.match(/^\/zine\/([a-zA-Z0-9_-]+)/);
  if (zineMatch && zineMatch[1]) {
      return <ZinePage storyId={zineMatch[1]} />;
  }


  switch (route) {
    case '/':
      return user ? <App /> : <LandingPage />;
    case '/zine':
      return <ZinePage />;
    case '/jury':
        return <JuryRoomPage />;
    case '/account':
      return user ? <AccountPage /> : <RedirectToLogin />;
    case '/link-roku':
      return user ? <LinkRokuPage /> : <RedirectToLogin />;
    case '/festival':
       return user ? <FestivalPage /> : <RedirectToLogin />;
    case '/cratefest':
       return user ? <CrateFestPage /> : <RedirectToLogin />;
    case '/watchlist':
      return user ? <WatchlistPage /> : <RedirectToLogin />;
    case '/classics':
      return user ? <ClassicsPage /> : <RedirectToLogin />;
    case '/public-square':
      return user ? <PublicSquarePage /> : <RedirectToLogin />;
    case '/cratemas':
      return user ? <CratemasPage /> : <RedirectToLogin />;
    case '/top-ten':
      return <TopTenPage />;
    case '/submission-terms':
      return <SubmissionTermsPage />;
    case '/pitchdeck':
      return <PitchDeckPage />;
    case '/portal': {
      if (!authInitialized || (user && !claimsLoaded)) return <LoadingSpinner />;
      if (user && (user.isActor || user.isFilmmaker || user.isIndustryPro)) {
        return <CreatorDashboardPage />;
      }
      return <CreatorPortalPage />;
    }
    case '/login': {
        if (authInitialized && user) {
            const RedirectAfterLogin: React.FC = () => {
                useEffect(() => {
                    const params = new URLSearchParams(window.location.search);
                    const redirect = params.get('redirect') || '/';
                    window.history.replaceState({}, '', redirect);
                    window.dispatchEvent(new Event('pushstate'));
                }, []);
                return <LoadingSpinner />;
            };
            return <RedirectAfterLogin />;
        }
        return <LoginPage />;
    }
    case '/submit':
      return <SubmitPage />;
    case '/actor-signup':
      return <ActorSignupPage />;
    case '/actors-directory':
      return <ActorsDirectoryPage />;
    case '/filmmaker-signup':
      return <FilmmakerSignupPage />;
    case '/thank-you':
      return <ThankYouPage />;
    case '/contact':
      return <ContactPage />;
    case '/about':
      return <AboutPage />;
    case '/roku-guide':
      return <RokuGuidePage />;
    case '/talent':
      return <TalentPage />;
    case '/actor-portal': {
      if (!authInitialized) return <LoadingSpinner />;
      if (!user) return <RedirectToLogin />;
      return <ActorPortalPage />;
    }
    case '/filmmaker-dashboard': {
        if (!authInitialized) return <LoadingSpinner />;
        if (!user) return <RedirectToLogin />;
        return <FilmmakerPortalPage />;
    }
    case '/admin':
      return <AdminPage />;
    case '/filmfestivalmodule':
      return <FilmFestivalModule />;
    case '/developer-guide':
      return <DeveloperGuidePage />;
    default:
      return user ? <App /> : <LandingPage />;
  }
};

const MainApp: React.FC = () => (
  <AuthProvider>
    <FestivalProvider>
      <GlobalErrorBoundary>
        <AppRouter />
      </GlobalErrorBoundary>
    </FestivalProvider>
  </AuthProvider>
);

root.render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);
