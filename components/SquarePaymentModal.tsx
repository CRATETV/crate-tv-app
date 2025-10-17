import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Movie } from '../types';

declare const Square: any; // Allow use of Square global from the SDK script

interface SquarePaymentModalProps {
    movie?: Movie;
    paymentType: 'donation' | 'subscription' | 'pass' | 'block';
    onClose: () => void;
    onPaymentSuccess: (details: any) => void;
}

const SquarePaymentModal: React.FC<SquarePaymentModalProps> = ({ movie, paymentType, onClose, onPaymentSuccess }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'processing' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const cardRef = useRef<any>(null);

    const paymentDetails = useMemo(() => {
        switch (paymentType) {
            case 'subscription':
                return { title: "Premium Subscription", description: "Unlock exclusive access to our entire library.", amount: '4.99', isCustomAmount: false };
            case 'pass':
                return { title: "All-Access Festival Pass", description: "Enjoy all film blocks for the entire festival.", amount: '50.00', isCustomAmount: false };
            case 'block':
                return { title: "Film Block Access", description: "Unlock this specific block of films to watch.", amount: '10.00', isCustomAmount: false };
            case 'donation':
            default:
                return { title: `Support "${movie?.title}"`, description: "Your contribution directly supports the filmmakers.", amount: '10.00', isCustomAmount: true };
        }
    }, [paymentType, movie]);
    
    const [amount, setAmount] = useState(paymentDetails.amount);

    useEffect(() => {
        const initSquare = async () => {
            try {
                const configResp = await fetch('/api/square-config');
                if (!configResp.ok) throw new Error('Could not load Square configuration.');
                const { applicationId } = await configResp.json();

                if (!applicationId) throw new Error('Square Application ID is missing.');

                const payments = Square.payments(applicationId);
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

    const handlePayment = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!cardRef.current) return;
        setStatus('processing');
        setErrorMessage('');

        try {
            const result = await cardRef.current.tokenize();
            if (result.status === 'OK') {
                const token = result.token;
                const response = await fetch('/api/process-square-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sourceId: token,
                        amount: parseFloat(amount),
                        movieTitle: movie?.title,
                        directorName: movie?.director,
                        paymentType: paymentType,
                    }),
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Payment failed.');
                
                setStatus('success');
                onPaymentSuccess(data);
                setTimeout(onClose, 2000);
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
                    <p className="text-gray-300">Your transaction was successful.</p>
                </div>
            );
        }

        return (
            <form onSubmit={handlePayment}>
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


                <div id="card-container" className="mb-6"></div>

                <button type="submit" className="submit-btn w-full" disabled={status !== 'idle'}>
                    {status === 'processing' ? 'Processing...' : (paymentDetails.isCustomAmount ? `Contribute $${amount}` : `Pay $${paymentDetails.amount}`)}
                </button>
                {status === 'error' && <p className="text-red-500 text-sm mt-4 text-center">{errorMessage}</p>}
                {status === 'loading' && <p className="text-yellow-500 text-sm mt-4 text-center">Initializing payment form...</p>}
            </form>
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