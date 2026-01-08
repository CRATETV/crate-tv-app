import React, { useState } from 'react';

const ZinePuzzle: React.FC = () => {
    const [answer, setAnswer] = useState('');
    const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');
    const [showHelp, setShowHelp] = useState(false);

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
        <div className="h-full flex flex-col justify-between space-y-6 relative z-10">
            <div>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🧩</span>
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-white italic">Codebreaker</h3>
                    </div>
                    <button 
                        onClick={() => setShowHelp(!showHelp)}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all border ${showHelp ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'text-gray-500 border-white/10 hover:text-white bg-white/5'}`}
                    >
                        {showHelp ? 'Hide Intel' : 'How to Play'}
                    </button>
                </div>

                {showHelp ? (
                    <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-2xl animate-[fadeIn_0.3s_ease-out] mb-8">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Protocol: Mission Intelligence</p>
                        <ul className="text-sm text-gray-400 leading-relaxed font-medium space-y-3">
                            <li className="flex gap-3">
                                <span className="text-indigo-500 font-bold">01.</span>
                                <span>Analyze the weekly riddle carefully—it references specific films in the **Crate Catalog**.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-indigo-500 font-bold">02.</span>
                                <span>Navigate to the homepage or the **Cinema Stage** to inspect film synopses and director bios.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-indigo-500 font-bold">03.</span>
                                <span>The answer is a single word hidden within these metadata fields.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-indigo-500 font-bold">04.</span>
                                <span>Successful decryption unlocks an exclusive **Voucher Code** for rentals or merch.</span>
                            </li>
                        </ul>
                    </div>
                ) : (
                    <div className="bg-black/40 border border-white/5 p-8 rounded-3xl shadow-inner relative group mb-8">
                        <div className="absolute top-2 left-4 text-[7px] font-black text-gray-800 uppercase tracking-[0.4em]">ENCRYPTED_DATA_STREAM</div>
                        <p className="text-indigo-300 text-lg md:text-xl leading-relaxed font-bold italic group-hover:text-white transition-colors text-center">
                            "{riddle.question}"
                        </p>
                    </div>
                )}
            </div>

            {status === 'success' ? (
                <div className="bg-green-500/20 border border-green-500/50 p-8 rounded-[2rem] text-center animate-[fadeIn_0.5s_ease-out] shadow-[0_0_50px_rgba(34,197,94,0.1)]">
                    <p className="text-green-400 font-black uppercase tracking-widest text-xs mb-3">ACCESS_GRANTED 🔓</p>
                    <p className="text-4xl font-black text-white tracking-tighter italic mb-4 animate-chroma">PULSE_25</p>
                    <p className="text-gray-500 text-[9px] uppercase font-bold tracking-widest">Valid for any Master File rental this week.</p>
                </div>
            ) : (
                <form onSubmit={checkAnswer} className="space-y-4">
                    <input 
                        type="text" 
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        placeholder="INPUT DECRYPTION KEY..."
                        className={`w-full bg-black/60 border-2 ${status === 'fail' ? 'border-red-500 animate-shake' : 'border-white/10'} rounded-2xl p-5 text-center font-black tracking-[0.5em] text-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700 text-lg uppercase shadow-2xl`}
                    />
                    <button 
                        type="submit"
                        className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-xs hover:bg-indigo-400 transition-all active:scale-95 shadow-xl"
                    >
                        Execute Decryption ⚡
                    </button>
                </form>
            )}

            <div className="pt-6 border-t border-white/5 flex justify-between items-center text-[8px] font-black text-gray-800 uppercase tracking-[0.4em]">
                <span>Sector // Discovery</span>
                <span>Security Level // Pro</span>
            </div>
        </div>
    );
};

export default ZinePuzzle;