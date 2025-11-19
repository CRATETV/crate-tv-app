import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FestivalProvider } from './contexts/FestivalContext';
import { inject } from '@vercel/analytics';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import UpdateBanner from './components/UpdateBanner';

// Inject Vercel Analytics
inject();

// Import all page components
import App from './App';
import AdminPage from './AdminPage';
import LandingPage from './components/LandingPage';
import ClassicsPage from './components/ClassicsPage';
import SubmitPage from './SubmitPage';
import { MoviePage } from './components/MoviePage';
import MerchPage from './components/MerchPage';
import ContactPage from './components/ContactPage';
import AboutPage from './components/AboutPage';
import LoginPage from './components/LoginPage';
import AccountPage from './components/AccountPage';
import FestivalPage from './components/FestivalPage';
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
    case '/link-roku':
      return user ? <LinkRokuPage /> : <RedirectToLogin />;
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
    case '/talent':
      return <TalentPage />;
      
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

const SideloadingInstructions: React.FC = () => (
  <div style={{
    backgroundColor: '#141414',
    color: 'white',
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    padding: '2rem',
    textAlign: 'center',
  }}>
    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EF4444', marginBottom: '1rem' }}>Initialization Error</h1>
    <p style={{ fontSize: '1.1rem', maxWidth: '600px', marginBottom: '1.5rem' }}>
      This application requires a development server to run correctly. Please do not open the <strong>index.html</strong> file directly.
    </p>
    <p style={{ fontSize: '1.1rem', maxWidth: '600px', marginBottom: '2rem' }}>
      To start the app, run the following commands in your project's terminal:
    </p>
    <pre style={{
      backgroundColor: '#1F2937',
      padding: '1rem 1.5rem',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      textAlign: 'left',
      color: '#A5B4FC',
      border: '1px solid #374151',
    }}>
      <code>
        <div style={{color: '#6B7280'}}># 1. Install dependencies (if you haven't already)</div>
        <div style={{fontWeight: 'bold', color: '#FBBF24'}}>npm install</div>
        <br/>
        <div style={{color: '#6B7280'}}># 2. Start the development server</div>
        <div>npm run dev</div>
      </code>
    </pre>
     <p style={{ fontSize: '0.9rem', color: '#6B7280', marginTop: '2rem' }}>
        The app will then be available at <a href="http://localhost:5373" style={{color: '#8B5CF6', textDecoration: 'underline'}}>http://localhost:5373</a>.
    </p>
  </div>
);


const MainApp: React.FC = () => {
  if (window.location.protocol === 'file:') {
    return <SideloadingInstructions />;
  }

  const [showIntro, setShowIntro] = useState(() => {
    const lastSeen = localStorage.getItem('introSeenTimestamp');
    if (!lastSeen) {
      return true; // Never seen before
    }
    const oneDay = 24 * 60 * 60 * 1000;
    // Show if more than 24 hours have passed
    return (Date.now() - parseInt(lastSeen, 10)) > oneDay;
  });

  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const onUpdate = (registration: ServiceWorkerRegistration) => {
    setShowUpdateBanner(true);
    setWaitingWorker(registration.waiting);
  };

  const handleRefresh = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
    setShowUpdateBanner(false);
  };

  useEffect(() => {
    serviceWorkerRegistration.register({ onUpdate });

    // This listener waits for the new service worker to take control and then reloads the page.
    let refreshing = false;
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
  }, []);

  const handleIntroEnd = () => {
    localStorage.setItem('introSeenTimestamp', Date.now().toString());
    setShowIntro(false);
  };

  return (
    <AuthProvider>
      <FestivalProvider>
        {showIntro ? <Intro onIntroEnd={handleIntroEnd} /> : <AppRouter />}
        {showUpdateBanner && (
            <UpdateBanner 
                onRefresh={handleRefresh} 
                onDismiss={() => setShowUpdateBanner(false)} 
            />
        )}
      </FestivalProvider>
    </AuthProvider>
  );
};

root.render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);