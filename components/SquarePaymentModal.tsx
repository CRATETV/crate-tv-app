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

const DigitalTicket: React.FC<{ details: any, type: string }> = ({ details, type }) => {
    const ticketId = React.useMemo(() => Math.random().toString(36).substring(2, 10).toUpperCase(), []);
    const isPass = type === 'pass' || type === 'crateFestPass' || type === 'juryPass';
    const label = type === 'juryPass' ? 'Grand Jury Credentials'
        : type === 'pass' ? 'Festival All-Access Pass'
        : type === 'crateFestPass' ? 'Crate Fest All-Access'
        : type === 'block' ? 'Screening Block Pass'
        : type === 'movie' ? 'Authorized Rental'
        : 'Official Selection Access';

    return (
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0a0a0a 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>

            {/* Gold top accent */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, #c8960c, #f5d06e, #c8960c, transparent)' }} />

            {/* Film strip holes top */}
            <div className="flex gap-3 px-4 py-2 opacity-20">
                {[...Array(8)].map((_, i) => <div key={i} className="w-4 h-3 rounded-sm bg-white/40 flex-shrink-0" />)}
            </div>

            <div className="px-8 pb-8 pt-2 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <img src="https://d3jhtrl1gnrh4b.cloudfront.net/logo+with+background+removed+.png" className="h-7 invert opacity-80" alt="Crate" />
                    <div className="text-right">
                        <p className="text-[8px] font-black uppercase tracking-[0.4em]" style={{ color: '#c8960c' }}>Playhouse West Film Festival</p>
                        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-600">Philadelphia · 2026</p>
                    </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,150,12,0.4))' }} />
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#c8960c' }} />
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(200,150,12,0.4), transparent)' }} />
                </div>

                {/* Main credential */}
                <div className="text-center space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-500">{label}</p>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white leading-tight">{details.title}</h2>
                    <p className="text-xs text-gray-600 font-mono">Issued to: {details.email || 'Verified Member'}</p>
                </div>

                {/* Status row */}
                <div className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4">
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-600 mb-1">Access Level</p>
                        <p className="text-xs font-black uppercase tracking-wider" style={{ color: isPass ? '#c8960c' : '#22c55e' }}>
                            {isPass ? '⭐ All-Access' : '✓ Confirmed'}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-600 mb-1">Credential ID</p>
                        <p className="text-[10px] font-mono text-white/40">{ticketId}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-600 mb-1">Valid</p>
                        <p className="text-[10px] font-black text-white">Aug 21–23</p>
                    </div>
                </div>
            </div>

            {/* Film strip holes bottom */}
            <div className="flex gap-3 px-4 py-2 opacity-20">
                {[...Array(8)].map((_, i) => <div key={i} className="w-4 h-3 rounded-sm bg-white/40 flex-shrink-0" />)}
            </div>

            {/* Gold bottom accent */}
            <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #c8960c, #f5d06e, #c8960c, transparent)' }} />
        </div>
    );
};

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
    const [isValidatingPromo, setIsValidatingPromo] = useState(false);
    const [error, setError] = useState('');
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    
    const [customAmount, setCustomAmount] = useState('5.00');
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<any>(null);
    
    const cardRef = useRef<any>(null);

    const basePrice = useMemo(() => {
        if (priceOverride !== undefined) return priceOverride;
        switch (paymentType) {
            case 'juryPass': return 25.00;
            case 'subscription': return 4.99;
            case 'pass': return 50.00;
            case 'block': return 10.00;
            case 'movie': return movie?.salePrice ?? 5.00;
            case 'watchPartyTicket': return movie?.watchPartyPrice ?? 5.00;
            case 'crateFestPass': return 15.00;
            default: return 0;
        }
    }, [paymentType, priceOverride, movie]);

    const displayAmount = useMemo(() => {
        if (['donation', 'billSavingsDeposit'].includes(paymentType)) {
            return parseFloat(customAmount) || 0;
        }
        if (appliedPromo) {
            return appliedPromo.finalPriceInCents / 100;
        }
        return basePrice;
    }, [paymentType, customAmount, basePrice, appliedPromo]);

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

    const isFree = useMemo(() => appliedPromo?.isFree === true, [appliedPromo]);

    useEffect(() => {
        let card: any;
        let retryCount = 0;
        const maxRetries = 3;

        const initializeSquare = async () => {
            try {
                // Fetch Square config from API
                const configRes = await fetch('/api/square-config');
                if (!configRes.ok) {
                    const errorData = await configRes.json().catch(() => ({}));
                    throw new Error(errorData.error || "Failed to load payment configuration.");
                }
                const { applicationId, locationId } = await configRes.json();

                if (!applicationId || !locationId) {
                    throw new Error("Payment system is not configured. Please contact support.");
                }

                // Load Square SDK if not already loaded
                if (!(window as any).Square) {
                    const script = document.createElement('script');
                    script.src = "https://web.squarecdn.com/v1/square.js";
                    script.async = true;
                    
                    await new Promise((resolve, reject) => {
                        script.onload = resolve;
                        script.onerror = () => reject(new Error("Failed to load payment processor."));
                        document.head.appendChild(script);
                    });

                    // Wait a moment for Square to initialize
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                if (!(window as any).Square) {
                    throw new Error("Payment processor not available. Please refresh and try again.");
                }

                const payments = (window as any).Square.payments(applicationId, locationId);
                card = await payments.card();
                await card.attach('#card-container');
                cardRef.current = card;
                setIsLoading(false);
                setError(''); // Clear any previous errors
            } catch (err: any) {
                console.error("Square Init Error:", err);
                
                // Retry logic for transient failures
                if (retryCount < maxRetries && err.message?.includes("Failed to load")) {
                    retryCount++;
                    console.log(`Retrying Square init (${retryCount}/${maxRetries})...`);
                    setTimeout(initializeSquare, 1000 * retryCount);
                    return;
                }
                
                setError(err.message || "Payment system could not be initialized. Please try again.");
                setIsLoading(false);
            }
        };

        initializeSquare();
        return () => { if (card) card.destroy(); };
    }, []);

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        setIsValidatingPromo(true);
        setError('');
        try {
            const res = await fetch('/api/validate-promo-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    code: promoCode, 
                    itemId: movie?.key || block?.id || paymentType,
                    originalPriceInCents: Math.round(basePrice * 100)
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Validation failed.");
            setAppliedPromo(data);
        } catch (err: any) {
            setError(err.message);
            setAppliedPromo(null);
        } finally {
            setIsValidatingPromo(false);
        }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isProcessing) return;

        setIsProcessing(true);
        setError('');

        try {
            let sourceId = 'PROMO_VOUCHER';
            
            if (!isFree) {
                if (!cardRef.current) throw new Error("Payment node offline.");
                const result = await cardRef.current.tokenize();
                if (result.status !== 'OK') throw new Error(result.errors?.[0]?.message || "Card validation failed.");
                sourceId = result.token;
            }

            const response = await fetch('/api/process-square-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceId,
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
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[150] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-[#111] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden relative" onClick={e => e.stopPropagation()}>
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
                        <div className="space-y-6 py-4">
                            {/* Animated checkmark */}
                            <div className="flex justify-center">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full flex items-center justify-center"
                                        style={{ background: 'radial-gradient(circle, rgba(200,150,12,0.15) 0%, transparent 70%)', border: '2px solid rgba(200,150,12,0.3)' }}>
                                        <svg className="w-12 h-12" fill="none" stroke="#c8960c" viewBox="0 0 24 24"
                                            style={{ filter: 'drop-shadow(0 0 12px rgba(200,150,12,0.6))' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    {/* Pulse rings */}
                                    <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                                        style={{ border: '2px solid #c8960c' }} />
                                </div>
                            </div>
                            {/* Headline */}
                            <div className="text-center space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-[0.5em]" style={{ color: '#c8960c' }}>Payment Successful</p>
                                <h3 className="text-4xl font-black uppercase tracking-tighter text-white italic leading-none">
                                    You're In.
                                </h3>
                                <p className="text-gray-500 text-sm">Your credential is ready. Entering the lobby now.</p>
                            </div>
                            {/* Ticket */}
                            <DigitalTicket details={{ title: itemTitle, email: user?.email }} type={paymentType} />
                        </div>
                    ) : (
                        <form onSubmit={handlePayment} className="space-y-8">
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex justify-between items-center shadow-inner">
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Target Resource</p>
                                    <h4 className="text-xl font-black text-white uppercase tracking-tight truncate">{itemTitle}</h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Amount</p>
                                    <p className={`text-2xl font-black ${isFree ? 'text-green-500' : 'text-white'}`}>
                                        {isFree ? 'FREE' : `$${displayAmount.toFixed(2)}`}
                                    </p>
                                </div>
                            </div>

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

                            {!isFree && (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Secure Payment Channel</label>
                                    <div className="bg-black/40 border-2 border-white/10 rounded-2xl p-6 focus-within:border-red-600 transition-all">
                                        <div id="card-container"></div>
                                    </div>
                                </div>
                            )}

                            {isFree && (
                                <div className="p-8 bg-green-500/10 border border-green-500/20 rounded-3xl text-center space-y-4 animate-[fadeIn_0.5s_ease-out]">
                                    <div className="text-3xl">🎁</div>
                                    <div>
                                        <p className="text-green-500 font-black uppercase text-xs tracking-widest">VIP Voucher Validated</p>
                                        <p className="text-gray-400 text-[10px] font-bold mt-1 uppercase">Payment requirement waived for this session.</p>
                                    </div>
                                </div>
                            )}

                            {!['donation', 'billSavingsDeposit'].includes(paymentType) && (
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Promotion Logic</p>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Voucher Code" 
                                            value={promoCode} 
                                            onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                            className="flex-grow bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono tracking-widest text-white outline-none focus:border-red-600"
                                        />
                                        <button 
                                            type="button"
                                            onClick={handleApplyPromo}
                                            disabled={isValidatingPromo || !promoCode}
                                            className="bg-white/10 hover:bg-white/20 text-white font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest border border-white/10 transition-all disabled:opacity-20"
                                        >
                                            {isValidatingPromo ? '...' : 'Apply'}
                                        </button>
                                    </div>
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
                                className={`w-full ${isFree ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:bg-gray-800 disabled:text-gray-600 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-sm shadow-[0_20px_50px_rgba(239,68,68,0.2)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-3`}
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    isFree ? 'Redeem Digital Access' : `Authorize Transaction: $${displayAmount.toFixed(2)}`
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