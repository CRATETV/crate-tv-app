import React, { useState, useEffect } from 'react';
import { Movie, FilmBlock } from '../types';
import { useAuth } from '../contexts/AuthContext';
import SquarePaymentModal from './SquarePaymentModal';
import WatchPartyLobby from './WatchPartyLobby';
import { useFestival } from '../contexts/FestivalContext';

/**
 * FESTIVAL TICKET FLOW
 * ─────────────────────────────────────────────────────────────────────────────
 * A single guided modal that takes a guest from "I want a ticket" to "I'm in
 * the lobby" in one uninterrupted sequence:
 *
 *   [Not logged in]  →  Create account (3 fields, festival context)
 *   [Logged in]      →  Payment (Square)
 *   [Paid]           →  Lobby (countdown + chat)
 *   [Party starts]   →  Navigate to watch party
 *
 * The user never sees a generic signup page. They always know exactly why
 * they're creating an account — to watch this specific film festival block.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Step = 'auth' | 'payment' | 'lobby';

interface FestivalTicketFlowProps {
    block: FilmBlock;
    blockMovie: Movie;       // synthesised Movie object for the block
    onClose: () => void;
    onSuccess: () => void;   // called after payment — parent can dismiss banner etc.
}

const FestivalTicketFlow: React.FC<FestivalTicketFlowProps> = ({ block, blockMovie, onClose, onSuccess }) => {
    const { user, signIn, signUp, unlockFestivalBlock, unlockedFestivalBlockIds, hasFestivalAllAccess } = useAuth();
    const { activeParties } = useFestival();

    // ── STEP LOGIC ────────────────────────────────────────────────────────────
    const alreadyHasAccess = hasFestivalAllAccess || unlockedFestivalBlockIds.has(block.id);
    const isLive = activeParties[block.id]?.status === 'live';
    const isFree = !block.price || block.price === 0;

    const initialStep = (): Step => {
        if (!user) return 'auth';
        if (alreadyHasAccess || isFree) return 'lobby';
        return 'payment';
    };

    const [step, setStep] = useState<Step>(initialStep);

    // When user logs in mid-flow, advance past auth step
    useEffect(() => {
        if (user && step === 'auth') {
            const nextStep = (alreadyHasAccess || isFree) ? 'lobby' : 'payment';
            setStep(nextStep);
        }
    }, [user, step, alreadyHasAccess, isFree]);

    // ── AUTH FORM STATE ───────────────────────────────────────────────────────
    const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);
        try {
            if (authMode === 'signup') {
                if (!name.trim()) throw new Error('Please enter your name.');
                await signUp(email.trim(), password, name.trim());
            } else {
                await signIn(email.trim(), password);
            }
            // useEffect above will advance the step once user is set
        } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
                setAuthError('That email already has a Crate account. Sign in instead.');
                setAuthMode('login');
            } else if (err.code === 'auth/invalid-credential') {
                setAuthError('Wrong email or password. Try again.');
            } else {
                setAuthError(err.message || 'Something went wrong. Please try again.');
            }
        } finally {
            setAuthLoading(false);
        }
    };

    // ── PAYMENT HANDLERS ──────────────────────────────────────────────────────
    const handlePaymentSuccess = async (details: any) => {
        if (details.itemId) {
            await unlockFestivalBlock(details.itemId);
        }
        // Show lobby FIRST — don't close the flow yet
        // onSuccess is called when user leaves the lobby
        setStep('lobby');
    };

    // ── LOBBY HANDLER ─────────────────────────────────────────────────────────
    const handlePartyStart = () => {
        onSuccess(); // notify parent ticket flow is complete
        onClose();
        window.history.pushState({}, '', `/watchparty/${block.id}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    // ── PREVENT BODY SCROLL ───────────────────────────────────────────────────
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // ── STEP: LOBBY (full-screen, no wrapper) ─────────────────────────────────
    if (step === 'lobby') {
        return (
            <div className="fixed inset-0 z-[300]">
                <WatchPartyLobby
                    movie={blockMovie}
                    partyState={activeParties[block.id]}
                    onPartyStart={handlePartyStart}
                    user={user}
                    hasAccess={true}
                    onClose={onClose}
                />
            </div>
        );
    }

    // ── STEP: PAYMENT (delegate to Square modal) ──────────────────────────────
    if (step === 'payment') {
        return (
            <SquarePaymentModal
                paymentType="block"
                block={block}
                priceOverride={block.price && block.price > 0 ? block.price : undefined}
                onClose={onClose}
                onPaymentSuccess={handlePaymentSuccess}
            />
        );
    }

    // ── STEP: AUTH ────────────────────────────────────────────────────────────
    const blockPoster = blockMovie.poster || '';

    return (
        <div
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[300] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header — festival context */}
                <div className="relative bg-gradient-to-b from-red-900/30 to-transparent p-6 pb-4">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* What they're buying */}
                    <div className="flex items-center gap-3 mb-4">
                        {blockPoster && (
                            <img src={blockPoster} alt={block.title} className="w-10 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0" />
                        )}
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-red-400 mb-0.5">
                                {isLive ? 'Live Now — Join the Party' : 'Watch Party Ticket'}
                            </p>
                            <h2 className="text-base font-black text-white uppercase tracking-tight leading-tight">
                                {block.title}
                            </h2>
                            {block.price && block.price > 0 && (
                                <p className="text-xs text-gray-400 mt-0.5">${block.price.toFixed(2)} · Playhouse West Film Festival</p>
                            )}
                        </div>
                    </div>

                    {/* Step indicator */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
                                <span className="text-[9px] font-black text-white">1</span>
                            </div>
                            <span className="text-[10px] font-bold text-white">Account</span>
                        </div>
                        <div className="flex-1 h-px bg-white/10" />
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                                <span className="text-[9px] font-black text-gray-500">2</span>
                            </div>
                            <span className="text-[10px] text-gray-500">
                                {isFree ? 'Lobby' : 'Payment'}
                            </span>
                        </div>
                        <div className="flex-1 h-px bg-white/10" />
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                                <span className="text-[9px] font-black text-gray-500">3</span>
                            </div>
                            <span className="text-[10px] text-gray-500">Watch</span>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="p-6 pt-4">
                    <h3 className="text-lg font-black text-white mb-1">
                        {authMode === 'signup' ? 'Create your free account' : 'Welcome back'}
                    </h3>
                    <p className="text-xs text-gray-500 mb-5">
                        {authMode === 'signup'
                            ? 'Quick and free — your ticket and all of Crate TV, one account.'
                            : 'Sign in to continue to your ticket.'}
                    </p>

                    <form onSubmit={handleAuth} className="space-y-3">
                        {authMode === 'signup' && (
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Your name"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/60 transition-colors"
                            />
                        )}
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Email address"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/60 transition-colors"
                        />
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/60 transition-colors"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                                </svg>
                            </button>
                        </div>

                        {authError && (
                            <p className="text-red-400 text-xs bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">{authError}</p>
                        )}

                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-sm py-3.5 rounded-xl transition-all mt-2"
                        >
                            {authLoading ? 'One moment...' : (authMode === 'signup' ? 'Create Account & Continue →' : 'Sign In & Continue →')}
                        </button>
                    </form>

                    <div className="mt-4 text-center">
                        {authMode === 'signup' ? (
                            <p className="text-xs text-gray-600">
                                Already have a Crate account?{' '}
                                <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-gray-400 hover:text-white font-bold transition-colors">
                                    Sign in
                                </button>
                            </p>
                        ) : (
                            <p className="text-xs text-gray-600">
                                New to Crate?{' '}
                                <button onClick={() => { setAuthMode('signup'); setAuthError(''); }} className="text-gray-400 hover:text-white font-bold transition-colors">
                                    Create a free account
                                </button>
                            </p>
                        )}
                    </div>

                    <p className="text-[10px] text-gray-700 text-center mt-4 leading-relaxed">
                        Free to join. Your account gives you access to this festival and the full Crate TV library.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FestivalTicketFlow;
