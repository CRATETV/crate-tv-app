import React, { useState, useEffect } from 'react';
import InstallInstructionsModal from './InstallInstructionsModal';

const Footer: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);

  useEffect(() => {
    // Check if the app is running in standalone mode (i.e., installed)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    setIsPWAInstalled(mediaQuery.matches);
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA installation');
        } else {
          console.log('User dismissed the PWA installation');
        }
        setInstallPrompt(null);
      });
    } else {
      // If no prompt is available, show manual instructions
      setShowInstallInstructions(true);
    }
  };

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  };

  return (
    <>
      <footer className="bg-black text-gray-400 p-8 md:p-12 mt-16 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <ul className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-8 gap-y-4 text-sm">
                <li>
                  <a href="/about" onClick={(e) => handleNavigate(e, '/about')} className="hover:text-white transition">About Us</a>
                </li>
                <li>
                  <a href="/submit" onClick={(e) => handleNavigate(e, '/submit')} className="hover:text-white transition">Submit Film</a>
                </li>
                 <li>
                  <a href="/actor-signup" onClick={(e) => handleNavigate(e, '/actor-signup')} className="hover:text-white transition">Actor Portal</a>
                </li>
                <li>
                  <a href="/contact" onClick={(e) => handleNavigate(e, '/contact')} className="hover:text-white transition">Contact</a>
                </li>
                <li>
                  <a href="https://www.playhousewest.com/philadelphia" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Playhouse West-Philly</a>
                </li>
              </ul>
               <div className="flex items-center gap-4">
                  {!isPWAInstalled && (
                    <button
                      onClick={handleInstallClick}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 sm:px-4 rounded-md text-sm transition-colors flex items-center gap-2"
                      aria-label="Install the Crate TV App"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="hidden sm:inline">Install App</span>
                        <span className="sm:hidden">Install</span>
                    </button>
                  )}
                  <a href="https://www.instagram.com/cratetv.philly?igsh=dXJrYTdlMHVhbXcw" target="_blank" rel="noopener noreferrer" className="hover:text-white transition" aria-label="Instagram">
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.024.06 1.378.06 3.808s-.012 2.784-.06 3.808c-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.024.048-1.378.06-3.808.06s-2.784-.012-3.808-.06c-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.024-.06-1.378-.06-3.808s.012-2.784.06-3.808c.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.345 2.525c.636-.247 1.363-.416 2.427-.465C9.793 2.013 10.147 2 12.315 2zm-1.161 1.043c-1.049.048-1.684.21-2.203.414a3.896 3.896 0 00-1.396.932 3.896 3.896 0 00-.932 1.396c-.204.519-.366 1.154-.414 2.203-.048 1.02-.06 1.358-.06 3.63s.012 2.61.06 3.63c.048 1.049.21 1.684.414 2.203a3.896 3.896 0 00.932 1.396 3.896 3.896 0 001.396.932c.519.204 1.154.366 2.203.414 1.02.048 1.358.06 3.63.06s2.61-.012 3.63-.06c1.049-.048 1.684.21 2.203-.414a3.896 3.896 0 001.396-.932 3.896 3.896 0 00.932-1.396c.204-.519.366-1.154.414-2.203.048-1.02.06-1.358.06-3.63s-.012-2.61-.06-3.63c-.048-1.049-.21-1.684-.414-2.203a3.896 3.896 0 00-.932-1.396 3.896 3.896 0 00-1.396-.932c-.519-.204-1.154-.366-2.203-.414-1.02-.048-1.358-.06-3.63-.06s-2.61.012-3.63.06zM12 6.865a5.135 5.135 0 100 10.27 5.135 5.135 0 000-10.27zm0 8.468a3.333 3.333 0 110-6.666 3.333 3.333 0 010 6.666zm5.338-9.87a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" clipRule="evenodd" />
                      </svg>
                  </a>
               </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-xs">
            <p>&copy; {new Date().getFullYear()} Crate TV. All Rights Reserved.</p>
            <div className="max-w-3xl mx-auto bg-blue-900/20 border border-blue-800 text-blue-300 mt-6 rounded-lg p-3">
              Crate TV will not consider films selected for the current year's Playhouse West-Philadelphia Film Festival, inclusive of its 40/40 day, until after the festival's closing date.
            </div>
          </div>
        </div>
      </footer>
      {showInstallInstructions && <InstallInstructionsModal onClose={() => setShowInstallInstructions(false)} />}
    </>
  );
};

export default Footer;