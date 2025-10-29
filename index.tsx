import React, { useState, useEffect, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { FestivalProvider } from './contexts/FestivalContext.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';

// Dynamically import page components for code splitting
const App = lazy(() => import('./App.tsx'));
const AdminPage = lazy(() => import('./AdminPage.tsx'));
const Intro = lazy(() => import('./components/Intro.tsx'));
const ClassicsPage = lazy(() => import('./components/ClassicsPage.tsx'));
const SubmitPage = lazy(() => import('./components/SubmitPage.tsx'));
const MoviePage = lazy(() => import('./components/MoviePage.tsx'));
const MerchPage = lazy(() => import('./components/MerchPage.tsx'));
const ContactPage = lazy(() => import('./components/ContactPage.tsx'));
const AboutPage = lazy(() => import('./components/AboutPage.tsx'));
const LoginPage = lazy(() => import('./components/LoginPage.tsx'));
const AccountPage = lazy(() => import('./components/AccountPage.tsx'));
const FestivalPage = lazy(() => import('./components/FestivalPage.tsx'));
const FilmFestivalModule = lazy(() => import('./FilmFestivalModule.tsx'));
const DeveloperGuidePage = lazy(() => import('./components/DeveloperGuidePage.tsx'));
const AnalyticsPage = lazy(() => import('./components/AnalyticsPage.tsx'));
const LandingPage = lazy(() => import('./components/LandingPage.tsx'));
const ThankYouPage = lazy(() => import('./components/ThankYouPage.tsx'));
const TopTenPage = lazy(() => import('./components/TopTenPage.tsx'));
const ActorPortalPage = lazy(() => import('./components/ActorPortalPage.tsx'));
const ActorSignupPage = lazy(() => import('./components/ActorSignupPage.tsx'));
const ActorsDirectoryPage = lazy(() => import('./components/ActorsDirectoryPage.tsx'));
const ActorProfilePage = lazy(() => import('./components/ActorProfilePage.tsx'));
const WatchlistPage = lazy(() => import('./components/WatchlistPage.tsx'));
const FilmmakerSignupPage = lazy(() => import('./components/FilmmakerSignupPage.tsx'));
const FilmmakerPortalPage = lazy(() => import('./components/FilmmakerPortalPage.tsx'));
const PremiumPage = lazy(() => import('./components/PremiumPage.tsx'));
const ComingSoonPage = lazy(() => import('./components/ComingSoonPage.tsx'));


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
    case '/coming-soon':
      return <ComingSoonPage />;
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
