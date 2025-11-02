import React, { useEffect } from 'react';

interface PayoutExplanationModalProps {
  onClose: () => void;
}

const InfoCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <div className="text-gray-300 space-y-2">{children}</div>
    </div>
);

const PayoutExplanationModal: React.FC<PayoutExplanationModalProps> = ({ onClose }) => {
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl border border-purple-800" onClick={e => e.stopPropagation()}>
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-3xl font-bold text-white">How You Get Paid! 💸</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
          </div>
          
          <p className="text-gray-400 mb-8">Ready to see how your masterpiece turns into money? It’s simple! Here are the two ways you earn on Crate TV:</p>

          <div className="space-y-6">
            <InfoCard title="Viewer Love ❤️ (Donations)">
              <p>When a fan loves your film, they can send you a tip directly!</p>
              <p>You get a big slice of that pie: <strong className="text-green-400">70%</strong> of every donation comes straight to you. The other 30% helps us keep the lights on and process the payment.</p>
              <p className="text-sm text-gray-500 italic">Example: On a $10.00 tip, you pocket a cool $7.00!</p>
            </InfoCard>

            <InfoCard title="Ad Magic ✨ (Views)">
              <p>Your film also earns money from the short ads that play before it. We share the ad revenue with you, <strong className="text-blue-400">50/50</strong>! It's based on a simple idea: for every 1,000 views, your film generates about <strong className="text-blue-400">$5.00</strong> in ad money.</p>
              <p className="text-sm text-gray-500 italic">Example: If your film hits 10,000 views, that's about $50.00 in ad revenue. Your share? $25.00!</p>
            </InfoCard>
          </div>

          <div className="mt-8 text-center">
            <button onClick={onClose} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-md">
                Sounds Good!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayoutExplanationModal;