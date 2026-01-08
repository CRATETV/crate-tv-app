import React, { useState } from 'react';

const ZinePuzzle: React.FC = () => {
    const [answer, setAnswer] = useState('');
    const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');

    // Weekly Riddle Logic
    const riddle = {
        question: "A boxer's ring, a sibling's drive, in a world where time devices thrive. What is the permanent record of the underground?",
        solution: "CRATE"
    };

    const checkAnswer = (e: React.FormEvent) => {
        e.preventDefault();
        if (answer.toUpperCase().trim() === riddle.solution) {
            setStatus('success');
        } else {
            setStatus('fail');
            setTimeout(() => setStatus('idle'), 2000);
        }
    };

    return (
        <div className="h-full flex flex-col justify-between space-y-8 relative z-10">
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <span className="text-3xl">🧩</span>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-white italic">The Codebreaker</h3>
                </div>
                <p className="text-indigo-200 text-lg leading-relaxed font-bold italic mb-8 group-hover:text-white transition-colors">
                    "{riddle.question}"
                </p>
            </div>

            {status === 'success' ? (
                <div className="bg-green-500/20 border border-green-500/50 p-6 rounded-2xl text-center animate-[fadeIn_0.5s_ease-out]">
                    <p className="text-green-400 font-black uppercase tracking-widest text-sm mb-2">Access Granted! 🔓</p>
                    <p className="text-white font-bold">VOUCHER: ZINE_PULSE_2025</p>
                </div>
            ) : (
                <form onSubmit={checkAnswer} className="space-y-4">
                    <input 
                        type="text" 
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        placeholder="DECRYPT CODE..."
                        className={`w-full bg-black/60 border-2 ${status === 'fail' ? 'border-red-500 animate-shake' : 'border-white/10'} rounded-2xl p-4 text-center font-black tracking-[0.5em] text-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700`}
                    />
                    <button 
                        type="submit"
                        className="w-full bg-white text-black font-black py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-indigo-400 transition-all active:scale-95 shadow-xl"
                    >
                        Execute Decryption ⚡
                    </button>
                </form>
            )}

            <div className="pt-6 border-t border-indigo-500/20">
                <p className="text-[9px] font-black uppercase text-indigo-400/60 tracking-[0.4em]">Sector Discovery // Weekly Reward Active</p>
            </div>
        </div>
    );
};

export default ZinePuzzle;