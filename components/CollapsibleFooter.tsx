

import React, { useState, useEffect } from 'react';

interface CollapsibleFooterProps {
  showPortalNotice?: boolean;
  showActorLinks?: boolean;
}

const CollapsibleFooter: React.FC<CollapsibleFooterProps> = ({ showPortalNotice = false, showActorLinks = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleNavigation = () => {
      setIsOpen(false);
    };

    const handleScroll = () => {
      setIsScrolled(window.pageYOffset > 200);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pushstate', handleNavigation);
    window.addEventListener('popstate', handleNavigation);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pushstate', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-30 transition-all duration-500 ease-in-out hidden md:block ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-2.5rem)]'}`}>
        {/* Toggle Button */}
        <div className={`flex justify-center transition-opacity duration-300 ${isScrolled || isOpen ? 'opacity-100' : 'opacity-0'}`}>
             <button 
                onClick={() => setIsOpen(!isOpen)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 w-20 h-10 rounded-t-lg flex items-center justify-center transition-colors"
                aria-label={isOpen ? "Hide footer" : "Show footer"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            </button>
        </div>
        {/* Footer Content */}
        <footer className="bg-black text-gray-400 py-12 px-4 md:px-12 border-t border-gray-800">
            <div className="max-w-7xl mx-auto">
                <div className={`grid grid-cols-2 md:grid-cols-3 gap-8 mb-8`}>
                <div>
                    <h3 className="font-bold text-white mb-4">Company</h3>
                    <ul className="space-y-2">
                    <li><a href="/about" onClick={(e) => handleNavigate(e, '/about')} className="hover:text-white transition">About Us</a></li>
                    <li><a href="/contact" onClick={(e) => handleNavigate(e, '/contact')} className="hover:text-white transition">Contact</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-white mb-4">Creators</h3>
                    <ul className="space-y-2">
                        <li><a href="/submit" onClick={(e) => handleNavigate(e, '/submit')} className="hover:text-white transition">Submit a Film</a></li>
                        <li><a href="/portal" onClick={(e) => handleNavigate(e, '/portal')} className="hover:text-white transition">Creator Portals</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-white mb-4">Affiliates</h3>
                    <ul className="space-y-2">
                        <li><a href="https://playhousewest.com/philly/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Playhouse West Philadelphia</a></li>
                        <li><a href="https://www.48hourfilm.com/philadelphia" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Philadelphia 48 Hour Film Project</a></li>
                    </ul>
                </div>
                {/* Actor links section removed as requested */}
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