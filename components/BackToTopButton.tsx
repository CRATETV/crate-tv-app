
import React, { useState, useEffect } from 'react';

interface BackToTopButtonProps {
  isBannerVisible?: boolean;
}

const BackToTopButton: React.FC<BackToTopButtonProps> = ({ isBannerVisible = false }) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
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

  const bottomClass = isBannerVisible ? 'bottom-24' : 'bottom-5';

  return (
    <div className={`fixed right-5 z-50 ${bottomClass} transition-all duration-300`}>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="bg-red-500/80 hover:bg-red-600 text-white font-bold rounded-full p-3 shadow-lg transition-opacity duration-300"
          aria-label="Go to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default BackToTopButton;