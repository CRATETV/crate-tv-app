import React from 'react';

const Footer: React.FC = () => {
  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    // Construct a URL within the current origin to avoid cross-origin errors in sandboxed environments.
    const newUrl = new URL(path, window.location.href);
    window.history.pushState({}, '', newUrl.pathname + newUrl.search + newUrl.hash);
    window.dispatchEvent(new Event('pushstate'));
  };

  return (
    <footer className="bg-[#141414] text-gray-400 p-8 md:p-12 mt-8 border-t border-gray-800">
      <div className="max-w-5xl mx-auto">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-8 gap-y-4 text-sm">
          <li>
            <a href="mailto:cratetiv@gmail.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Contact Us</a>
          </li>
          <li>
            <a href="https://www.instagram.com/cratetv.philly?igsh=dXJrYTdlMHVhbXcw" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Instagram</a>
          </li>
          <li>
            <a href="https://www.playhousewest.com/philadelphia" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Playhouse West-Philly</a>
          </li>
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