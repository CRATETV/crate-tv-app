import React, { useState, useEffect } from 'react';

interface CollapsibleFooterProps {
  showPortalNotice?: boolean;
  showActorLinks?: boolean;
}

const CollapsibleFooter: React.FC<CollapsibleFooterProps> = ({ showPortalNotice = false, showActorLinks = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleNavigation = () => {
      // When a navigation event occurs, close the footer.
      setIsOpen(false);
    };

    // Listen for the custom 'pushstate' event used by the app's router, and the native 'popstate' for browser back/forward.
    window.addEventListener('pushstate', handleNavigation);
    window.addEventListener('popstate', handleNavigation);

    // Clean up the listeners when the component unmounts.
    return () => {
      window.removeEventListener('pushstate', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount.

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-30 transition-all duration-500 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-3rem)] md:translate-y-[calc(100%-4rem)]'}`}>
        {/* Toggle Button */}
        <div className="flex justify-center">
             <button 
                onClick={() => setIsOpen(!isOpen)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 w-24 h-12 md:h-16 rounded-t-lg flex items-center justify-center transition-colors"
                aria-label={isOpen ? "Hide footer" : "Show footer"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            </button>
        </div>
        {/* Footer Content */}
        <footer className="bg-black text-gray-400 py-12 px-4 md:px-12 border-t border-gray-800">
            <div className="max-w-7xl mx-auto">
                <div className={`grid grid-cols-2 ${showActorLinks ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-8 mb-8`}>
                <div>
                    <h3 className="font-bold text-white mb-4">Company</h3>
                    <ul className="space-y-2">
                    <li><a href="/about" onClick={(e) => handleNavigate(e, '/about')} className="hover:text-white transition">About Us</a></li>
                    <li><a href="/contact" onClick={(e) => handleNavigate(e, '/contact')} className="hover:text-white transition">Contact</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-white mb-4">Filmmakers</h3>
                    <ul className="space-y-2">
                        <li><a href="/submit" onClick={(e) => handleNavigate(e, '/submit')} className="hover:text-white transition">Submit a Film</a></li>
                        <li><a href="/filmmaker-dashboard" onClick={(e) => handleNavigate(e, '/filmmaker-dashboard')} className="hover:text-white transition">Filmmaker Dashboard</a></li>
                        <li><a href="/filmmaker-signup" onClick={(e) => handleNavigate(e, '/filmmaker-signup')} className="hover:text-white transition">Dashboard Signup</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-white mb-4">Affiliates</h3>
                    <ul className="space-y-2">
                        <li><a href="https://playhousewest.com/philly/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Playhouse West Philadelphia</a></li>
                        <li><a href="https://www.48hourfilm.com/philadelphia" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Philadelphia 48 Hour Film Project</a></li>
                    </ul>
                </div>
                {showActorLinks && (
                    <div>
                    <h3 className="font-bold text-white mb-4">Actors</h3>
                    <ul className="space-y-2">
                        <li><a href="/actor-portal" onClick={(e) => handleNavigate(e, '/actor-portal')} className="hover:text-white transition">Actor Portal</a></li>
                        <li><a href="/actor-signup" onClick={(e) => handleNavigate(e, '/actor-signup')} className="hover:text-white transition">Actor Portal Signup</a></li>
                    </ul>
                    </div>
                )}
                </div>
                
                {showPortalNotice && (
                <div className="border-t border-gray-800 pt-8 mt-8 text-center text-sm text-yellow-400 bg-yellow-900/30 p-4 rounded-lg">
                    <p><strong>Festival Submission Notice:</strong> Please note that we will not accept films created for any of Playhouse West-Philadelphia's film festivals until after the festival has concluded. Thank you for your understanding.</p>
                </div>
                )}

                <div className="border-t border-gray-800 pt-8 text-center text-sm mt-8">
                <p>&copy; {new Date().getFullYear()} Crate TV. All Rights Reserved.</p>
                </div>
            </div>
        </footer>
    </div>
  );
};

export default CollapsibleFooter;