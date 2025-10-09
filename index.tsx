import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext.tsx';

// Import all page components
import App from './App.tsx';
import AdminPage from './AdminPage.tsx';
import ClassicsPage from './components/ClassicsPage.tsx';
import SubmitPage from './components/SubmitPage.tsx';
import MoviePage from './components/MoviePage.tsx';
import Intro from './components/Intro.tsx';
import MerchPage from './components/MerchPage.tsx';
import ContactPage from './components/ContactPage.tsx';
import PremiumPage from './components/PremiumPage.tsx';
import LoginPage from './components/LoginPage.tsx';
import AccountPage from './components/AccountPage.tsx';
import RokuGuidePage from './components/RokuGuidePage.tsx';
import FestivalPage from './components/FestivalPage.tsx';
import FilmFestivalModule from './FilmpFestivalModule.tsx';
import DeveloperGuidePage from './components/DeveloperGuidePage.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// The main application router, now simplified to only handle routing.
const AppRouter: React.FC = () => {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const onNavigate = () => {
      setRoute(window.location.pathname);
      // Scroll to top on page change
      window.scrollTo(0, 0);
    };
    
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('pushstate', onNavigate); // Custom event used by components

    return () => {
      window.removeEventListener('popstate', onNavigate);
      window.removeEventListener('pushstate', onNavigate);
    };
  }, []);
  
  // Match dynamic movie page route, e.g., /movie/lifeless
  const movieMatch = route.match(/^\/movie\/([a-zA-Z0-9_-]+)/);
  if (movieMatch && movieMatch[1]) {
    return <MoviePage movieKey={movieMatch[1]} />;
  }

  // Handle static routes
  switch (route) {
    case '/':
      return <App />;
    case '/classics':
      return <ClassicsPage />;
    case '/submit':
      return <SubmitPage />;
    case '/merch':
      return <MerchPage />;
    case '/admin':
      return <AdminPage />;
    case '/contact':
      return <ContactPage />;
    case '/premium':
      return <PremiumPage />;
    case '/login':
      return <LoginPage />;
    case '/account':
      return <AccountPage />;
    case '/roku-guide':
      return <RokuGuidePage />;
    case '/festival':
      return <FestivalPage />;
    case '/filmfestivalmodule':
      return <FilmFestivalModule />;
    case '/developer-guide':
      return <DeveloperGuidePage />;
    default:
      // Fallback to the homepage for any unknown routes
      return <App />;
  }
};

// New Root component to manage the intro video display logic.
const Root: React.FC = () => {
  const [showIntro, setShowIntro] = useState(!sessionStorage.getItem('introPlayed'));

  const handleIntroEnd = () => {
    sessionStorage.setItem('introPlayed', 'true');
    setShowIntro(false);
  };

  // Show intro video once per session
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