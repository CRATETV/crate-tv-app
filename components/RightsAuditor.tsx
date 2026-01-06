import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface AuditResult {
    title: string;
    director: string;
    year: string;
    status: 'RESTRICTED' | 'ELIGIBLE' | 'ACQUISITION_TARGET';
    licenseType: string;
    rightsHolder: string;
    explanation: string;
    sources: { title: string; url: string }[];
}

const RightsAuditor: React.FC = () => {
    const [title, setTitle] = useState('');
    const [isAuditing, setIsAuditing] = useState(false);
    const [result, setResult] = useState<AuditResult | null>(null);
    const [error, setError] = useState('');

    const handleAudit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsAuditing(true);
        setError('');
        setResult(null);

        try {
            const res = await fetch('/api/audit-rights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password: sessionStorage.getItem('adminPassword'),
                    title: title.trim() 
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Audit failed.');
            setResult(data.audit);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Legal core unreachable.');
        } finally {
            setIsAuditing(false);
        }
    };

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px]">Crate Rights Auditor</p>
                    </div>
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic mb-4">License Verification</h2>
                    <p className="text-xl text-gray-400 font-medium leading-relaxed mb-10">Deep-search any film title to determine its legal distribution status. Grounded AI analysis for acquisitions.</p>
                    
                    <form onSubmit={handleAudit} className="flex gap-4">
                        <input 
                            type="text" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            placeholder="Enter film title (e.g. Trophy Boy)..." 
                            className="form-input !bg-black/40 border-white/10 flex-grow text-xl"
                            required
                        />
                        <button 
                            type="submit" 
                            disabled={isAuditing}
                            className="bg-white text-black font-black px-10 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl transition-all hover:bg-red-600 hover:text-white disabled:opacity-30"
                        >
                            {isAuditing ? 'Auditing...' : 'Run Audit'}
                        </button>
                    </form>
                </div>
            </div>

            {isAuditing && (
                <div className="py-24 flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-red-600/20 rounded-full"></div>
                        <div className="absolute inset-0 w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-red-500 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Consulting Global Intellectual Property Records...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-600/10 border border-red-500/20 p-8 rounded-3xl text-center">
                    <p className="text-red-500 font-black uppercase tracking-widest text-sm">{error}</p>
                </div>
            )}

            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fadeIn_0.8s_ease-out]">
                    <div className="lg:col-span-2 bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">{result.title}</h3>
                                <p className="text-gray-500 text-sm font-bold mt-2 uppercase tracking-widest">Directed by {result.director} // {result.year}</p>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl ${
                                result.status === 'ELIGIBLE' ? 'bg-green-600 text-white' : 
                                result.status === 'ACQUISITION_TARGET' ? 'bg-amber-500 text-black' : 
                                'bg-red-600 text-white'
                            }`}>
                                {result.status.replace('_', ' ')}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-8 py-8 border-y border-white/5">
                            <div>
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">License Model</p>
                                <p className="text-white font-bold text-lg uppercase tracking-tight">{result.licenseType}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Primary Rights Holder</p>
                                <p className="text-white font-bold text-lg uppercase tracking-tight">{result.rightsHolder}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Legal Analysis</p>
                            <p className="text-gray-300 text-lg leading-relaxed font-medium italic">"{result.explanation}"</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-xl">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Verification Sources</h4>
                            <div className="space-y-4">
                                {result.sources.map((s, i) => (
                                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block p-4 bg-black/40 border border-white/5 rounded-xl hover:border-red-500/30 transition-all group">
                                        <p className="text-white font-bold text-xs group-hover:text-red-500 transition-colors uppercase truncate">{s.title}</p>
                                        <p className="text-[9px] text-gray-600 mt-1 font-mono truncate">{s.url}</p>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RightsAuditor;