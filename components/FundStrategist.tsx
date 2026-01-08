import React, { useState, useMemo } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface FundingLink {
    name: string;
    type: string;
    desc: string;
    url: string;
    priority: string;
    color: string;
    badge: string;
    steps: string[];
    lever?: string;
}

const DIRECT_LINKS: FundingLink[] = [
    {
        name: 'Microsoft Founders Hub',
        type: 'TECH_AUTOMATIC',
        desc: 'Up to $150k in Azure credits + $2,500 OpenAI credits. Historically high approval for active platforms.',
        url: 'https://foundershub.startups.microsoft.com/signup',
        priority: 'URGENT',
        color: 'text-blue-400',
        badge: 'Credits',
        steps: [
            "Sign up using a LinkedIn profile (ensure your title is Founder/Developer).",
            "Fill in the 'Company Narrative' using the AI Proposal generator below.",
            "In the 'Funding' section, select 'Bootstrapped' but mention your AWS Activate win.",
            "Submit for the 'Ideate' level (instant approval) and scale to 'Develop' once active."
        ],
        lever: "Mentioning the AWS win proves technical pedigree to Microsoft reviewers."
    },
    {
        name: 'Google Cloud Spark',
        type: 'TECH_AUTOMATIC',
        desc: 'Up to $2,000 in credits for the first year. Use to offset Firebase and CDN costs immediately.',
        url: 'https://cloud.google.com/startup/apply',
        priority: 'HIGH',
        color: 'text-green-400',
        badge: 'Automatic',
        steps: [
            "Create a Google Cloud Project for Crate TV if one doesn't exist.",
            "Apply via the 'Cloud Startup Portal' using your official cratetv.net email.",
            "Focus on 'Media & Entertainment' as your primary industry sector.",
            "Approval typically takes 3-5 business days."
        ]
    },
    {
        name: 'Amber Grant for Women',
        type: 'MONTHLY_ROLLING',
        desc: '$10,000 awarded every month. Straightforward narrative application. Strong fit for Crate leadership.',
        url: 'https://ambergrantsforwomen.com/get-an-amber-grant/',
        priority: 'ROLLING',
        color: 'text-pink-500',
        badge: 'Active',
        steps: [
            "Pay the $15 application fee (consider it a strategic marketing cost).",
            "Tell the story of why you started Crate TV (The 'Lifeboat for Indie Film' narrative).",
            "Explain how the $10,000 will be used to pay filmmakers in the 70/30 loop.",
            "Submit by the end of the current month for immediate consideration."
        ],
        lever: "Focus heavily on the 'Economic Impact' for independent artists."
    },
    {
        name: 'The Velocity Fund',
        type: 'PHILLY_LOCAL',
        desc: '$5,000 grants specifically for Philadelphia-based artists and experimental media distribution.',
        url: 'https://velocityfund.org/apply/',
        priority: 'LOCAL',
        color: 'text-amber-500',
        badge: 'High Prob',
        steps: [
            "Register as a Philadelphia-based artist/entity.",
            "Submit the Crate TV Roku screenshots as proof of 'Experimental Distribution'.",
            "Highlight the partnership with local Philly creators.",
            "Attend the info session (usually Feb/March) to build a relationship with the directors."
        ]
    }
];

const FUND_TIMELINES: Record<string, { start: string; end: string; cycle: string; probability: 'High' | 'Medium' | 'Strategic' }> = {
    'Philadelphia Cultural Fund (ACS Grant)': {
        start: '2025-09-15',
        end: '2025-11-01',
        cycle: '2026 Art Culture Service Cycle',
        probability: 'High'
    },
    'Independence Public Media Foundation (Philly)': {
        start: '2025-03-01',
        end: '2025-05-15',
        cycle: 'Spring 2025 Media Innovation',
        probability: 'High'
    },
    'The Velocity Fund (Philly Micro-Grants)': {
        start: '2025-04-01',
        end: '2025-06-15',
        cycle: 'Spring 2025 Portfolio Cycle',
        probability: 'High'
    }
};

