import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Movie, FilmBlock } from '../types';
import { useAuth } from '../contexts/AuthContext';

declare const Square: any;

interface SquarePaymentModalProps {
    movie?: Movie;
    block?: FilmBlock;
    paymentType: 'donation' | 'subscription' | 'pass' | 'block' | 'movie' | 'billSavingsDeposit' | 'watchPartyTicket' | 'crateFestPass';
    onClose: () => void;
    onPaymentSuccess: (details: { paymentType: SquarePaymentModalProps['paymentType'], itemId?: string, amount: number, email?: string }) => void;
    priceOverride?: number; // New prop to handle dynamic pricing from Admin settings
}

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
                    {type === 'crateFestPass' ? 'Crate Fest All-Access' : type === 'movie' ? 'Authorized Rental' : 'Official Selection Access'}
                </p>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight line-clamp-1">{details.title}</h3>
                <p className="text-xs text-gray-400 mt-2 font-mono">Issued to: {details.email || 'Verified Supporter'}</p>
            </div>

            <div className="mt-auto flex justify-between items-end border-t border-white/10 pt-4">
                <div className="flex gap-4">
                    <div>
                        <p className="text-[7px] text-gray-500 uppercase font-black">Status</p>
                        <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Valid</p>
                    </div>
                    <div>
                        <p className="text-[7px] text-gray-500 uppercase font-black">Expiry</p>
                        <p className="text-[10px] text-white font-bold uppercase tracking-widest">Event End</p>
                    </div>
                </div>
                <div className="bg-white p-1 rounded">
                    <div className="w-10 h-10 bg-black flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M3 4h14v2H3V4zm0 4h14v2H3V8zm0 4h14v2H3v-2zm0 4h14v2H3v-2z" /></svg>
                    </div>
                </div>
            </div>
        </div>
        <div className="absolute top-0 right-1/4 bottom-0 w-px bg-white/5 border-l border-dashed border-white/20"></div>
    </div>
);

