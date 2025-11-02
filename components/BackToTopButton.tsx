import React, { useState, useEffect } from 'react';

const BackToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    // Show the button if the user is scrolled more than 80% of the page height
    const scrolled = window.scrollY;
    const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (pageHeight > 0 && (scrolled / pageHeight) > 0.8) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-50 hidden md:block">
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="bg-red-500/80 hover:bg-red-600 text-white font-bold rounded-full p-2.5 shadow-lg transition-opacity duration-300"
          aria-label="Go to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default BackToTopButton;