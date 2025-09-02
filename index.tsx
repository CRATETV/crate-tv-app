import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import AdminPage from './AdminPage.tsx';
import MoviePage from './components/MoviePage.tsx';
import SubmitPage from './components/SubmitPage.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const AppRouter: React.FC = () => {
  const { pathname } = window.location;

  if (pathname.startsWith('/admin')) {
    return <AdminPage />;
  }
  
  if (pathname.startsWith('/submit')) {
    return <SubmitPage />;
  }

  if (pathname.startsWith('/movie/')) {
    const movieKey = pathname.split('/')[2];
    if (movieKey) {
      return <MoviePage movieKey={movieKey} />;
    }
    // If no movie key, redirect to home
    window.location.href = '/';
    return null;
  }

  // Default to the main app
  return <App />;
};

root.render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);