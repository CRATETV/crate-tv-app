import React from 'react';

interface FooterProps {
  showPortalNotice?: boolean;
  showActorLinks?: boolean;
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ showPortalNotice = false, showActorLinks = false, className = '' }) => {
  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  };

  return (
    <footer className={`bg-black text-gray-400 py-12 px-4 md:px-12 mt-12 ${className}`}>
      <div className="max-w-7xl mx-auto">
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
              <li><a href="/submit" onClick={(e) => handleNavigate(e, '/submit')} className="hover:text-white transition">Submit a Film</a></li>
              <li><a href="/portal" onClick={(e) => handleNavigate(e, '/portal')} className="hover:text-white transition">Creator Portals</a></li>
            </ul>
          </div>
          {showActorLinks && (
            <div>
              <h3 className="font-bold text-white mb-4">Actors</h3>
              <ul className="space-y-2">
                <li><a href="/actors-directory" onClick={(e) => handleNavigate(e, '/actors-directory')} className="hover:text-white transition">Actor Directory</a></li>
                <li><a href="/actor-signup" onClick={(e) => handleNavigate(e, '/actor-signup')} className="hover:text-white transition">Join Directory</a></li>
              </ul>
            </div>
          )}
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
  );
};

export default Footer;