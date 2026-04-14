/**
 * Toast.tsx — lightweight toast notification system
 * Replaces all native alert() calls throughout the app.
 * Usage: import { toast } from './Toast'; toast.success('Saved!'); toast.error('Failed');
 */
import React, { useState, useEffect, useCallback } from 'react';

interface ToastItem {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

// Global event bus
const TOAST_EVENT = 'crate-toast';

export const toast = {
    success: (message: string) => window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, type: 'success' } })),
    error: (message: string) => window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, type: 'error' } })),
    info: (message: string) => window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, type: 'info' } })),
};

export const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const remove = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        const handle = (e: Event) => {
            const { message, type } = (e as CustomEvent).detail;
            const id = `${Date.now()}-${Math.random()}`;
            setToasts(prev => [...prev.slice(-3), { id, message, type }]);
            setTimeout(() => remove(id), 3500);
        };
        window.addEventListener(TOAST_EVENT, handle);
        return () => window.removeEventListener(TOAST_EVENT, handle);
    }, [remove]);

    if (!toasts.length) return null;

    return (
        <div className="fixed bottom-24 md:bottom-6 right-4 z-[500] flex flex-col gap-2 items-end pointer-events-none">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold max-w-xs animate-[slideInRight_0.3s_ease-out] border ${
                        t.type === 'success' ? 'bg-green-900/90 border-green-500/30' :
                        t.type === 'error' ? 'bg-red-900/90 border-red-500/30' :
                        'bg-gray-900/90 border-white/10'
                    }`}
                    style={{ backdropFilter: 'blur(12px)' }}
                >
                    <span className="text-base flex-shrink-0">
                        {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
                    </span>
                    <span className="text-xs">{t.message}</span>
                    <button onClick={() => remove(t.id)} className="ml-1 text-white/40 hover:text-white/80 text-xs">✕</button>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
