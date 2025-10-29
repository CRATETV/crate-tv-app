import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Movie, FilmBlock } from '../types';

declare const Square: any; // Allow use of Square global from the SDK script

interface SquarePaymentModalProps {
    movie?: Movie;
    block?: FilmBlock;
    paymentType: 'donation' | 'subscription' | 'pass' | 'block' | 'film';
    onClose: () => void;
    onPaymentSuccess: (details: { paymentType: 'pass' | 'block' | 'subscription' | 'donation' | 'film', itemId?: string }) => void;
}

const SquarePaymentModal: React.FC<SquarePaymentModalProps> = ({ movie, block, paymentType, onClose, onPaymentSuccess }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'processing' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [isApplePaySupported, setIsApplePaySupported] = useState(false);
    const cardRef = useRef<any>(null);
    const applePayRef = useRef<any>(null);

    const paymentDetails = useMemo(() => {
        switch (paymentType) {
            case 'subscription':
                return { title: "Premium Subscription", description: "Unlock exclusive access to our entire library.", amount: '4.99', isCustomAmount: false, itemId: 'subscription_monthly' };
            case 'pass':
                return { title: "All-Access Festival Pass", description: "Enjoy all film blocks for the entire festival.", amount: '50.00', isCustomAmount: false, itemId: 'all_access_pass' };
            case 'block':
                return { title: `Unlock Block: "${block?.title}"`, description: "Watch all films in this specific block.", amount: '10.00', isCustomAmount: false, itemId: block?.id };
            case 'film':
                 return { title: `Unlock Film: "${movie?.title}"`, description: "Get permanent access to watch this festival film.", amount: '5.00', isCustomAmount: false, itemId: movie?.key };
            case 'donation':
            default:
                return { title: `Support "${movie?.title}"`, description: "Your contribution directly supports the filmmakers.", amount: '10.00', isCustomAmount: true, itemId: movie?.key };
        }
    }, [paymentType, movie, block]);
    
    const [amount, setAmount] = useState(paymentDetails.amount);

    useEffect(() => {
        const initSquare = async () => {
            try {
                const configResp = await fetch('/api/square-config');
                if (!configResp.ok) throw new Error('Could not load Square configuration.');
                const { applicationId, locationId } = await configResp.json();

                if (!applicationId || !locationId) throw new Error('Square Application ID or Location ID is missing.');

                const payments = Square.payments(applicationId, locationId);
                
                // Initialize Apple Pay and check for support
                try {
                    const applePay = await payments.applePay();
                    applePayRef.current = applePay;
                    setIsApplePaySupported(true);
                    console.log("Apple Pay is supported on this device.");
                } catch (e) {
                    setIsApplePaySupported(false);
                    console.log("Apple Pay is not supported on this device.");
                }

                // Initialize Card payment form
                const card = await payments.card();
                await card.attach('#card-container');
                cardRef.current = card;
                setStatus('idle');
            } catch (error) {
                console.error(error);
                setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize payment form.');
                setStatus('error');
            }
        };

        if (typeof Square !== 'undefined') {
            initSquare();
        } else {
            setErrorMessage('Square Payments SDK could not be loaded.');
            setStatus('error');
        }
    }, []);

    const processToken = async (token: string) => {
        const response = await fetch('/api/process-square-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sourceId: token,
                amount: parseFloat(amount),
                movieTitle: movie?.title,
                directorName: movie?.director,
                paymentType: paymentType,
                itemId: paymentDetails.itemId,
                blockTitle: block?.title,
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Payment failed.');
        
        setStatus('success');
        onPaymentSuccess({ paymentType, itemId: paymentDetails.itemId });
        setTimeout(onClose, 2000);
    };

    const handleApplePay = async () => {
        if (!applePayRef.current) return;
        setStatus('processing');
        setErrorMessage('');

        try {
            const paymentRequest = {
                countryCode: 'US',
                currencyCode: 'USD',
                total: {
                    label: 'Crate TV',
                    amount: amount,
                },
            };
            const result = await applePayRef.current.tokenize(paymentRequest);
            if (result.status === 'OK') {
                await processToken(result.token);
            } else {
                 throw new Error(result.errors?.[0]?.message || 'Apple Pay tokenization failed.');
            }
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            // Don't show an error if the user just cancels the Apple Pay sheet
            if (message !== 'The user cancelled the payment authorization.') {
                setErrorMessage(message);
                setStatus('error');
            } else {
                setStatus('idle');
            }
        }
    };
    
    const handleCardPayment = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!cardRef.current) return;
        setStatus('processing');
        setErrorMessage('');

        try {
            const result = await cardRef.current.tokenize();
            if (result.status === 'OK') {
                await processToken(result.token);
            } else {
                throw new Error(result.errors?.[0]?.message || 'Invalid card details.');
            }
        } catch (error) {
            console.error(error);
            setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
            setStatus('error');
        }
    };

    const renderContent = () => {
        if (status === 'success') {
            return (
                <div className="text-center p-8">
                    <h2 className="text-3xl font-bold text-green-400 mb-4">Thank You!</h2>
                    <p className="text-gray-300">Your transaction was successful. Content unlocked!</p>
                </div>
            );
        }

        return (
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">{paymentDetails.title}</h2>
                <p className="text-sm text-gray-400 mb-6">{paymentDetails.description}</p>
                
                {paymentDetails.isCustomAmount ? (
                    <>
                        <div className="mb-4">
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-2">Amount (USD)</label>
                            <div className="flex items-center bg-gray-700 border border-gray-600 rounded-md">
                                <span className="text-gray-400 pl-3">$</span>
                                <input
                                    type="number"
                                    id="amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="1"
                                    step="0.01"
                                    className="form-input bg-transparent border-0 focus:ring-0 w-full"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex justify-around mb-6">
                            {['5', '10', '20', '50'].map(val => (
                                <button type="button" key={val} onClick={() => setAmount(val + '.00')} className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-4 rounded-md transition-colors text-sm">${val}</button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center mb-6 bg-gray-900/50 p-4 rounded-lg">
                        <p className="text-gray-400">Price</p>
                        <p className="text-4xl font-bold text-white">${paymentDetails.amount}</p>
                    </div>
                )}
                
                {isApplePaySupported && (
                    <>
                        <button 
                            type="button" 
                            id="apple-pay-button"
                            onClick={handleApplePay}
                            disabled={status !== 'idle'}
                            className="w-full h-12 bg-black hover:bg-gray-900 text-white font-semibold rounded-md flex items-center justify-center transition-colors mb-4"
                            // FIX: Cast the style object to React.CSSProperties to allow non-standard CSS properties for the Apple Pay button, resolving a TypeScript error.
                            style={{
                                WebkitAppearance: '-apple-pay-button',
                                applePayButtonType: 'plain',
                                applePayButtonStyle: 'black',
                            } as React.CSSProperties}
                        >
                            {/* SVG fallback for non-Safari browsers - will be hidden by CSS */}
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-auto" fill="currentColor" viewBox="0 0 16 16"><path d="M11.125 4.336c0 1.25-.97 2.13-2.38 2.13-1.52 0-2.43-.93-3.83-1.02-.9-.05-1.84.44-2.43 1.25-.78 1.05-.18 3.12 1.13 4.25.75.64 1.6 1.02 2.63 1.02 1.35 0 2.01-.69 3.53-.69 1.48 0 2.1.69 3.48.69.97 0 1.76-.38 2.45-1.02.57-.52 1.1-1.33 1.23-2.12a2.3 2.3 0 0 1-2.13-2.26c0-1.29.93-2.22 2.3-2.3-.1-.4-.4-.83-.78-1.22-.73-.78-1.7-1.22-2.78-1.25-1.58-.03-3.13.9-4.08.9zM9.074 1.14c.14-.85-.53-1.5-1.42-1.56a1.2 1.2 0 0 0-1.23.85c-.88.13-1.8.78-2.33 1.58-.6.93-.9 2.1.1 3.25.83.93 2.03.93 2.68.93.85 0 1.8-.74 2.88-.68.2.01.43.04.65.07.03-.2.05-.4.07-.63zm-2.58 8.44c.83 0 1.55.57 2.05 1.38.48.78.63 1.83.1 2.92-.8.15-1.63-.52-2.12-1.28-.5-.8-.7-1.92-.03-3.02z"/></svg>
                        </button>
                        <div className="flex items-center my-4">
                            <hr className="flex-grow border-t border-gray-600" />
                            <span className="px-2 text-xs text-gray-500">OR</span>
                            <hr className="flex-grow border-t border-gray-600" />
                        </div>
                    </>
                )}

                <form onSubmit={handleCardPayment}>
                    <div id="card-container" className="mb-6"></div>
                    <button type="submit" className="submit-btn w-full" disabled={status !== 'idle'}>
                        {status === 'processing' ? 'Processing...' : (paymentDetails.isCustomAmount ? `Contribute $${amount}` : `Pay $${paymentDetails.amount}`)}
                    </button>
                </form>

                {status === 'error' && <p className="text-red-500 text-sm mt-4 text-center">{errorMessage}</p>}
                {status === 'loading' && <p className="text-yellow-500 text-sm mt-4 text-center">Initializing payment form...</p>}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-gray-800/80 border border-gray-700 rounded-lg shadow-xl w-full max-w-md relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div className="p-8">{renderContent()}</div>
            </div>
        </div>
    );
};

export default SquarePaymentModal;