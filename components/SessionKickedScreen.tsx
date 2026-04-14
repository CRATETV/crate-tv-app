import React from 'react';

interface SessionKickedScreenProps {
    reason: 'other_device' | 'session_expired' | null;
}

const SessionKickedScreen: React.FC<SessionKickedScreenProps> = ({ reason }) => {
    const isExpired = reason === 'session_expired';

    return (
        <div className="fixed inset-0 bg-black z-[400] flex items-center justify-center p-8">
            <div className="text-center space-y-6 max-w-sm animate-[fadeIn_0.5s_ease-out]">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center border ${isExpired ? 'bg-blue-600/20 border-blue-500/30' : 'bg-amber-600/20 border-amber-500/30'}`}>
                    <svg className={`w-8 h-8 ${isExpired ? 'text-blue-400' : 'text-amber-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>

                <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isExpired ? 'text-blue-400' : 'text-amber-400'}`}>
                        {isExpired ? 'Session Expired' : 'Account Active Elsewhere'}
                    </p>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-3">
                        {isExpired ? 'Please sign in again' : 'This account signed in on another device'}
                    </h2>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        {isExpired
                            ? 'Your session has expired for security. Please sign in again to continue watching.'
                            : 'Your account is currently active on another device. Each ticket is for one viewer at a time. Sign in again on this device to continue.'}
                    </p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => { window.history.pushState({}, '', '/login'); window.dispatchEvent(new Event('pushstate')); }}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-sm py-3.5 rounded-xl transition-all"
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new Event('pushstate')); }}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-400 text-sm font-bold py-3 rounded-xl transition-all"
                    >
                        Back to Home
                    </button>
                </div>

                <p className="text-[10px] text-gray-700 leading-relaxed">
                    Each purchased ticket is tied to one account and one active session. This keeps our festival fair for every filmmaker and viewer.
                </p>
            </div>
        </div>
    );
};

export default SessionKickedScreen;
