import React, { useEffect } from 'react';

interface SaveStatusToastProps {
    message: string;
    isError: boolean;
    onClose: () => void;
}

const SaveStatusToast: React.FC<SaveStatusToastProps> = ({ message, isError, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Auto-dismiss after 5 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = isError ? 'bg-red-600' : 'bg-green-600';
    const icon = isError ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    return (
        <div 
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 ${bgColor} text-white font-bold py-3 px-6 rounded-lg shadow-2xl z-50 animate-[slideInUp_0.5s_ease-out]`}
            role="alert"
        >
            {icon}
            <span>{message}</span>
            <button onClick={onClose} className="ml-4 text-white/70 hover:text-white">&times;</button>
        </div>
    );
};

export default SaveStatusToast;