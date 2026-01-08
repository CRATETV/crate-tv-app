import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Movie, FilmBlock } from '../types';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

declare const Square: any;

interface SquarePaymentModalProps {
    movie?: Movie;
    block?: FilmBlock;
    paymentType: 'donation' | 'subscription' | 'pass' | 'block' | 'movie' | 'billSavingsDeposit' | 'watchPartyTicket' | 'crateFestPass' | 'juryPass';
    onClose: () => void;
    onPaymentSuccess: (details: { paymentType: SquarePaymentModalProps['paymentType'], itemId?: string, amount: number, email?: string }) => void;
    priceOverride?: number; 
}

// Sub-component for a visual representation of the purchased access
const DigitalTicket: React.FC<{ details: any, type: string }> = ({ details, type }) => (
    <div className="relative w-full aspect-[1.6/1] bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/20 overflow-hidden shadow-2xl animate-[ticketEntry_0.8s_cubic-bezier(0.34,1.56,0.64,1)]">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/20 via-transparent to-red-600/20"></div>
        
        <div className="relative h-full flex flex-col p-6">
            <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-4">
                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="h-8 invert" alt="Crate" />
                <div className="text-right">
                    <p className="text-[8px] font-black text-red-500 uppercase tracking-[0.3em]">Secure Verified Access</p>
                    <p className="text-[10px] font-mono text-white/40">HASH: {Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
                </div>
            </div>
            
            <div className="flex-grow flex flex-col justify-center">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                    {type === 'juryPass' ? 'Grand Jury Credentials' : type === 'watchPartyTicket' ? 'Live Screening Pass' : type === 'crateFestPass' ? 'Crate Fest All-Access' : type === 'movie' ? 'Authorized Rental' : 'Official Selection Access'}
                </p>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight line-clamp-1">{details.title}</h3>
                <p className="text-xs text-gray-400 mt-2 font-mono">Issued to: {details.email || 'Verified Member'}</p>
            </div>

            <div className="mt-auto flex justify-between items-end border-t border-white/10 pt-4">
                <div className="flex gap-4">
                    <div>
                        <p className="text-[7px] text-gray-500 uppercase font-black">Status</p>
                        <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Authorized</p>
                    </div>
                    <div>
                        <p className="text-[7px] text-gray-500 uppercase font-black">Rank</p>
                        <p className="text-[10px] text-white font-bold uppercase tracking-widest">{type === 'juryPass' ? 'Jury Member' : 'Patron'}</p>
                    </div>
                </div>
                <div className="bg-white p-1 rounded">
                    <div className="w-10 h-10 bg-black flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M3 4h14v2H3V4zm0 4h14v2H3V8zm0 4h14v2H3v-2zm0 4h14v2H3v-2z" /></svg>
                    </div>
                </div>
            </div>
        </div>
        <div className="absolute top-0 right-1/4 bottom-0 w-px bg-white/5 border-l border-white/10"></div>
    </div>
);

const SquarePaymentModal: React.FC<SquarePaymentModalProps> = ({ 
    movie, 
    block, 
    paymentType, 
    onClose, 
    onPaymentSuccess, 
    priceOverride 
}) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    
    // User-defined amount for donations/deposits
    const [customAmount, setCustomAmount] = useState('5.00');
    const [promoCode, setPromoCode] = useState('');
    
    const cardRef = useRef<any>(null);
    const paymentFormRef = useRef<HTMLDivElement>(null);

    // Fixed price logic mapping to server-side priceMap
    const basePrice = useMemo(() => {
        if (priceOverride !== undefined) return priceOverride;
        switch (paymentType) {
            case 'juryPass': return 25.00;
            case 'subscription': return 4.99;
            case 'pass': return 50.00;
            case 'block': return 10.00;
            case 'movie': return 5.00;
            case 'watchPartyTicket': return movie?.watchPartyPrice || 5.00;
            case 'crateFestPass': return 15.00;
            default: return 0;
        }
    }, [paymentType, priceOverride, movie]);

    const displayAmount = useMemo(() => {
        if (['donation', 'billSavingsDeposit'].includes(paymentType)) {
            return parseFloat(customAmount) || 0;
        }
        return basePrice;
    }, [paymentType, customAmount, basePrice]);

    const itemTitle = useMemo(() => {
        if (movie) return movie.title;
        if (block) return block.title;
        if (paymentType === 'juryPass') return 'Grand Jury Credentials';
        if (paymentType === 'subscription') return 'Premium Subscription';
        if (paymentType === 'pass') return 'Festival All-Access Pass';
        if (paymentType === 'crateFestPass') return 'Crate Fest All-Access';
        if (paymentType === 'billSavingsDeposit') return 'Savings Pot Deposit';
        return 'Crate TV Item';
    }, [movie, block, paymentType]);

    useEffect(() => {
        let card: any;
        const initializeSquare = async () => {
            try {
                // Fetch config
                const configRes = await fetch('/api/square-config');
                if (!configRes.ok) throw new Error("Failed to load payment configuration.");
                const { applicationId, locationId } = await configRes.json();

                // Load Square SDK script
                if (!(window as any).Square) {
                    const script = document.createElement('script');
                    script.src = "https://web.squarecdn.com/v1/square.js";
                    script.async = true;
                    await new Promise((resolve) => {
                        script.onload = resolve;
                        document.head.appendChild(script);
                    });
                }

                const payments = (window as any).Square.payments(applicationId, locationId);
                card = await payments.card();
                await card.attach('#card-container');
                cardRef.current = card;
                setIsLoading(false);
            } catch (err) {
                console.error("Square Init Error:", err);
                setError("Payment system could not be initialized.");
                setIsLoading(false);
            }
        };

        initializeSquare();

        return () => {
            if (card) card.destroy();
        };
    }, []);

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cardRef.current || isProcessing) return;

        setIsProcessing(true);
        setError('');

        try {
            const result = await cardRef.current.tokenize();
            if (result.status === 'OK') {
                const response = await fetch('/api/process-square-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sourceId: result.token,
                        amount: displayAmount,
                        paymentType,
                        itemId: movie?.key || block?.id || paymentType,
                        movieTitle: movie?.title,
                        directorName: movie?.director,
                        blockTitle: block?.title,
                        email: user?.email,
                        promoCode: promoCode.trim() || undefined
                    }),
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Payment failed.");

                setPaymentSuccess(true);
                setTimeout(() => {
                    onPaymentSuccess({
                        paymentType,
                        itemId: movie?.key || block?.id,
                        amount: displayAmount,
                        email: user?.email || undefined
                    });
                }, 2000);
            } else {
                throw new Error(result.errors?.[0]?.message || "Card validation failed.");
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[150] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-[#111] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden relative" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Secure Checkout</h2>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Verified Node Terminal</p>
                    </div>
                    {!paymentSuccess && (
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>

                <div className="p-8 space-y-8">
                    {paymentSuccess ? (
                        <div className="space-y-8 py-6">
                            <div className="flex justify-center">
                                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_40px_rgba(34,197,94,0.2)]">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-3xl font-black uppercase tracking-tighter text-white italic">Authorization Confirmed</h3>
                                <p className="text-gray-400 mt-2 font-medium">Access protocols updated. Redirecting to content...</p>
                            </div>
                            <DigitalTicket details={{ title: itemTitle, email: user?.email }} type={paymentType} />
                        </div>
                    ) : (
                        <form onSubmit={handlePayment} className="space-y-8">
                            {/* Summary Card */}
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex justify-between items-center shadow-inner">
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Target Resource</p>
                                    <h4 className="text-xl font-black text-white uppercase tracking-tight truncate">{itemTitle}</h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Amount</p>
                                    <p className="text-2xl font-black text-white">${displayAmount.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Inputs for user-defined prices */}
                            {['donation', 'billSavingsDeposit'].includes(paymentType) && (
                                <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Manual Amount Allocation</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-700">$</span>
                                        <input 
                                            type="number" 
                                            value={customAmount} 
                                            onChange={e => setCustomAmount(e.target.value)} 
                                            className="w-full bg-black/40 border-2 border-white/10 rounded-2xl p-6 pl-12 text-3xl font-black text-white focus:border-red-600 transition-all outline-none"
                                            step="0.50"
                                            min="1.00"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Square Card Input */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Secure Payment Channel</label>
                                <div className="bg-black/40 border-2 border-white/10 rounded-2xl p-6 focus-within:border-red-600 transition-all">
                                    <div id="card-container"></div>
                                </div>
                            </div>

                            {/* Voucher Input */}
                            {!['donation', 'billSavingsDeposit'].includes(paymentType) && (
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Promotion Logic</p>
                                    <input 
                                        type="text" 
                                        placeholder="Voucher Code" 
                                        value={promoCode} 
                                        onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono tracking-widest text-white outline-none focus:border-red-600"
                                    />
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-2xl flex items-center gap-4 animate-shake">
                                    <span className="text-red-500 font-bold">⚠️</span>
                                    <p className="text-xs font-black uppercase text-red-500 tracking-widest">{error}</p>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={isLoading || isProcessing}
                                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-sm shadow-[0_20px_50px_rgba(239,68,68,0.2)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    `Authorize Transaction: $${displayAmount.toFixed(2)}`
                                )}
                            </button>
                        </form>
                    )}
                </div>

                <div className="p-6 bg-black/40 border-t border-white/5 text-center">
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">AES-256 Cloud Encryption // PII_PROTECTED // NO_STORAGE</p>
                </div>
            </div>
        </div>
    );
};

export default SquarePaymentModal;