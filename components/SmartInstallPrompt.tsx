
import React, { useState, useEffect } from 'react';

const SmartInstallPrompt: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // CRITICAL CHECK: Detect if already in PWA/Standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true || 
                           document.referrer.includes('android-app://');

        if (isStandalone) {
            console.log("[PWA] Standalone mode detected. Suppressing install prompt.");
            return;
        }

        const views = parseInt(localStorage.getItem('crate_tv_engagement_views') || '0', 10);
        const hasDismissed = localStorage.getItem('crate_tv_install_dismissed') === 'true';

        if (views >= 3 && !hasDismissed) {
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) {
            alert("To install Crate TV, tap the 'Share' icon in your browser menu and select 'Add to Home Screen'.");
            handleDismiss();
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User installed Crate TV');
        }
        setDeferredPrompt(null);
        handleDismiss();
    };

    const handleDismiss = () => {
        localStorage.setItem('crate_tv_install_dismissed', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-[100] animate-[slideInUp_0.6s_cubic-bezier(0.34,1.56,0.64,1)]">
            <div className="bg-[#111] border border-white/10 rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl overflow-hidden p-2">
                        <img 
                            src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" 
                            className="w-full h-full object-contain brightness-0 invert" 
                            alt="Crate" 
                        />
                    </div>
                    <div className="flex-grow">
                        <h3 className="text-white font-black text-lg uppercase tracking-tighter">Crate TV Pro</h3>
                        <p className="text-gray-400 text-xs font-medium leading-snug">Install for the full cinematic experience and zero-latency dispatches.</p>
                    </div>
                    <button onClick={handleDismiss} className="p-2 text-gray-600 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="mt-6">
                    <button 
                        onClick={handleInstall}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl uppercase text-xs tracking-[0.2em] shadow-lg shadow-red-900/40 transition-all active:scale-95"
                    >
                        Secure App Access
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmartInstallPrompt;
