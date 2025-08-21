
import React, { useState } from 'react';

const Footer: React.FC = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubscribed(true);
  };

  const links = [
    { name: 'Instagram', href: 'https://www.instagram.com/cratetv.philly?igsh=dXJrYTdlMHVhbXcw' },
    { name: 'More About Us', href: 'https://aboutus.cratetv.net' },
    { name: 'Playhouse West-Philadelphia', href: 'https://www.playhousewest.com/philadelphia' },
    { name: 'Contact Us', href: 'mailto:contact@cratetv.net' },
    { name: 'Got a Film?', href: 'https://www.dropbox.com/request/20cg1HZAjFhj9OatP2Ja', special: true },
  ];

  return (
    <footer className="bg-black/80 text-center p-6 mt-8 border-t border-gray-800">
      <div className="max-w-md mx-auto mb-6">
        <h3 className="text-lg font-bold text-white mb-3">Join Our Mailing List</h3>
        {isSubscribed ? (
          <p className="text-green-400">Thank you for subscribing!</p>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              required
              className="flex-grow py-2 px-4 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="submit"
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-md transition-colors"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>

      <div className="mb-4">
        {links.map((link, index) => (
          <React.Fragment key={link.name}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                text-gray-400 hover:text-white transition
                ${link.special ? 'text-red-500 hover:text-red-400 font-bold' : ''}
              `}
            >
              {link.name}
            </a>
            {index < links.length - 1 && <span className="mx-2 text-gray-600">|</span>}
          </React.Fragment>
        ))}
      </div>
      <p className="text-gray-500 text-sm mb-4">© {new Date().getFullYear()} CRATE TV. All rights reserved.</p>
      <p className="text-blue-300/60 text-xs max-w-2xl mx-auto">
        Crate TV will not consider films selected for the current year's Playhouse West-Philadelphia Film Festival, inclusive of its 40/40 day, until after the festival's closing date.
      </p>
    </footer>
  );
};

export default Footer;
