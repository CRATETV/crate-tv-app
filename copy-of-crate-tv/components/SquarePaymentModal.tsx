import React, { useEffect, useState, useRef } from 'react';
import { PaymentItem } from '../App.tsx';

declare global {
    interface Window {
        Square: any;
    }
}

interface SquarePaymentModalProps {
    item: PaymentItem;
    onClose: () => void;
    onSuccess: (item: PaymentItem) => void;
}

const SquarePaymentModal: React.FC<SquarePaymentModalProps> = ({ item, onClose, onSuccess }) => {
    const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const cardRef = useRef<any>(null);

    // Load Square SDK and initialize form
    useEffect(() => {
        const initializeSquare = async () => {
            try {
                // Fetch public keys from our secure API endpoint
                const configResponse = await fetch('/api/square-config');
                if (!configResponse.ok) throw new Error('Could not load payment configuration.');
                const { applicationId, locationId } = await configResponse.json();

                if (!applicationId || !locationId) {
                    throw new Error('Payment gateway not configured. Please contact support.');
                }
                
                // Dynamically load the Square script
                if (!document.getElementById('square-sdk')) {
                    const script = document.createElement('script');
                    script.id = 'square-sdk';
                    script.src = "https://web.squarecdn.com/v1/square.js";
                    script.async = true;
                    document.head.appendChild(script);

                    await new Promise((resolve, reject) => {
                        script.onload = resolve;
                        script.onerror = reject;
                    });
                }

                if (!window.Square) {
                    throw new Error('Square SDK failed to load.');
                }
                
                const payments = window.Square.payments(applicationId, locationId);
                cardRef.current = await payments.card();
                await cardRef.current.attach('#card-container');
                
                setStatus('ready');
                
            } catch (error) {
                console.error("Square initialization error:", error);
                setErrorMessage(error instanceof Error ? error.message : "Could not initialize payment form.");
                setStatus('error');
            }
        };
        
        initializeSquare();
        
        // Modal cleanup and escape key handling
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

    const handlePayment = async () => {
        if (status !== 'ready' || !cardRef.current) return;
        
        setStatus('processing');
        setErrorMessage('');

        try {
            const result = await cardRef.current.tokenize();
            if (result.status === 'OK') {
                const token = result.token;
                
                // Send token to our backend for processing
                const response = await fetch('/api/process-square-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sourceId: token,
                        amount: item.price,
                        currency: 'USD',
                        itemName: item.name,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Payment processing failed.');
                }

                onSuccess(item);

            } else {
                throw new Error(result.errors?.[0]?.message || 'Invalid card details.');
            }
        } catch (error) {
            console.error("Payment error:", error);
            setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred.");
            setStatus('ready'); // Allow user to try again
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-700" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Complete Your Purchase</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6">
                    <div className="bg-gray-700/50 p-4 rounded-lg mb-6 text-center">
                        <p className="text-gray-400">You are purchasing:</p>
                        <p className="text-xl font-semibold text-white">{item.name}</p>
                        <p className="text-3xl font-bold text-red-400 mt-2">${item.price.toFixed(2)}</p>
                    </div>

                    <form id="payment-form">
                        <div id="card-container" className="p-3 bg-white rounded-md"></div>
                    </form>

                    {errorMessage && <p className="text-red-500 text-sm mt-4 text-center">{errorMessage}</p>}
                    {status === 'loading' && <p className="text-gray-400 text-sm mt-4 text-center">Initializing secure payment form...</p>}
                    
                    <button
                        onClick={handlePayment}
                        disabled={status !== 'ready'}
                        className="w-full mt-6 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg text-lg flex items-center justify-center transition-colors"
                    >
                        {status === 'processing' ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Processing...
                            </>
                        ) : (
                            `Pay $${item.price.toFixed(2)}`
                        )}
                    </button>
                    <p className="text-xs text-gray-500 mt-4 text-center">
                        Payments are securely processed by Square.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SquarePaymentModal;