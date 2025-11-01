import React, { useEffect } from 'react';

interface DonationSuccessModalProps {
  onClose: () => void;
  movieTitle: string;
  directorName: string;
  amount: number;
  email?: string;
}

const DonationSuccessModal: React.FC<DonationSuccessModalProps> = ({ onClose, movieTitle, directorName, amount, email }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md border border-green-500 text-center" onClick={e => e.stopPropagation()}>
        <div className="p-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Thank You!</h2>
          <p className="text-gray-300 mb-6">
            Your donation of <span className="font-bold text-green-400">{amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span> to support "{movieTitle}" helps us champion independent cinema.
          </p>
          {email && (
            <p className="text-sm text-gray-400 mb-6">A confirmation receipt has been sent to {email}.</p>
          )}
          <button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-md transition-colors text-lg">
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonationSuccessModal;
