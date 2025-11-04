import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Intro from './components/Intro';
import { AuthProvider } from './contexts/AuthContext';
// Assuming a global CSS file exists for tailwind or other base styles
// import './index.css';

const Main = () => {
  // By default, show the intro. A real app might use sessionStorage to skip it on refresh.
  const [showIntro, setShowIntro] = useState(true);

  const handleIntroEnd = () => {
    setShowIntro(false);
  };

  // The main app is wrapped in StrictMode for development checks and AuthProvider for authentication context.
  return (
    <React.StrictMode>
      <AuthProvider>
        {showIntro ? <Intro onIntroEnd={handleIntroEnd} /> : <App />}
      </AuthProvider>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Main />);
