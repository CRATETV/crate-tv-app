import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import AdminPage from './AdminPage.tsx';
import MoviePage from './components/MoviePage.tsx';

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

  if (pathname.startsWith('/movie/')) {
    const movieKey = pathname.split('/')[2];
    if (movieKey) {
      return <MoviePage movieKey={movieKey} />;
    }
    // If no movie key, redirect to home
    window.location.href = '/';
    return null;
  }

  return <App />;
};

root.render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
