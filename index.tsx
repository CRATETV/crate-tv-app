import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FestivalProvider } from './contexts/FestivalContext';
import { inject } from '@vercel/analytics';

// Inject Vercel Analytics
inject();

// Import all page components
import App from './App';
// FIX: Corrected import path
import AdminPage from './AdminPage';
import LandingPage from './components/LandingPage';
// FIX: Corrected import path
import ClassicsPage from './components/ClassicsPage';
import SubmitPage from './components/SubmitPage';
// FIX: Corrected import path
import MoviePage from './components/MoviePage';
import MerchPage from './components/MerchPage';
import ContactPage from './components/ContactPage';
import AboutPage from './components/AboutPage';
// FIX: Corrected import path
import LoginPage from './components/LoginPage';
import AccountPage from './components/AccountPage';
import FestivalPage from './components/FestivalPage';
import FilmFestivalModule from './FilmFestivalModule';
import DeveloperGuidePage from './components/DeveloperGuidePage';
import ThankYouPage from './components/ThankYouPage';
import TopTenPage from './components/TopTenPage';
// FIX: Corrected import path
import ActorPortalPage from './components/ActorPortalPage';
import ActorSignupPage from './components/ActorSignupPage';
import ActorsDirectoryPage from './components/ActorsDirectoryPage';
import ActorProfilePage from './components/ActorProfilePage';
// FIX: Corrected import path
import WatchlistPage from './components/WatchlistPage';
// FIX: Corrected import path
import FilmmakerPortalPage from './components/FilmmakerPortalPage';
import FilmmakerSignupPage from './components/FilmmakerSignupPage';
import RokuGuidePage from './components/RokuGuidePage';
import LoadingSpinner from './components/LoadingSpinner';
import Intro from './components/Intro';
import CreatorPortalPage from './components/CreatorPortalPage';
import CreatorDashboardPage from './components/CreatorDashboardPage';
import WatchPartyPage from './components/WatchPartyPage';


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
    };
    
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('pushstate', onNavigate);

    return () => {
      window.removeEventListener('popstate', onNavigate);
      window.removeEventListener('pushstate', onNavigate);
    };
  }, []);
  
  // A simple component to handle redirects for protected routes.
  const RedirectToLogin: React.FC = () => {
    useEffect(() => {
      const currentPath = window.location.pathname + window.location.search;
      const loginUrl = new URL('/login', window.location.origin);
      // Don't set a redirect for the root path
      if (currentPath !== '/' && currentPath !== '/login') {
          loginUrl.searchParams.set('redirect', currentPath);
      }
      // Use replaceState to not add a bad entry to the browser's history
      window.history.replaceState({}, '', loginUrl.toString());
      window.dispatchEvent(new Event('pushstate'));
    }, []);
    
    // Render the login page immediately to avoid a flash of other content.
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


  // Handle static routes with authentication checks
  switch (route) {
    case '/':
      return user ? <App /> : <LandingPage />;
    case '/account':
      return user ? <AccountPage /> : <RedirectToLogin />;
    case '/festival':
       return user ? <FestivalPage /> : <RedirectToLogin />;
    case '/watchlist':
      return user ? <WatchlistPage /> : <RedirectToLogin />;
    case '/classics':
      return user ? <ClassicsPage /> : <RedirectToLogin />;
    case '/top-ten': // Made public per user request
      return <TopTenPage />;
    
    // Unified Portal Route
    case '/portal': {
      if (!authInitialized || (user && !claimsLoaded)) return <LoadingSpinner />;
      if (user && (user.isActor || user.isFilmmaker)) {
        return <CreatorDashboardPage />;
      }
      return <CreatorPortalPage />; // Public-facing portal page
    }

    // Public Routes
    case '/login': {
        // If the user is authenticated, redirect them away from the login page.
        // This prevents the "login twice" bug by handling the redirect after the user state is fully updated.
        if (authInitialized && user) {
            const RedirectAfterLogin: React.FC = () => {
                useEffect(() => {
                    const params = new URLSearchParams(window.location.search);
                    const redirect = params.get('redirect') || '/';
                    window.history.replaceState({}, '', redirect);
                    window.dispatchEvent(new Event('pushstate'));
                }, []);
                return <LoadingSpinner />; // Show a spinner during the brief transition
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
      
    // Legacy Protected Actor Route (now redirects to unified portal)
    case '/actor-portal': {
      if (!authInitialized) return <LoadingSpinner />;
      if (!user) return <RedirectToLogin />;
      return <ActorPortalPage />; // This component now just redirects
    }

    // Legacy Protected Filmmaker Route (now redirects to unified portal)
    case '/filmmaker-dashboard': {
        if (!authInitialized) return <LoadingSpinner />;
        if (!user) return <RedirectToLogin />;
        return <FilmmakerPortalPage />; // This component now just redirects
    }

    // Admin & Dev routes
    case '/admin':
      return <AdminPage />;
    case '/filmfestivalmodule':
      return <FilmFestivalModule />;
    case '/developer-guide':
      return <DeveloperGuidePage />;
    default:
      // Fallback to the appropriate homepage for any unknown routes
      return user ? <App /> : <LandingPage />;
  }
};

const MainApp: React.FC = () => {
  const [showIntro, setShowIntro] = useState(() => {
    const lastSeen = localStorage.getItem('introSeenTimestamp');
    if (!lastSeen) {
      return true; // Never seen before
    }
    const oneDay = 24 * 60 * 60 * 1000;
    // Show if more than 24 hours have passed
    return (Date.now() - parseInt(lastSeen, 10)) > oneDay;
  });

  const handleIntroEnd = () => {
    localStorage.setItem('introSeenTimestamp', Date.now().toString());
    setShowIntro(false);
  };

  return (
    <AuthProvider>
      <FestivalProvider>
        {showIntro ? <Intro onIntroEnd={handleIntroEnd} /> : <AppRouter />}
      </FestivalProvider>
    </AuthProvider>
  );
};

root.render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);

// Register the Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}