const SquarePaymentModal: React.FC<SquarePaymentModalProps> = ({ movie, block, paymentType, onClose, onPaymentSuccess, priceOverride }) => {
    const { user } = useAuth();
    const [status, setStatus] = useState<'idle' | 'loading' | 'processing' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [customAmount, setCustomAmount] = useState('10.00');
    const [email, setEmail] = useState(user?.email || '');
    
    // Promo Code State
    const [promoCode, setPromoCode] = useState('');
    const [isPromoValidating, setIsPromoValidating] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<{ code: string, isFree: boolean, finalPriceInCents: number } | null>(null);

    const cardInstance = useRef<any>(null);

    const basePrice = useMemo(() => {
        switch (paymentType) {
            case 'crateFestPass': return priceOverride || 15.00;
            case 'pass': return 50.00;
            case 'block': return 10.00;
            case 'movie': return movie?.salePrice || 5.00;
            case 'watchPartyTicket': return movie?.watchPartyPrice || 5.00;
            case 'donation': return parseFloat(customAmount) || 0;
            default: return 0;
        }
    }, [paymentType, movie, customAmount, priceOverride]);

    const finalAmount = appliedPromo ? appliedPromo.finalPriceInCents / 100 : basePrice;

    const paymentDetails = useMemo(() => {
        return { 
            amount: finalAmount, 
            title: block?.title || movie?.title || (paymentType === 'crateFestPass' ? 'Crate Fest Pass' : 'Crate TV Access'), 
            email 
        };
    }, [finalAmount, block, movie, paymentType, email]);

    useEffect(() => {
        let isMounted = true;
        let retryCount = 0;
        const initializeSquare = async () => {
            try {
                const configRes = await fetch('/api/square-config');
                const { applicationId, locationId } = await configRes.json();
                const payments = Square.payments(applicationId, locationId);
                const card = await payments.card({
                    style: { 'input': { 'color': '#ffffff', 'fontSize': '16px' } }
                });
                if (isMounted) {
                    await card.attach('#card-container');
                    cardInstance.current = card;
                    setStatus('idle');
                }
            } catch (error: any) {
                if (isMounted) { setErrorMessage('Payment gateway initialization failed.'); setStatus('error'); }
            }
        };
        const poll = () => {
            if (typeof Square !== 'undefined') initializeSquare();
            else if (retryCount < 50) { retryCount++; setTimeout(poll, 200); }
        };
        poll();
        return () => { isMounted = false; if (cardInstance.current) cardInstance.current.destroy(); };
    }, []);

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        setIsPromoValidating(true);
        setErrorMessage('');
        try {
            const res = await fetch('/api/validate-promo-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    code: promoCode, 
                    itemId: block?.id || movie?.key,
                    originalPriceInCents: Math.round(basePrice * 100)
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Voucher invalid.");
            setAppliedPromo({
                code: promoCode.toUpperCase().trim(),
                isFree: data.isFree,
                finalPriceInCents: data.finalPriceInCents
            });
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Invalid Voucher');
        } finally {
            setIsPromoValidating(false);
        }
    };

    const handlePayment = async () => {
        setStatus('processing');
        try {
            let token = 'PROMO_VOUCHER';
            
            if (!appliedPromo?.isFree) {
                if (!cardInstance.current) throw new Error("Payment node disconnected.");
                const result = await cardInstance.current.tokenize();
                if (result.status !== 'OK') throw new Error(result.errors?.[0]?.message);
                token = result.token;
            }

            const response = await fetch('/api/process-square-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    sourceId: token, 
                    paymentType, 
                    amount: finalAmount, 
                    itemId: block?.id || movie?.key, 
                    movieTitle: movie?.title, 
                    email,
                    promoCode: appliedPromo?.code 
                }),
            });
            if (!response.ok) throw new Error('Transaction rejected.');
            setStatus('success');
            setTimeout(() => onPaymentSuccess({ paymentType, itemId: block?.id || movie?.key, amount: finalAmount, email }), 2500);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unknown Error');
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[150] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-[#0a0a0a] rounded-3xl shadow-2xl w-full max-w-md border border-white/10 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-8">
                    {status === 'success' ? (
                        <div className="space-y-8 py-4">
                            <div className="text-center">
                                <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-4 py-1 rounded-full mb-4">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Access Authenticated</span>
                                </div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Security Cleared</h2>
                            </div>
                            <DigitalTicket details={paymentDetails} type={paymentType} />
                            <p className="text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest animate-pulse">Synchronizing cloud permissions...</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none line-clamp-1">{paymentDetails.title}</h2>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Secure Access Terminal</p>
                                </div>
                                <span className={`text-xl font-black ${finalAmount === 0 ? 'text-green-500' : 'text-white'}`}>
                                    {finalAmount === 0 ? 'FREE' : `$${finalAmount.toFixed(2)}`}
                                </span>
                            </div>

                            <div className="space-y-6">
                                {/* Voucher Entry */}
                                {!appliedPromo ? (
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={promoCode} 
                                            onChange={e => setPromoCode(e.target.value)} 
                                            placeholder="Voucher/Promo Code" 
                                            className="form-input !bg-white/5 !border-white/10 !py-3 text-xs uppercase tracking-widest font-black" 
                                        />
                                        <button 
                                            onClick={handleApplyPromo}
                                            disabled={isPromoValidating || !promoCode.trim()}
                                            className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 transition-all"
                                        >
                                            {isPromoValidating ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-green-600/10 border border-green-500/30 p-3 rounded-xl flex justify-between items-center animate-[fadeIn_0.3s_ease-out]">
                                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">✓ Voucher "{appliedPromo.code}" Active</p>
                                        <button onClick={() => setAppliedPromo(null)} className="text-[8px] font-black text-red-500 uppercase">Remove</button>
                                    </div>
                                )}

                                {!appliedPromo?.isFree && (
                                    <div id="card-container" className="bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[120px]"></div>
                                )}
                                
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Delivery Address</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input !bg-white/5 !border-white/10 !py-3 text-sm" placeholder="Receipt email" />
                                </div>
                            </div>
                            
                            {errorMessage && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-4 text-center">{errorMessage}</p>}
                            
                            <button
                                onClick={handlePayment}
                                disabled={status === 'loading' || status === 'processing'}
                                className={`w-full mt-8 ${finalAmount === 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-white text-black hover:bg-gray-200'} font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-30 shadow-2xl`}
                            >
                                {status === 'loading' ? 'Initializing...' : status === 'processing' ? 'Authorizing Session...' : (finalAmount === 0 ? 'Claim Access' : 'Secure Access')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SquarePaymentModal;