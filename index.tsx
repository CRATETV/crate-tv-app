import React, { useState, useEffect, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FestivalProvider } from './contexts/FestivalContext';
import LoadingSpinner from './components/LoadingSpinner';

// Dynamically import page components for code splitting
const App = lazy(() => import('./App'));
const AdminPage = lazy(() => import('./AdminPage'));
const Intro = lazy(() => import('./components/Intro'));
const ClassicsPage = lazy(() => import('./components/ClassicsPage'));
const SubmitPage = lazy(() => import('./components/SubmitPage'));
const MoviePage = lazy(() => import('./components/MoviePage'));
const MerchPage = lazy(() => import('./components/MerchPage'));
const ContactPage = lazy(() => import('./components/ContactPage'));
const AboutPage = lazy(() => import('./components/AboutPage'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const AccountPage = lazy(() => import('./components/AccountPage'));
const FestivalPage = lazy(() => import('./components/FestivalPage'));
const FilmFestivalModule = lazy(() => import('./FilmFestivalModule'));
const DeveloperGuidePage = lazy(() => import('./components/DeveloperGuidePage'));
const AnalyticsPage = lazy(() => import('./components/AnalyticsPage'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const ThankYouPage = lazy(() => import('./components/ThankYouPage'));
const TopTenPage = lazy(() => import('./components/TopTenPage'));
const ActorPortalPage = lazy(() => import('./components/ActorPortalPage'));
const ActorSignupPage = lazy(() => import('./components/ActorSignupPage'));
const ActorsDirectoryPage = lazy(() => import('./components/ActorsDirectoryPage'));
const ActorProfilePage = lazy(() => import('./components/ActorProfilePage'));
const WatchlistPage = lazy(() => import('./components/WatchlistPage'));
const FilmmakerSignupPage = lazy(() => import('./components/FilmmakerSignupPage'));
const FilmmakerPortalPage = lazy(() => import('./components/FilmmakerPortalPage'));
const PremiumPage = lazy(() => import('./components/PremiumPage'));


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

  const actorProfileMatch = route.match(/^\/actors\/([a-zA-Z0-9_-]+)/);
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
    
    // Public Routes
    case '/login':
      return <LoginPage />;
    case '/classics':
      return <ClassicsPage />;
    case '/top-ten':
      return <TopTenPage />;
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
        <Suspense fallback={<LoadingSpinner />}>
          <Root />
        </Suspense>
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