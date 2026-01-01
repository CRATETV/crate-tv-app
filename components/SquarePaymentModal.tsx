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

    const cardInstance = useRef<any>(null);

    const paymentDetails = useMemo(() => {
        const amount = parseFloat(customAmount) || 0;
        switch (paymentType) {
            case 'crateFestPass': return { amount: priceOverride || 15.00, title: 'Crate Fest Pass', description: 'Unlock the pop-up festival collection.', email };
            case 'pass': return { amount: 50.00, title: 'All-Access Festival Pass', description: 'Unlock every film block for the entire festival.', email };
            case 'block': return { amount: 10.00, title: `${block?.title}`, description: `Access all films in this block.`, email };
            case 'movie': return { amount: movie?.salePrice || 5.00, title: `${movie?.title}`, description: '24-hour access to stream this film.', email };
            case 'donation': return { amount, title: `Support: ${movie?.title}`, description: `Directed by ${movie?.director}`, email };
            default: return { amount: 0, title: 'Purchase', description: '', email };
        }
    }, [paymentType, movie, block, customAmount, email, priceOverride]);

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

    const handlePayment = async () => {
        if (!cardInstance.current) return;
        setStatus('processing');
        try {
            const result = await cardInstance.current.tokenize();
            if (result.status !== 'OK') throw new Error(result.errors?.[0]?.message);
            const response = await fetch('/api/process-square-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceId: result.token, paymentType, amount: paymentDetails.amount, itemId: paymentType === 'block' ? block?.id : movie?.key, movieTitle: movie?.title, email }),
            });
            if (!response.ok) throw new Error('Transaction rejected.');
            setStatus('success');
            setTimeout(() => onPaymentSuccess({ paymentType, itemId: paymentType === 'block' ? block?.id : movie?.key, amount: paymentDetails.amount, email }), 2500);
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
                                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Transaction Authenticated</span>
                                </div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Security Cleared</h2>
                            </div>
                            <DigitalTicket details={paymentDetails} type={paymentType} />
                            <p className="text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest animate-pulse">Syncing permissions with your profile...</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{paymentDetails.title}</h2>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Secure Payment Terminal</p>
                                </div>
                                <span className="text-xl font-black text-green-500">${paymentDetails.amount.toFixed(2)}</span>
                            </div>

                            <div className="space-y-6">
                                <div id="card-container" className="bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[120px]"></div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Delivery Address</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input !bg-white/5 !border-white/10 !py-3 text-sm" placeholder="Receipt email" />
                                </div>
                            </div>
                            
                            {errorMessage && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-4 text-center">{errorMessage}</p>}
                            
                            <button
                                onClick={handlePayment}
                                disabled={status === 'loading' || status === 'processing'}
                                className="w-full mt-8 bg-white text-black font-black py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-30 shadow-2xl"
                            >
                                {status === 'loading' ? 'Initializing...' : status === 'processing' ? 'Authorizing Session...' : 'Secure Access'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SquarePaymentModal;