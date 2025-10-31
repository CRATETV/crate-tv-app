import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { inject } from '@vercel/analytics';

// Inject Vercel Analytics
inject();

// Import all page components
import App from './App';
// FIX: Corrected import path
import AdminPage from './AdminPage';
import Intro from './components/Intro';
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
import AnalyticsPage from './components/AnalyticsPage';
// FIX: Corrected import path
import FilmmakerPortalPage from './components/FilmmakerPortalPage';
import FilmmakerSignupPage from './components/FilmmakerSignupPage';
import RokuGuidePage from './components/RokuGuidePage';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// This component now contains the router and authentication logic.
const AppRouter: React.FC = () => {
  const [route, setRoute] = useState(window.location.pathname);
  const { user } = useAuth();

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

  const actorProfileMatch = route.match(/^\/actors\/([a-zA-Z0-9_-]+)/);
  if (actorProfileMatch && actorProfileMatch[1]) {
    return <ActorProfilePage slug={actorProfileMatch[1]} />;
  }


  // Handle static routes with authentication checks
  switch (route) {
    case '/':
      return user ? <App /> : <RedirectToLogin />;
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
    
    // Public Routes
    case '/login':
      return <LoginPage />;
    case '/submit':
      return <SubmitPage />;
    case '/actor-signup':
      return <ActorSignupPage />;
    case '/actor-portal':
      return <ActorPortalPage />;
    case '/actors':
      return <ActorsDirectoryPage />;
    case '/filmmaker-signup':
      return <FilmmakerSignupPage />;
    case '/filmmaker-portal':
      return <FilmmakerPortalPage />;
    case '/thank-you':
      return <ThankYouPage />;
    case '/merch':
      return <MerchPage />;
    case '/contact':
      return <ContactPage />;
    case '/about':
      return <AboutPage />;
    case '/roku-guide':
      return <RokuGuidePage />;
      
    // Admin & Dev routes
    case '/admin':
      return <AdminPage />;
    case '/analytics':
      return <AnalyticsPage />;
    case '/filmfestivalmodule':
      return <FilmFestivalModule />;
    case '/developer-guide':
      return <DeveloperGuidePage />;
    default:
      // Fallback to the appropriate homepage for any unknown routes
      return user ? <App /> : <RedirectToLogin />;
  }
};

// Manages the intro video display logic.
const Root: React.FC = () => {
  // Initialize state based on whether the user has seen the intro before.
  const [showIntro, setShowIntro] = useState(() => {
    try {
      // If 'hasSeenIntro' is in localStorage, we don't show the intro.
      return !localStorage.getItem('hasSeenIntro');
    } catch (e) {
      // If localStorage is unavailable (e.g., private browsing), default to showing intro.
      console.warn("Could not read from localStorage, showing intro by default.", e);
      return true;
    }
  });

  const handleIntroEnd = () => {
    try {
      // Set the flag in localStorage so the intro doesn't show on future visits.
      localStorage.setItem('hasSeenIntro', 'true');
    } catch (e) {
      console.warn("Could not write to localStorage to save intro state.", e);
    }
    setShowIntro(false);
  };

  if (showIntro) {
    return <Intro onIntroEnd={handleIntroEnd} />;
  }
  
  return <AppRouter />;
};

root.render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
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