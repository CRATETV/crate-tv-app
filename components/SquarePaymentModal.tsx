import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Movie, FilmBlock } from '../types';
import { useAuth } from '../contexts/AuthContext';

declare const Square: any; // Allow use of Square global from the SDK script

interface SquarePaymentModalProps {
    movie?: Movie;
    block?: FilmBlock;
    paymentType: 'donation' | 'subscription' | 'pass' | 'block' | 'movie' | 'billSavingsDeposit';
    onClose: () => void;
    onPaymentSuccess: (details: { paymentType: SquarePaymentModalProps['paymentType'], itemId?: string, amount: number, email?: string }) => void;
}

const SquarePaymentModal: React.FC<SquarePaymentModalProps> = ({ movie, block, paymentType, onClose, onPaymentSuccess }) => {
    const { user } = useAuth();
    const [status, setStatus] = useState<'idle' | 'loading' | 'processing' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [customAmount, setCustomAmount] = useState('10.00'); // Default for donations/deposits
    const [email, setEmail] = useState(user?.email || '');

    const cardRef = useRef<HTMLDivElement>(null);
    const cardInstance = useRef<any>(null);

    const paymentDetails = useMemo(() => {
        const amount = parseFloat(customAmount) || 0;
        switch (paymentType) {
            case 'pass':
                return { amount: 50.00, title: 'All-Access Festival Pass', description: 'Unlock every film block for the entire festival.' };
            case 'block':
                return { amount: 10.00, title: `Block: ${block?.title}`, description: `Access all films in the "${block?.title}" block.` };
            case 'movie':
                 return { amount: 5.00, title: `Film: ${movie?.title}`, description: 'Permanently own this film to watch anytime.' };
            case 'subscription':
                return { amount: 4.99, title: 'Crate TV Premium', description: 'Unlock exclusive films and features.' };
            case 'donation':
                return { amount, title: `Support for "${movie?.title}"`, description: `Directed by ${movie?.director}` };
            case 'billSavingsDeposit':
                return { amount, title: 'Add Funds to Savings Pot', description: 'Deposit money from your card to the bill savings pot.' };
            default:
                return { amount: 0, title: 'Purchase', description: '' };
        }
    }, [paymentType, movie, block, customAmount]);

    useEffect(() => {
        const initializeSquare = async () => {
            if (!cardRef.current) return;
            setStatus('loading');
            try {
                const configRes = await fetch('/api/square-config', { method: 'GET' });
                if (!configRes.ok) throw new Error('Could not load payment configuration.');
                const { applicationId, locationId } = await configRes.json();

                if (!applicationId || !locationId) throw new Error('Payment configuration is incomplete.');

                const payments = Square.payments(applicationId, locationId);
                const card = await payments.card();
                await card.attach('#card-container');
                cardInstance.current = card;
                setStatus('idle');
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize payment form.');
                setStatus('error');
            }
        };

        initializeSquare();

        const handleEsc = (event: KeyboardEvent) => {
          if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        
        // Cleanup function to destroy the card instance when the component unmounts
        return () => {
            window.removeEventListener('keydown', handleEsc);
            if (cardInstance.current) {
                cardInstance.current.destroy();
                cardInstance.current = null;
            }
        };
    }, [onClose]);

    const handlePayment = async () => {
        if (!cardInstance.current) {
            setErrorMessage('Payment form not ready.');
            return;
        }

        setStatus('processing');
        setErrorMessage('');

        try {
            const result = await cardInstance.current.tokenize();
            if (result.status !== 'OK') {
                throw new Error(result.errors?.[0]?.message || 'Failed to tokenize card.');
            }

            const paymentData = {
                sourceId: result.token,
                paymentType: paymentType,
                amount: paymentDetails.amount,
                itemId: paymentType === 'block' ? block?.id : (paymentType === 'movie' || paymentType === 'donation' ? movie?.key : undefined),
                blockTitle: block?.title,
                movieTitle: movie?.title,
                directorName: movie?.director,
                email: email,
            };

            const response = await fetch('/api/process-square-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Payment failed.');
            }

            setStatus('success');
            onPaymentSuccess({ paymentType, itemId: paymentData.itemId, amount: paymentDetails.amount, email });
            setTimeout(onClose, 2000);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-white mb-2">{paymentDetails.title}</h2>
                    <p className="text-gray-400 mb-4">{paymentDetails.description}</p>
                    
                    {(paymentType === 'donation' || paymentType === 'billSavingsDeposit') && (
                        <div className="space-y-4 mb-4">
                             <div>
                                <label htmlFor="customAmount" className="block text-sm font-medium text-gray-300 mb-1">Amount (USD)</label>
                                <input
                                    type="number"
                                    id="customAmount"
                                    value={customAmount}
                                    onChange={e => setCustomAmount(e.target.value)}
                                    className="form-input"
                                    min="1.00"
                                    step="1.00"
                                    required
                                />
                            </div>
                            {paymentType === 'donation' && (
                                <div>
                                    <label htmlFor="emailForReceipt" className="block text-sm font-medium text-gray-300 mb-1">Email for Receipt (Optional)</label>
                                    <input
                                        type="email"
                                        id="emailForReceipt"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className={`form-input ${!!user ? 'bg-gray-700 cursor-not-allowed' : ''}`}
                                        placeholder="you@example.com"
                                        readOnly={!!user}
                                    />
                                 </div>
                            )}
                        </div>
                    )}

                    <div id="card-container" ref={cardRef}></div>
                    <div id="payment-status-container"></div>

                    {errorMessage && <p className="text-red-500 text-sm mt-2">{errorMessage}</p>}
                </div>

                <div className="bg-gray-800/50 p-4 rounded-b-lg">
                    {status === 'success' ? (
                        <div className="text-center text-green-400 font-bold">Payment Successful! Thank you.</div>
                    ) : (
                        <button
                            onClick={handlePayment}
                            disabled={status === 'loading' || status === 'processing'}
                            className="w-full submit-btn bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800"
                        >
                            {status === 'processing' ? 'Processing...' : `Pay ${paymentDetails.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SquarePaymentModal;