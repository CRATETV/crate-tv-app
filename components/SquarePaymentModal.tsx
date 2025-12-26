import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Movie, FilmBlock } from '../types';
import { useAuth } from '../contexts/AuthContext';

declare const Square: any; // Allow use of Square global from the SDK script

interface SquarePaymentModalProps {
    movie?: Movie;
    block?: FilmBlock;
    paymentType: 'donation' | 'subscription' | 'pass' | 'block' | 'movie' | 'billSavingsDeposit' | 'watchPartyTicket';
    onClose: () => void;
    onPaymentSuccess: (details: { paymentType: SquarePaymentModalProps['paymentType'], itemId?: string, amount: number, email?: string }) => void;
}

const SquarePaymentModal: React.FC<SquarePaymentModalProps> = ({ movie, block, paymentType, onClose, onPaymentSuccess }) => {
    const { user } = useAuth();
    const [status, setStatus] = useState<'idle' | 'loading' | 'processing' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [customAmount, setCustomAmount] = useState('10.00');
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
                 return { amount: movie?.salePrice || 5.00, title: `Film: ${movie?.title}`, description: 'Permanently own this film to watch anytime.' };
            case 'watchPartyTicket':
                 return { amount: movie?.watchPartyPrice || 5.00, title: `Watch Party Ticket`, description: `Live Screening: "${movie?.title}"` };
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
        let isMounted = true;
        let retryCount = 0;
        const MAX_RETRIES = 50;

        const initializeSquare = async () => {
            try {
                const configRes = await fetch('/api/square-config', { method: 'GET' });
                if (!configRes.ok) throw new Error('Could not load payment configuration.');
                const { applicationId, locationId } = await configRes.json();

                if (!applicationId || !locationId) throw new Error('Payment configuration is incomplete.');

                // Modern Web Payments SDK Initialization
                const payments = Square.payments(applicationId, locationId);
                const card = await payments.card({
                    style: {
                        '.input-container': {
                            backgroundColor: '#111',
                            borderColor: '#333',
                            borderRadius: '8px',
                        },
                        '.input-container.is-focus': {
                            borderColor: '#ef4444'
                        },
                        '.input-container.is-error': {
                            borderColor: '#ff0000'
                        },
                        'input': {
                            color: '#fff'
                        }
                    }
                });
                
                if (isMounted) {
                    await card.attach('#card-container');
                    cardInstance.current = card;
                    setStatus('idle');
                }
            } catch (error: any) {
                if (isMounted) {
                    setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize payment form.');
                    setStatus('error');
                }
            }
        };
        
        const pollForSquare = () => {
            if (!isMounted) return;
            if (typeof Square !== 'undefined') {
                initializeSquare();
            } else if (retryCount < MAX_RETRIES) {
                retryCount++;
                setTimeout(pollForSquare, 200);
            } else {
                setErrorMessage('Square payment library failed to load. Please check your connection.');
                setStatus('error');
            }
        };

        pollForSquare();
        
        const handleEsc = (event: KeyboardEvent) => {
          if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        
        return () => {
            isMounted = false;
            window.removeEventListener('keydown', handleEsc);
            if (cardInstance.current) {
                cardInstance.current.destroy();
                cardInstance.current = null;
            }
        };
    }, [onClose]);

    const handlePayment = async () => {
        if (!cardInstance.current) return;

        setStatus('processing');
        setErrorMessage('');

        try {
            const result = await cardInstance.current.tokenize();
            if (result.status !== 'OK') {
                throw new Error(result.errors?.[0]?.message || 'Failed to process card.');
            }

            const paymentData = {
                sourceId: result.token,
                paymentType,
                amount: paymentDetails.amount,
                itemId: paymentType === 'block' ? block?.id : movie?.key,
                movieTitle: movie?.title,
                directorName: movie?.director,
                email,
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
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-md border border-white/5 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 overflow-y-auto">
                    <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">{paymentDetails.title}</h2>
                    <p className="text-gray-400 mb-6 text-sm">{paymentDetails.description}</p>
                    
                    {(paymentType === 'donation' || paymentType === 'billSavingsDeposit') && (
                        <div className="space-y-4 mb-6">
                             <div>
                                <label htmlFor="customAmount" className="form-label">Amount (USD)</label>
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
                        </div>
                    )}

                    <div id="card-container" ref={cardRef} className="min-h-[100px] bg-black/20 rounded-xl p-2 border border-white/5"></div>

                    {errorMessage && <p className="text-red-500 text-xs mt-4 font-bold uppercase tracking-widest">{errorMessage}</p>}
                </div>

                <div className="bg-gray-900/50 p-6 rounded-b-2xl mt-auto border-t border-white/5">
                    {status === 'success' ? (
                        <div className="text-center text-green-400 font-bold uppercase tracking-widest">Success! Thank you.</div>
                    ) : (
                        <button
                            onClick={handlePayment}
                            disabled={status === 'loading' || status === 'processing'}
                            className="w-full submit-btn !bg-white !text-black disabled:opacity-50"
                        >
                            {status === 'loading' ? 'Initializing...' : status === 'processing' ? 'Securing...' : `Confirm ${paymentDetails.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SquarePaymentModal;