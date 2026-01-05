
import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';

declare const Square: any;

interface FinancialOnboardingModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const FinancialOnboardingModal: React.FC<FinancialOnboardingModalProps> = ({ onClose, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const cardRef = useRef<any>(null);

    useEffect(() => {
        let card: any;
        const initializeSquare = async () => {
            try {
                const configRes = await fetch('/api/square-config');
                const { applicationId, locationId } = await configRes.json();

                if (!(window as any).Square) {
                    const script = document.createElement('script');
                    script.src = "https://web.squarecdn.com/v1/square.js";
                    script.async = true;
                    await new Promise((resolve) => {
                        script.onload = resolve;
                        document.head.appendChild(script);
                    });
                }

                const payments = Square.payments(applicationId, locationId);
                card = await payments.card();
                await card.attach('#payout-card-container');
                cardRef.current = card;
                setIsLoading(false);
            } catch (err) {
                setError("Financial subsystem offline.");
                setIsLoading(false);
            }
        };

        initializeSquare();
        return () => { if (card) card.destroy(); };
    }, []);

    const handleOnboard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cardRef.current || isProcessing) return;

        setIsProcessing(true);
        setError('');

        try {
            const result = await cardRef.current.tokenize();
            if (result.status === 'OK') {
                const password = sessionStorage.getItem('adminPassword');
                const response = await fetch('/api/onboard-festival-recipient', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        sourceId: result.token, 
                        password 
                    }),
                });

                if (!response.ok) throw new Error("Onboarding rejected by secure core.");
                onSuccess();
            } else {
                throw new Error(result.errors?.[0]?.message || "Validation failed.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-[#111] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Payout Configuration</h2>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">PCI-DSS Encrypted Channel</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    <div className="bg-red-600/10 border border-red-500/20 p-6 rounded-2xl">
                        <p className="text-xs font-bold text-red-500 leading-relaxed uppercase tracking-tighter">
                            By linking a card, you designate the destination for your 70% revenue share. Funds are dispatched directly via Square Payouts.
                        </p>
                    </div>

                    <form onSubmit={handleOnboard} className="space-y-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Destination Card/Bank Info</label>
                            <div className="bg-black/40 border-2 border-white/10 rounded-2xl p-6 focus-within:border-red-600 transition-all">
                                <div id="payout-card-container"></div>
                            </div>
                        </div>

                        {error && (
                            <p className="text-xs font-black uppercase text-red-500 tracking-widest text-center">{error}</p>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading || isProcessing}
                            className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest text-sm shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-20"
                        >
                            {isProcessing ? 'Verifying Node...' : 'Establish Secure Link'}
                        </button>
                    </form>
                </div>

                <div className="p-6 bg-black/40 border-t border-white/5 text-center">
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">No raw financial data is stored on Crate TV servers.</p>
                </div>
            </div>
        </div>
    );
};

export default FinancialOnboardingModal;
