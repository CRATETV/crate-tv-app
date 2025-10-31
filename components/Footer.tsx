import React from 'react';

const Footer: React.FC = () => {
  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  };

  return (
    <footer className="bg-black text-gray-400 py-12 px-4 md:px-12 mt-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
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
              <li><a href="/filmmaker-portal" onClick={(e) => handleNavigate(e, '/filmmaker-portal')} className="hover:text-white transition">Filmmaker Portal</a></li>
            </ul>
          </div>
           <div>
            <h3 className="font-bold text-white mb-4">Actors</h3>
            <ul className="space-y-2">
              <li><a href="/actors" onClick={(e) => handleNavigate(e, '/actors')} className="hover:text-white transition">Actors Directory</a></li>
              <li><a href="/actor-portal" onClick={(e) => handleNavigate(e, '/actor-portal')} className="hover:text-white transition">Actor Portal</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4">Platforms</h3>
            <ul className="space-y-2">
              <li><a href="/roku-guide" onClick={(e) => handleNavigate(e, '/roku-guide')} className="hover:text-white transition">Get on Roku</a></li>
               <li><a href="/merch" onClick={(e) => handleNavigate(e, '/merch')} className="hover:text-white transition">Merch Store</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Crate TV. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;