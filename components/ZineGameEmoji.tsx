import React, { useState } from 'react';

const QUIZZES = [
    { symbols: "🥊 🏃‍♂️ ⚙️", answer: "FIGHTER", hint: "A teenage boxer with Down syndrome." },
    { symbols: "🚗 🛣️ 🤫", answer: "CROSSROADS", hint: "Post-dinner tensions expose secrets." },
    { symbols: "🍔 📅 💸", answer: "FOODIE CALL", hint: "Maya dates for free meals." },
    { symbols: "🌙 🚀 1902", answer: "A TRIP TO THE MOON", hint: "Classic silent film by Méliès." }
];

const ZineGameEmoji: React.FC = () => {
    const [index, setIndex] = useState(0);
    const [guess, setGuess] = useState('');
    const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');
    const [showHint, setShowHint] = useState(false);

    const current = QUIZZES[index];

    const handleCheck = (e: React.FormEvent) => {
        e.preventDefault();
        if (guess.toUpperCase().trim() === current.answer) {
            setStatus('success');
        } else {
            setStatus('fail');
            setTimeout(() => setStatus('idle'), 1500);
        }
    };

    const next = () => {
        setIndex((index + 1) % QUIZZES.length);
        setGuess('');
        setStatus('idle');
        setShowHint(false);
    };

    return (
        <div className="h-full flex flex-col justify-between space-y-6 relative z-10">
            <div>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🍿</span>
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-white italic">Emoji Cine-Quiz</h3>
                    </div>
                    <span className="text-[10px] font-black text-gray-700 bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase tracking-widest">Level {index + 1}</span>
                </div>

                <div className="text-center py-12 bg-white/5 border border-white/10 rounded-[2.5rem] shadow-inner mb-8 group relative">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[7px] font-black text-gray-800 uppercase tracking-[0.6em]">DECODE_SYMBOLS</div>
                    <p className="text-7xl group-hover:scale-110 transition-transform duration-700 drop-shadow-2xl">{current.symbols}</p>
                </div>
                
                {showHint && (
                    <div className="mb-6 p-4 bg-red-600/10 border border-red-500/20 rounded-xl animate-[fadeIn_0.3s_ease-out] text-center">
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Decryption Hint</p>
                        <p className="text-xs text-gray-300 italic">"{current.hint}"</p>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {status === 'success' ? (
                    <div className="space-y-4 animate-[fadeIn_0.4s_ease-out]">
                        <div className="bg-green-500/20 border border-green-500/50 p-6 rounded-2xl text-center">
                            <p className="text-green-400 font-black uppercase tracking-widest text-xs">Target Identified ✓</p>
                            <p className="text-xl font-bold text-white mt-1 uppercase tracking-tighter">{current.answer}</p>
                        </div>
                        <button onClick={next} className="w-full bg-white text-black font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Next Target →</button>
                    </div>
                ) : (
                    <form onSubmit={handleCheck} className="space-y-4">
                        <input 
                            type="text" 
                            value={guess}
                            onChange={e => setGuess(e.target.value)}
                            placeholder="FILM TITLE..."
                            className={`w-full bg-black/60 border-2 ${status === 'fail' ? 'border-red-500 animate-shake' : 'border-white/10'} rounded-2xl p-5 text-center font-black tracking-widest text-white focus:border-red-600 outline-none transition-all placeholder:text-gray-700 text-sm uppercase shadow-2xl`}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                type="button"
                                onClick={() => setShowHint(true)}
                                className="bg-white/5 border border-white/10 text-gray-500 hover:text-white font-black py-4 rounded-xl uppercase tracking-widest text-[10px] transition-all"
                            >
                                Request Hint
                            </button>
                            <button 
                                type="submit"
                                className="bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all"
                            >
                                Submit Identity
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="pt-6 border-t border-white/5 text-center">
                 <p className="text-[8px] font-black text-gray-800 uppercase tracking-[0.5em]">Global Cinematic Knowledge Engine</p>
            </div>
        </div>
    );
};

export default ZineGameEmoji;