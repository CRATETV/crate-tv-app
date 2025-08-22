import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import AdminPage from './AdminPage.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const AppRouter: React.FC = () => {
  if (window.location.pathname.startsWith('/admin')) {
    return <AdminPage />;
  }
  return <App />;
};

root.render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
