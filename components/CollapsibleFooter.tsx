import React, { useState, useEffect } from 'react';

interface CollapsibleFooterProps {
  showPortalNotice?: boolean;
  showActorLinks?: boolean;
}

const CollapsibleFooter: React.FC<CollapsibleFooterProps> = ({ showPortalNotice = false, showActorLinks = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);

  useEffect(() => {
    const handleNavigation = () => {
      setIsOpen(false);
    };

    const handleScroll = () => {
      const isCloseToBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 150;
      setIsNearBottom(isCloseToBottom);
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

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, path: string) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
    window.scrollTo(0, 0);
  };

  const emailHref = "mailto:cratetiv@gmail.com?subject=Film%20Submission%20Consideration&body=Hello%20Crate%20TV%20Team,%0A%0AI%20would%20like%20to%20submit%20my%20film%20for%20consideration.%0A%0AFilm%20Title:%20%0ADirector:%20%0ALink%20to%20Screener:%20";

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-30 transition-all duration-500 ease-in-out hidden md:block ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-2.5rem)]'}`}>
        {/* Toggle Button */}
        <div className={`flex justify-center transition-opacity duration-300 ${isNearBottom || isOpen ? 'opacity-100' : 'opacity-0'}`}>
             <button 
                onClick={() => setIsOpen(!isOpen)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 w-20 h-10 rounded-t-lg flex items-center justify-center transition-colors"
                aria-label={isOpen ? "Hide footer" : "Show footer"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            </button>
        </div>
        {/* Footer Content */}
        <footer className="bg-black text-gray-400 py-12 px-4 md:px-12 border-t border-gray-800 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            <div className="max-w-7xl mx-auto">
                
                {/* Filmmaker CTA Section */}
                <div className="mb-16 pb-16 border-b border-white/5 flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <h3 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tighter uppercase">
                            Ready to start your <span className="text-red-600">next chapter?</span>
                        </h3>
                        <p className="text-xl text-gray-300 max-w-2xl font-medium leading-relaxed">
                            Crate TV is looking for the bold, the unique, and the visionary. Submit via <strong className="text-white">FilmFreeway</strong> for the festival, or <strong className="text-white">Email us</strong> to join our year-round catalog.
                        </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col sm:flex-row gap-4">
                        <button 
                            onClick={(e) => handleNavigate(e, '/submit')}
                            className="inline-flex items-center justify-center bg-white text-black font-black px-10 py-4 rounded-xl hover:bg-gray-200 transition-all transform hover:scale-105 active:scale-95 shadow-xl text-base uppercase tracking-widest"
                        >
                            Visit Filmmaker Hub
                        </button>
                        <a 
                            href={emailHref}
                            className="inline-flex items-center justify-center bg-gray-800 text-white font-black px-10 py-4 rounded-xl hover:bg-gray-700 transition-all border border-white/10 text-base uppercase tracking-widest"
                        >
                            Email us Directly
                        </a>
                    </div>
                </div>

                <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 mb-8`}>
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
                        <li><a href="/submit" onClick={(e) => handleNavigate(e, '/submit')} className="hover:text-white transition">For Filmmakers</a></li>
                        <li><a href="/submission-terms" onClick={(e) => handleNavigate(e, '/submission-terms')} className="hover:text-white transition">Submission Terms</a></li>
                        <li><a href="/portal" onClick={(e) => handleNavigate(e, '/portal')} className="hover:text-white transition">Creator Portals</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-white mb-4">For Industry</h3>
                    <ul className="space-y-2">
                        <li><a href="/talent" onClick={(e) => handleNavigate(e, '/talent')} className="hover:text-white transition">For Talent Agents</a></li>
                        <li><a href="/actors-directory" onClick={(e) => handleNavigate(e, '/actors-directory')} className="hover:text-white transition">Actors Directory</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-white mb-4">Affiliates</h3>
                    <ul className="space-y-2">
                        <li><a href="https://playhousewest.com/philly/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Playhouse West Philadelphia</a></li>
                        <li><a href="https://www.48hourfilm.com/philadelphia" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Philadelphia 48 Hour Film Project</a></li>
                    </ul>
                </div>
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