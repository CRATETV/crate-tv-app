import React, { useState } from 'react';

const REACTION_EMOJIS = ['🔥', '🎬', '💎', '🚀', '🧠', '✨'];

const ZineSentiment: React.FC = () => {
    const [bursts, setBursts] = useState<{ id: number; emoji: string; left: number }[]>([]);

    const triggerBurst = (emoji: string) => {
        const id = Date.now();
        const left = Math.random() * 80 + 10;
        setBursts(prev => [...prev, { id, emoji, left }]);
        setTimeout(() => {
            setBursts(prev => prev.filter(b => b.id !== id));
        }, 2000);
    };

    return (
        <div className="relative">
            <div className="flex gap-2 p-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                {REACTION_EMOJIS.map(emoji => (
                    <button 
                        key={emoji}
                        onClick={() => triggerBurst(emoji)}
                        className="w-10 h-10 flex items-center justify-center text-xl hover:scale-125 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
            
            {/* Burst Container */}
            <div className="absolute bottom-full left-0 right-0 h-[300px] pointer-events-none overflow-hidden">
                {bursts.map(b => (
                    <div 
                        key={b.id}
                        className="absolute bottom-0 text-4xl animate-zine-burst"
                        style={{ left: `${b.left}%` }}
                    >
                        {b.emoji}
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes zineBurst {
                    0% { transform: translateY(0) scale(0.5) rotate(0deg); opacity: 0; }
                    20% { opacity: 1; transform: translateY(-40px) scale(1.2) rotate(10deg); }
                    100% { transform: translateY(-300px) scale(0.8) rotate(-20deg); opacity: 0; }
                }
                .animate-zine-burst {
                    animation: zineBurst 2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default ZineSentiment;