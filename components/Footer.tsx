import React from 'react';

const Footer: React.FC = () => {
  const allLinks = [
    { name: 'More About Us', href: 'https://aboutus.cratetv.net' },
    { name: 'Contact Us', href: 'mailto:contact@cratetv.net' },
    { name: 'Instagram', href: 'https://www.instagram.com/cratetv.philly?igsh=dXJrYTdlMHVhbXcw' },
    { name: 'Playhouse West-Philly', href: 'https://www.playhousewest.com/philadelphia' },
    { name: 'Got a Film?', href: 'https://www.dropbox.com/request/20cg1HZAjFhj9OatP2Ja', special: true },
  ];

  return (
    <footer className="bg-[#141414] text-gray-400 p-8 md:p-12 mt-8 border-t border-gray-800">
      <div className="max-w-5xl mx-auto">
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-sm text-center sm:text-left">
          {allLinks.map(link => (
            <li key={link.name}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`hover:text-white transition ${link.special ? 'text-red-500 hover:text-red-400 font-bold' : ''}`}
              >
                {link.name}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center">
          <div className="max-w-3xl mx-auto bg-blue-900/20 border border-blue-800 text-blue-300 text-sm rounded-lg p-3">
            Crate TV will not consider films selected for the current year's Playhouse West-Philadelphia Film Festival, inclusive of its 40/40 day, until after the festival's closing date.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;