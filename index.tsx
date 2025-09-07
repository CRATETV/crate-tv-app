import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import AdminPage from './AdminPage.tsx';
import MoviePage from './components/MoviePage.tsx';
import SubmitPage from './components/SubmitPage.tsx';
import ClassicsPage from './components/ClassicsPage.tsx';
import MerchPage from './components/MerchPage.tsx';
import PublishingGuidePage from './components/RokuGuidePage.tsx';
import Intro from './components/Intro.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const AppRouter: React.FC = () => {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [showIntro, setShowIntro] = useState(!sessionStorage.getItem('introPlayed'));

  useEffect(() => {
    const handleLocationChange = () => {
      setPathname(window.location.pathname);
    };

    // This event is triggered by browser back/forward buttons
    window.addEventListener('popstate', handleLocationChange);
    
    // We need a way to listen for programmatic navigation (history.pushState)
    // Monkey-patch pushState to dispatch a custom event
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      // Create and dispatch a custom event
      window.dispatchEvent(new Event('pushstate'));
    };
    
    // Listen for our custom pushstate event
    window.addEventListener('pushstate', handleLocationChange);

    // Cleanup function to remove event listeners and restore original pushState
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('pushstate', handleLocationChange);
      history.pushState = originalPushState;
    };
  }, []);

  const handleIntroEnd = () => {
    sessionStorage.setItem('introPlayed', 'true');
    setShowIntro(false);
  };

  if (showIntro) {
    return <Intro onIntroEnd={handleIntroEnd} />;
  }

  if (pathname.startsWith('/admin')) {
    return <AdminPage />;
  }
  
  if (pathname.startsWith('/submit')) {
    return <SubmitPage />;
  }
  
  if (pathname.startsWith('/classics')) {
    return <ClassicsPage />;
  }

  if (pathname.startsWith('/merch')) {
    return <MerchPage />;
  }

  if (pathname.startsWith('/publishing-guide')) {
    return <PublishingGuidePage />;
  }

  if (pathname.startsWith('/movie/')) {
    const movieKey = pathname.split('/')[2];
    if (movieKey) {
      return <MoviePage movieKey={movieKey} />;
    }
    // If no movie key, redirect to new home
    window.location.href = '/';
    return null;
  }

  // Default to the App (Browse) Page
  return <App />;
};

root.render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);