import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { FestivalProvider } from './contexts/FestivalContext.tsx';

const rootElement = document.getElementById('root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <AuthProvider>
          <FestivalProvider>
            <App />
          </FestivalProvider>
        </AuthProvider>
      </React.StrictMode>
    );
}
