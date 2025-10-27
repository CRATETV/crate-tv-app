import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FestivalProvider } from './contexts/FestivalContext';

// Import all page components
import App from './App';
import AdminPage from './AdminPage';
import Intro from './components/Intro';
import ClassicsPage from './components/ClassicsPage';
import SubmitPage from './components/SubmitPage';
import MoviePage from './components/MoviePage';
import MerchPage from './components/MerchPage';
import ContactPage from './components/ContactPage';
import AboutPage from './components/AboutPage';
import LoginPage from './components/LoginPage';
import AccountPage from './components/AccountPage';
import FestivalPage from './components/FestivalPage';
import FilmFestivalModule from './FilmFestivalModule';
import DeveloperGuidePage from './components/DeveloperGuidePage';
import AnalyticsPage from './components/AnalyticsPage';
import LandingPage from './components/LandingPage';
import ThankYouPage from './components/ThankYouPage';
// import PremiumPage from './components/PremiumPage'; // Reverted

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
    // Make the MoviePage public; it will handle its own auth checks internally.
    return <MoviePage movieKey={movieMatch[1]} />;
  }

  // Handle static routes with authentication checks
  switch (route) {
    case '/':
      return user ? <App /> : <LandingPage />;
    case '/account':
      return user ? <AccountPage /> : <RedirectToLogin />;
    case '/festival':
       return user ? <FestivalPage /> : <RedirectToLogin />;
    
    // Public Routes
    case '/login':
      return <LoginPage />;
    case '/classics':
      return <ClassicsPage />;
    case '/submit':
      return <SubmitPage />;
    case '/thank-you':
      return <ThankYouPage />;
    case '/merch':
      return <MerchPage />;
    case '/admin':
      return <AdminPage />;
    case '/analytics':
      return <AnalyticsPage />;
    case '/contact':
      return <ContactPage />;
    case '/about':
      return <AboutPage />;
    case '/filmfestivalmodule':
      return <FilmFestivalModule />;
    case '/developer-guide':
      return <DeveloperGuidePage />;
    default:
      // Fallback to the appropriate homepage for any unknown routes
      return user ? <App /> : <LandingPage />;
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
      <FestivalProvider>
        <Root />
      </FestivalProvider>
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