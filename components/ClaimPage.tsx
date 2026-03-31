import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDbInstance } from '../services/firebaseClient';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import Header from './Header';
import Footer from './Footer';
import AuthModal from './AuthModal';

/**
 * CLAIM PAGE
 * 
 * Where users redeem their ticket codes for digital festival access.
 * 
 * Flow:
 * 1. User enters code (e.g., CRATE-FULL-X7K9AB)
 * 2. System validates code exists and isn't redeemed
 * 3. If user not logged in → prompt login/signup
 * 4. System unlocks appropriate access (full pass, day, or block)
 * 5. Code marked as redeemed
 */
const ClaimPage: React.FC = () => {
    const { user, hasFestivalAllAccess, unlockFestivalBlock, unlockWatchParty } = useAuth();
    
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState<{
        type: string;
        message: string;
    } | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingCode, setPendingCode] = useState('');

    // When user logs in with pending code, redeem it
    useEffect(() => {
        if (user && pendingCode && !showAuthModal) {
            redeemCode(pendingCode);
            setPendingCode('');
        }
    }, [user, pendingCode, showAuthModal]);

    const formatCode = (input: string): string => {
        // Remove any existing dashes and convert to uppercase
        const clean = input.replace(/-/g, '').toUpperCase();
        
        // Format as CRATE-XXX-XXXXXX
        if (clean.length <= 5) return clean;
        if (clean.length <= 8) return `${clean.slice(0, 5)}-${clean.slice(5)}`;
        return `${clean.slice(0, 5)}-${clean.slice(5, 8)}-${clean.slice(8, 14)}`;
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCode(e.target.value);
        setCode(formatted);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!code.trim()) {
            setError('Please enter a code');
            return;
        }

        // If not logged in, save code and prompt login
        if (!user) {
            setPendingCode(code);
            setShowAuthModal(true);
            return;
        }

        await redeemCode(code);
    };

    const redeemCode = async (codeToRedeem: string) => {
        setIsLoading(true);
        setError('');
        setSuccess(null);

        try {
            const db = getDbInstance();
            if (!db) {
                setError('Database not available. Please try again.');
                setIsLoading(false);
                return;
            }
            
            const codesRef = collection(db, 'ticket_codes');
            
            // Find the code
            const q = query(codesRef, where('code', '==', codeToRedeem.toUpperCase()));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setError('Invalid code. Please check and try again.');
                setIsLoading(false);
                return;
            }

            const codeDoc = snapshot.docs[0];
            const codeData = codeDoc.data();

            // Check if already redeemed
            if (codeData.isRedeemed) {
                setError('This code has already been redeemed.');
                setIsLoading(false);
                return;
            }

            // Redeem based on type
            let successMessage = '';
            
            if (codeData.type === 'full_pass') {
                // Grant full festival access
                await grantFullFestivalAccess();
                successMessage = '🎉 Full Festival Pass activated! You now have access to all festival films.';
            } else if (codeData.type === 'day_pass') {
                // Grant access to all blocks for that day
                await grantDayAccess(codeData.dayNumber);
                successMessage = `🎬 Day ${codeData.dayNumber} Pass activated! You now have access to all Day ${codeData.dayNumber} films.`;
            } else if (codeData.type === 'block') {
                // Grant access to specific block
                await unlockFestivalBlock(codeData.blockId);
                // Also unlock watch party for movies in this block
                if (codeData.movieKeys) {
                    for (const movieKey of codeData.movieKeys) {
                        await unlockWatchParty(movieKey);
                    }
                }
                successMessage = `🎟️ Block access activated: ${codeData.blockTitle || 'Festival Block'}! You can now watch these films.`;
            }

            // Mark code as redeemed
            await updateDoc(doc(db, 'ticket_codes', codeDoc.id), {
                isRedeemed: true,
                redeemedBy: user?.email || user?.uid,
                redeemedAt: new Date().toISOString()
            });

            setSuccess({
                type: codeData.type,
                message: successMessage
            });
            setCode('');

        } catch (err) {
            console.error('Error redeeming code:', err);
            setError('Something went wrong. Please try again or contact support.');
        } finally {
            setIsLoading(false);
        }
    };

    const grantFullFestivalAccess = async () => {
        if (!user) return;
        
        const db = getDbInstance();
        if (!db) return;
        
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            hasFestivalAllAccess: true,
            festivalAccessGrantedAt: new Date().toISOString(),
            festivalAccessSource: 'ticket_code'
        });
        
        // Reload user data
        window.location.reload();
    };

    const grantDayAccess = async (dayNumber: number) => {
        if (!user) return;
        
        const db = getDbInstance();
        if (!db) return;
        
        const userRef = doc(db, 'users', user.uid);
        
        // Get current unlocked days
        const currentDays = (user as any).unlockedFestivalDays || [];
        if (!currentDays.includes(dayNumber)) {
            await updateDoc(userRef, {
                unlockedFestivalDays: [...currentDays, dayNumber]
            });
        }
        
        // Reload to reflect changes
        window.location.reload();
    };

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
        // After login, redeem the pending code
        if (pendingCode) {
            setTimeout(() => {
                redeemCode(pendingCode);
                setPendingCode('');
            }, 500);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            
            <main className="flex-grow flex items-center justify-center p-4 py-20">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-purple-600 mb-6">
                            <span className="text-4xl">🎟️</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight italic">
                            Claim Your Access
                        </h1>
                        <p className="text-gray-400 mt-3">
                            Enter your ticket code to unlock your festival films
                        </p>
                    </div>

                    {/* Success State */}
                    {success && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 mb-6 text-center animate-[fadeIn_0.3s_ease-out]">
                            <div className="text-4xl mb-4">
                                {success.type === 'full_pass' ? '🎉' : success.type === 'day_pass' ? '🎬' : '🎟️'}
                            </div>
                            <p className="text-green-400 font-bold text-lg mb-2">Success!</p>
                            <p className="text-green-400/80">{success.message}</p>
                            <button
                                onClick={() => {
                                    window.history.pushState({}, '', '/festival');
                                    window.dispatchEvent(new Event('pushstate'));
                                }}
                                className="mt-6 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-full transition-colors"
                            >
                                Go to Festival →
                            </button>
                        </div>
                    )}

                    {/* Already has access */}
                    {hasFestivalAllAccess && !success && (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 mb-6 text-center">
                            <p className="text-purple-400 font-bold">✓ You already have Full Festival Access!</p>
                            <button
                                onClick={() => {
                                    window.history.pushState({}, '', '/festival');
                                    window.dispatchEvent(new Event('pushstate'));
                                }}
                                className="mt-4 text-purple-400 hover:text-purple-300 underline"
                            >
                                Go to Festival →
                            </button>
                        </div>
                    )}

                    {/* Claim Form */}
                    {!success && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
                                    Your Code
                                </label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={handleCodeChange}
                                    placeholder="CRATE-FULL-XXXXXX"
                                    className="w-full bg-white/5 border border-white/20 rounded-xl px-5 py-4 text-white text-center text-xl font-mono tracking-widest placeholder:text-gray-600 focus:outline-none focus:border-red-500 transition-colors"
                                    disabled={isLoading}
                                    autoComplete="off"
                                    autoCapitalize="characters"
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-center animate-[shake_0.3s_ease-out]">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || !code.trim()}
                                className="w-full bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-black py-4 px-8 rounded-xl uppercase tracking-wider transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                                        Validating...
                                    </span>
                                ) : (
                                    'Claim Access'
                                )}
                            </button>
                        </form>
                    )}

                    {/* Help text */}
                    <div className="mt-8 text-center text-gray-500 text-sm">
                        <p>Got your code from an in-person ticket purchase?</p>
                        <p className="mt-1">
                            Questions? Email{' '}
                            <a href="mailto:support@cratetv.net" className="text-red-400 hover:text-red-300">
                                support@cratetv.net
                            </a>
                        </p>
                    </div>

                    {/* Code types explanation */}
                    <div className="mt-10 bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="font-bold text-white mb-4">Code Types</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                                <span className="text-purple-400">●</span>
                                <div>
                                    <p className="text-white font-medium">CRATE-FULL-XXXXXX</p>
                                    <p className="text-gray-400">Full Festival Pass - Access to all films</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-blue-400">●</span>
                                <div>
                                    <p className="text-white font-medium">CRATE-DAY-XXXXXX</p>
                                    <p className="text-gray-400">Day Pass - Access to one day's films</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-green-400">●</span>
                                <div>
                                    <p className="text-white font-medium">CRATE-BLK-XXXXXX</p>
                                    <p className="text-gray-400">Block Access - Access to specific block</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            {/* Auth Modal */}
            {showAuthModal && (
                <AuthModal
                    onClose={() => {
                        setShowAuthModal(false);
                        setPendingCode('');
                    }}
                    initialView="signup"
                />
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `}</style>
        </div>
    );
};

export default ClaimPage;
