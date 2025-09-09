import React, { useEffect, useState } from 'react';

// Define the structure for an item being purchased
interface PaymentItem {
  type: 'pass' | 'block' | 'film';
  id: string;
  name: string;
  price: number;
}

interface StripePaymentModalProps {
    item: PaymentItem;
    onClose: () => void;
    onSuccess: (item: PaymentItem) => void;
}

const StripePaymentModal: React.FC<StripePaymentModalProps> = ({ item, onClose, onSuccess }) => {
    const [isProcessing, setIsProcessing] = useState(false);

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

    const handlePayment = () => {
        setIsProcessing(true);
        // Simulate an API call to the backend
        setTimeout(() => {
            // In a real app, you would get a success confirmation from your server here.
            onSuccess(item);
            setIsProcessing(false);
        }, 1500); // 1.5 second delay to simulate processing
    };

    const inputClasses = "w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors";

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-700" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Complete Your Purchase</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    <div className="bg-gray-700/50 p-4 rounded-lg mb-6 text-center">
                        <p className="text-gray-400">You are purchasing:</p>
                        <p className="text-xl font-semibold text-white">{item.name}</p>
                        <p className="text-3xl font-bold text-green-400 mt-2">${item.price.toFixed(2)}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                            <input type="email" id="email" className={inputClasses} placeholder="you@example.com" disabled />
                        </div>
                        <div>
                            <label htmlFor="card" className="block text-sm font-medium text-gray-300 mb-1">Card Information</label>
                            <div className="p-3 bg-gray-700 border border-gray-600 rounded-md text-gray-500">
                                Mock Card Details
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 text-xs text-gray-500 text-center">
                        This is a mock payment screen. No real transaction will be made.
                        In a real application, this form would be powered by the Stripe Payments SDK.
                    </div>

                    <button
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg text-lg flex items-center justify-center transition-colors"
                    >
                        {isProcessing ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </>
                        ) : (
                            `Pay $${item.price.toFixed(2)} with Stripe`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StripePaymentModal;