const FundStrategist: React.FC = () => {
    const [fundName, setFundName] = useState('Independence Public Media Foundation (Philly)');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [strategy, setStrategy] = useState('');
    const [error, setError] = useState('');
    const [selectedBrief, setSelectedBrief] = useState<FundingLink | null>(null);

    const timeline = FUND_TIMELINES[fundName];
    
    const windowStatus = useMemo(() => {
        if (!timeline) return { label: 'OPEN_ENROLLMENT', color: 'text-green-500', isClosed: false };
        const now = new Date();
        const start = new Date(timeline.start);
        const end = new Date(timeline.end);
        
        if (now < start) return { label: 'WINDOW_LOCKED // PREP_PHASE', color: 'text-amber-500', isClosed: true };
        if (now > end) return { label: 'WINDOW_EXPIRED // POST_MORTEM', color: 'text-red-500', isClosed: true };
        return { label: 'WINDOW_ACTIVE // DISPATCH_READY', color: 'text-green-500', isClosed: false };
    }, [fundName, timeline]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fundName.trim()) return;

        setIsAnalyzing(true);
        setError('');
        setStrategy('');

        try {
            const res = await fetch('/api/generate-fund-strategy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password: sessionStorage.getItem('adminPassword'),
                    fundName: fundName.trim(),
                    isClosed: windowStatus.isClosed
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Strategy synthesis failed.');
            setStrategy(data.strategy);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Institutional core unreachable.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-16 animate-[fadeIn_0.5s_ease-out] pb-32">
            {/* Sector Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-500/20 px-4 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                    <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[9px]">Resource Acquisition Engine</p>
                </div>
                <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-white">Fund <span className="text-red-600">Strategist.</span></h1>
                <p className="text-gray-500 font-medium max-w-2xl mx-auto text-lg leading-relaxed">
                    Identify and secure high-probability funding vectors. Target automatic credits or Philly-specific arts grants.
                </p>
            </div>

            {/* Direct Links Grid */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest italic">Direct Portals</h2>
                        <div className="h-px w-24 bg-white/5"></div>
                    </div>
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Select an acquisition target</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {DIRECT_LINKS.map(link => (
                        <div key={link.name} className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-between group hover:border-white/20 transition-all shadow-2xl relative overflow-hidden h-full">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            
                            <div className="space-y-6 relative z-10">
                                <div className="flex justify-between items-start">
                                    <span className={`text-[8px] font-black uppercase tracking-[0.4em] ${link.color}`}>{link.type.replace('_', ' ')}</span>
                                    <span className="bg-white/5 text-gray-500 font-black text-[7px] px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-widest">{link.badge}</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter text-white leading-tight">{link.name}</h3>
                                    <p className="text-gray-400 text-xs mt-3 leading-relaxed font-medium line-clamp-3 italic">"{link.desc}"</p>
                                </div>
                            </div>

                            <div className="mt-8 space-y-3 relative z-10">
                                <button 
                                    onClick={() => setSelectedBrief(link)}
                                    className="w-full block text-center font-black py-3 rounded-xl uppercase tracking-widest text-[9px] bg-white/5 text-white border border-white/10 hover:bg-white hover:text-black transition-all shadow-xl"
                                >
                                    View Mission Brief
                                </button>
                                <a 
                                    href={link.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`w-full block text-center font-black py-4 rounded-xl uppercase tracking-widest text-[9px] shadow-xl transition-all active:scale-95 ${link.priority === 'URGENT' ? 'bg-red-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
                                >
                                    Open Portal
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Proposal Section */}
            <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none rotate-12">
                    <svg className="w-48 h-48 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                </div>
                
                <div className="relative z-10 max-w-3xl">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_red]"></span>
                        <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px]">AI Narrative Synthesis</p>
                    </div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic mb-4">Draft Your Proposal</h2>
                    <p className="text-gray-400 font-medium leading-relaxed mb-10">Select a target organization and let Gemini synthesize a high-stakes proposal aligned with their specific 2025 values.</p>
                    
                    <form onSubmit={handleGenerate} className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <select 
                                value={fundName} 
                                onChange={e => setFundName(e.target.value)}
                                className="form-input !bg-black/40 border-white/10 text-lg flex-grow"
                            >
                                <optgroup label="Philadelphia High Probability">
                                    <option value="Philadelphia Cultural Fund (ACS Grant)">Philadelphia Cultural Fund (ACS)</option>
                                    <option value="Independence Public Media Foundation (Philly)">Independence Public Media (IPMF)</option>
                                    <option value="The Velocity Fund (Philly Micro-Grants)">The Velocity Fund ($5k Micro)</option>
                                </optgroup>
                                <optgroup label="National Strategic">
                                    <option value="Epic Games (Epic MegaGrants)">Epic MegaGrants 2026</option>
                                    <option value="Amber Grant for Women (Monthly)">Amber Grant (Rolling Monthly)</option>
                                </optgroup>
                            </select>
                            <button type="submit" disabled={isAnalyzing} className="bg-white text-black font-black px-10 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl transition-all hover:bg-red-600 hover:text-white disabled:opacity-30 whitespace-nowrap">
                                {isAnalyzing ? 'Mapping...' : 'Synthesize Pitch'}
                            </button>
                        </div>
                    </form>

                    {timeline && (
                        <div className="mt-8 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] animate-[fadeIn_0.5s_ease-out] relative">
                            {timeline.probability === 'High' && (
                                <div className="absolute -top-3 left-8 bg-green-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">High Probability Target</div>
                            )}
                            <div className="flex justify-between items-center mb-6">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{timeline.cycle}</p>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${windowStatus.color}`}>{windowStatus.label}</p>
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                <div className="flex gap-10">
                                    <div>
                                        <p className="text-[8px] font-black text-gray-700 uppercase mb-1">Window Opens</p>
                                        <p className="text-white font-bold text-lg">{new Date(timeline.start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                    <div className="h-8 w-px bg-white/10"></div>
                                    <div>
                                        <p className="text-[8px] font-black text-gray-700 uppercase mb-1">Window Closes</p>
                                        <p className="text-white font-bold text-lg">{new Date(timeline.end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Mission Brief Modal */}
            {selectedBrief && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[150] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={() => setSelectedBrief(null)}>
                    <div className="bg-[#111] border border-white/10 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Mission Brief: {selectedBrief.name}</h2>
                                <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-1">Application Roadmap V1.0</p>
                            </div>
                            <button onClick={() => setSelectedBrief(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-10 space-y-10">
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.4em]">Step-by-Step Execution</h4>
                                <div className="space-y-4">
                                    {selectedBrief.steps.map((step, i) => (
                                        <div key={i} className="flex gap-4 group">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600/10 border border-red-600/30 text-red-500 font-black text-[10px] flex items-center justify-center">0{i+1}</span>
                                            <p className="text-gray-300 text-sm leading-relaxed font-medium group-hover:text-white transition-colors">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {selectedBrief.lever && (
                                <div className="p-6 bg-red-600/10 border border-red-500/20 rounded-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                        <svg className="w-12 h-12 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    </div>
                                    <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Strategic Lever (High Priority)</h4>
                                    <p className="text-sm text-gray-200 font-bold italic leading-relaxed">"{selectedBrief.lever}"</p>
                                </div>
                            )}

                            <button 
                                onClick={() => { window.open(selectedBrief.url, '_blank'); setSelectedBrief(null); }}
                                className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-sm shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3"
                            >
                                Initiate Uplink
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </button>
                        </div>
                        <div className="p-6 bg-black/40 border-t border-white/5 text-center">
                            <p className="text-[8px] font-black text-gray-700 uppercase tracking-[0.3em]">Authorized Strategic Advisory // Sector 7</p>
                        </div>
                    </div>
                </div>
            )}

            {isAnalyzing && (
                <div className="py-24 flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-red-600/20 rounded-full"></div>
                        <div className="absolute inset-0 w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-red-500 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Consulting Institutional Records...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-600/10 border border-red-500/20 p-8 rounded-3xl text-center">
                    <p className="text-red-500 font-black uppercase tracking-widest text-sm">{error}</p>
                </div>
            )}

            {strategy && (
                <div className="bg-white/5 border border-white/10 p-8 md:p-12 rounded-[3.5rem] shadow-2xl space-y-8 animate-[fadeIn_0.8s_ease-out]">
                    <div className="flex justify-between items-center border-b border-white/5 pb-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Proposal Draft Manifest</h3>
                        <button onClick={() => { navigator.clipboard.writeText(strategy); alert('Pitch copied.'); }} className="text-red-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Copy to Clipboard</button>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap font-serif text-lg text-gray-300 leading-relaxed bg-black/40 p-8 rounded-3xl border border-white/5 shadow-inner">
                            {strategy}
                        </pre>
                    </div>
                    
                    <div className="bg-red-600/5 p-6 rounded-2xl border border-red-500/10">
                        <p className="text-xs text-red-500 font-bold leading-relaxed uppercase tracking-widest">
                            Strategic Insight: This draft leverages Crate's existing AWS Activate win as proof of technical pedigree to build trust with {fundName}.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FundStrategist;