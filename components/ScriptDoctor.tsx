import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const ScriptDoctor: React.FC = () => {
    const [text, setText] = useState('');
    const [title, setTitle] = useState('');
    const [analysis, setAnalysis] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleAnalyze = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/generate-script-doctor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptText: text, title, password: 'cratebio' }),
            });
            const data = await res.json();
            setAnalysis(data);
        } catch (e) {
            alert("Analysis failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-black/40 border border-white/10 p-8 rounded-[2rem] space-y-6">
            <div className="flex items-center gap-4">
                <span className="text-3xl bg-red-600/20 p-3 rounded-2xl">🩺</span>
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">AI Script Doctor</h2>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Advanced Narrative & Market Analysis</p>
                </div>
            </div>

            {!analysis ? (
                <div className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="Project Working Title" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)}
                        className="form-input bg-white/5 border-white/10"
                    />
                    <textarea 
                        placeholder="Paste your script snippet or treatment here (min 500 words recommended)..." 
                        value={text} 
                        onChange={e => setText(e.target.value)}
                        className="form-input h-64 bg-white/5 border-white/10"
                    />
                    <button 
                        onClick={handleAnalyze}
                        disabled={isLoading || !text}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl uppercase tracking-widest transition-all disabled:opacity-20"
                    >
                        {isLoading ? 'Scanning Narrative...' : 'Consult the Doctor'}
                    </button>
                </div>
            ) : (
                <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                    <div className="grid grid-cols-3 gap-4">
                        {Object.entries(analysis.scores).map(([key, val]: any) => (
                            <div key={key} className="bg-white/5 p-4 rounded-xl text-center">
                                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">{key}</p>
                                <p className="text-2xl font-black text-red-500">{val}/10</p>
                            </div>
                        ))}
                    </div>
                    
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Doctor's Orders</h4>
                        <ul className="space-y-2">
                            {analysis.critique.map((c: string, i: number) => (
                                <li key={i} className="text-sm text-gray-400 flex gap-3"><span className="text-red-600">●</span> {c}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-xl">
                        <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-2">Market Sentiment</h4>
                        <p className="text-sm text-gray-300 italic">"{analysis.marketFit}"</p>
                    </div>

                    <button onClick={() => setAnalysis(null)} className="text-xs text-gray-500 hover:text-white underline">New Consultation</button>
                </div>
            )}
        </div>
    );
};

export default ScriptDoctor;