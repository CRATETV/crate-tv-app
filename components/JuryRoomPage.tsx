import React, { useState, useEffect, useMemo } from 'react';
import { MoviePipelineEntry, JuryVerdict } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import Header from './Header';
import Footer from './Footer';
import SEO from './SEO';
import LoadingSpinner from './LoadingSpinner';
import BottomNavBar from './BottomNavBar';
import SquarePaymentModal from './SquarePaymentModal';

const ScanlineOverlay: React.FC = () => (
    <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
    </div>
);

const JuryRoomPage: React.FC = () => {
    const { user, hasJuryPass, grantJuryPass } = useAuth();
    const { pipeline, isLoading: isFestLoading } = useFestival();
    
    const [selectedFilm, setSelectedFilm] = useState<MoviePipelineEntry | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingVerdicts, setExistingVerdicts] = useState<Record<string, JuryVerdict>>({});
    
    // Guest Adjudicator State
    const [guestEmail, setGuestEmail] = useState(() => localStorage.getItem('crate_guest_jury_email') || '');
    const [hasGuestPass, setHasGuestPass] = useState(() => localStorage.getItem('crate_guest_jury_active') === 'true');

    // Scoring State
    const [scores, setScores] = useState({ narrative: 5, technique: 5, impact: 5 });
    const [comment, setComment] = useState('');

    const effectivePass = useMemo(() => hasJuryPass || hasGuestPass, [hasJuryPass, hasGuestPass]);
    const effectiveEmail = useMemo(() => user?.email || guestEmail, [user, guestEmail]);
    const effectiveId = useMemo(() => user?.uid || `guest_${effectiveEmail.replace(/[^a-zA-Z0-9]/g, '_')}`, [user, effectiveEmail]);

    useEffect(() => {
        const db = getDbInstance();
        if (!db || !effectiveId) return;
        const unsub = db.collection('guest_judging')
            .where('userId', '==', effectiveId)
            .onSnapshot(snap => {
                const verdicts: Record<string, JuryVerdict> = {};
                snap.forEach(doc => {
                    const data = doc.data();
                    verdicts[data.filmId] = data as JuryVerdict;
                });
                setExistingVerdicts(verdicts);
            });
        return () => unsub();
    }, [effectiveId]);

    const handleSelectFilm = (film: MoviePipelineEntry) => {
        setSelectedFilm(film);
        const prev = existingVerdicts[film.id];
        if (prev) {
            setScores({ narrative: prev.narrative, technique: prev.technique, impact: prev.impact });
            setComment(prev.comment);
        } else {
            setScores({ narrative: 5, technique: 5, impact: 5 });
            setComment('');
        }
        window.scrollTo(0, 0);
    };

    const handlePaymentSuccess = async (details: any) => {
        if (user) {
            await grantJuryPass();
        } else {
            const email = details.email || 'guest@cratetv.net';
            setGuestEmail(email);
            setHasGuestPass(true);
            localStorage.setItem('crate_guest_jury_email', email);
            localStorage.setItem('crate_guest_jury_active', 'true');
        }
        setIsPaymentModalOpen(false);
    };

    const handleSubmitVerdict = async () => {
        if (!selectedFilm || !effectiveEmail) return;
        setIsSubmitting(true);
        const db = getDbInstance();
        if (db) {
            await db.collection('guest_judging').doc(`${effectiveId}_${selectedFilm.id}`).set({
                userId: effectiveId,
                userName: user?.name || `Adjudicator (${effectiveEmail.split('@')[0]})`,
                filmId: selectedFilm.id,
                filmTitle: selectedFilm.title,
                ...scores,
                comment,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("Verdict synchronized with Crate Academy database.");
            setSelectedFilm(null);
        }
        setIsSubmitting(false);
    };

    const handleMemberLogin = () => {
        window.history.pushState({}, '', '/login?redirect=/jury');
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleConvertAccount = () => {
        window.history.pushState({}, '', `/login?view=signup&email=${encodeURIComponent(guestEmail)}&redirect=/jury`);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isFestLoading) return <LoadingSpinner />;

    if (!effectivePass) {
        return (
            <div className="min-h-screen bg-[#000] text-white flex flex-col selection:bg-emerald-500 selection:text-black">
                <SEO title="Become a 2026 Season Judge" description="Join the Grand Jury for the 2026 Crate TV Film Festival." />
                <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
                
                <main className="flex-grow flex flex-col items-center justify-center p-6 text-center relative overflow-hidden pt-32 pb-24">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-emerald-600/10 blur-[180px] pointer-events-none rounded-full"></div>
                    
                    <div className="relative z-10 max-w-4xl space-y-12 animate-[fadeIn_1.2s_ease-out]">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-3 bg-emerald-600/10 border border-emerald-500/20 px-6 py-2 rounded-full shadow-2xl">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                                <p className="text-emerald-500 font-black uppercase tracking-[0.4em] text-[10px]">2026 Session Recruitment</p>
                            </div>
                            <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter italic leading-[0.8] text-white drop-shadow-[0_10px_40px_rgba(0,0,0,1)]">
                                2026 Season.<br/>
                                <span className="text-emerald-500">All Access.</span>
                            </h1>
                            <p className="text-gray-400 text-xl md:text-2xl leading-relaxed font-medium max-w-2xl mx-auto drop-shadow-lg">
                                Join the **2026 Grand Jury** for a contribution of **$25.00**. You will receive judge's credentials for all current year submissions and unlock **unrestricted catalog access for the entire 2026 cycle.**
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-6 pt-8">
                            <button 
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="group relative bg-white text-black font-black px-16 py-8 rounded-[2rem] text-2xl md:text-3xl uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-[0_30px_80px_rgba(16,185,129,0.2)] overflow-hidden"
                            >
                                <span className="relative z-10">Get 2026 Season Pass // $25</span>
                                <div className="absolute inset-0 bg-emerald-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-10"></div>
                            </button>
                            
                            <div className="flex items-center gap-6">
                                <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.4em]">Direct Access</p>
                                <div className="w-px h-4 bg-white/10"></div>
                                <button 
                                    onClick={handleMemberLogin}
                                    className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.4em] hover:text-white transition-colors"
                                >
                                    Member? Sign In
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20">
                            {[
                                { label: '2026 Judging Rights', desc: 'Watch and score films currently in the 2026 submission pipeline before they are released.' },
                                { label: 'Season Catalog', desc: 'Enjoy full streaming of the entire public Crate TV catalog for the duration of the 2026 season.' },
                                { label: 'Infrastructure Support', desc: 'Your $25 directly funds the 2026 Excellence Grants and platform bandwidth for indie artists.' }
                            ].map((feature, i) => (
                                <div key={i} className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl text-left hover:border-emerald-500/20 transition-all group">
                                    <h4 className="text-emerald-500 font-black uppercase tracking-widest text-xs mb-3 group-hover:translate-x-2 transition-transform">0{i+1}. {feature.label}</h4>
                                    <p className="text-gray-500 text-sm font-medium leading-relaxed">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                <Footer />
                <BottomNavBar onSearchClick={() => window.location.href='/'} />

                {isPaymentModalOpen && (
                    <SquarePaymentModal 
                        paymentType="juryPass" 
                        onClose={() => setIsPaymentModalOpen(false)} 
                        onPaymentSuccess={handlePaymentSuccess} 
                    />
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#030803] text-emerald-500 font-mono selection:bg-emerald-500 selection:text-black relative">
            <SEO title="Grand Jury Terminal" description="Restricted access for Crate Academy adjudicators." />
            <ScanlineOverlay />
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            <main className="flex-grow pt-24 pb-32 px-4 md:px-12 relative z-10">
                <div className="max-w-[1600px] mx-auto space-y-16">
                    
                    {/* Guest Persistance Notice */}
                    {hasGuestPass && !user && (
                        <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 animate-[slideInUp_0.6s_ease-out]">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                                <div>
                                    <p className="text-amber-500 font-black uppercase text-[10px] tracking-widest">Guest Node Session</p>
                                    <p className="text-gray-400 text-xs font-medium">Your 2026 Pass is tied to this browser. Link an account to ensure it follows you across devices.</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleConvertAccount}
                                className="bg-amber-500 text-black font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest hover:bg-amber-400 transition-all shadow-xl"
                            >
                                Secure Pass with Account
                            </button>
                        </div>
                    )}

                    <div className="border-b border-emerald-900/30 pb-10 flex flex-col md:flex-row justify-between items-end gap-6">
                        <div>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-800">Terminal Uplink: 2026 Active</span>
                            </div>
                            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic text-emerald-400 leading-none">Jury Room.</h1>
                        </div>
                        <div className="text-right hidden md:block">
                             <p className="text-[9px] font-black uppercase tracking-widest text-emerald-900">Season Contribution</p>
                             <p className="text-2xl font-bold text-emerald-600">$25.00 // 2026_CYCLE</p>
                        </div>
                    </div>

                    {!selectedFilm ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                            {pipeline.filter(f => f.status === 'pending').map(film => (
                                <div 
                                    key={film.id}
                                    onClick={() => handleSelectFilm(film)}
                                    className="bg-black/60 border border-emerald-900/10 p-4 rounded-[2rem] hover:border-emerald-500/40 transition-all cursor-pointer group relative overflow-hidden flex flex-col shadow-2xl"
                                >
                                    <div className="aspect-[2/3] rounded-2xl overflow-hidden mb-6 border border-emerald-900/20 shadow-2xl relative">
                                        <img src={film.posterUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 opacity-40 group-hover:opacity-80" alt="" />
                                        {existingVerdicts[film.id] && (
                                            <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center backdrop-blur-[2px]">
                                                <div className="bg-emerald-500 text-black font-black px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest shadow-2xl border-2 border-black/10">Verdict Synced ✓</div>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                                    </div>
                                    <div className="px-2 pb-2">
                                        <h3 className="text-xl font-black uppercase tracking-tight text-emerald-400 group-hover:text-emerald-300 transition-colors truncate">{film.title}</h3>
                                        <p className="text-[10px] font-bold text-emerald-900 uppercase mt-2">ID: {film.id.substring(0,8)}</p>
                                    </div>
                                    <div className="mt-auto pt-6 px-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Open Manifest →</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="animate-[fadeIn_0.5s_ease-out] space-y-12 pb-24">
                            <button onClick={() => setSelectedFilm(null)} className="text-[11px] font-black uppercase tracking-widest text-emerald-800 hover:text-emerald-400 transition-colors flex items-center gap-3">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Return to Pipeline Manifest
                            </button>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                                <div className="lg:col-span-8 space-y-10">
                                    <div className="aspect-video bg-black rounded-[3.5rem] overflow-hidden border border-emerald-900/20 relative group shadow-[0_40px_120px_rgba(0,0,0,1)]">
                                        <video 
                                            src={selectedFilm.movieUrl} 
                                            controls 
                                            className="w-full h-full" 
                                            controlsList="nodownload" 
                                            autoPlay
                                        />
                                    </div>
                                    <div className="bg-black/40 border border-emerald-900/10 p-12 rounded-[3.5rem] space-y-6 shadow-inner">
                                        <div className="flex items-center gap-4">
                                            <h2 className="text-4xl font-black text-emerald-400 uppercase tracking-tighter italic leading-none">{selectedFilm.title}</h2>
                                            <span className="bg-emerald-900/20 text-emerald-700 px-3 py-1 rounded text-[8px] font-black uppercase">Review Mode: 2026</span>
                                        </div>
                                        <p className="text-emerald-800 text-xl leading-relaxed font-medium">"{selectedFilm.synopsis}"</p>
                                    </div>
                                </div>

                                <div className="lg:col-span-4 space-y-10">
                                    <div className="bg-black border border-emerald-500/20 p-10 rounded-[3.5rem] shadow-[0_20px_80px_rgba(0,0,0,1)] space-y-12">
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black uppercase tracking-tighter text-emerald-500 italic">Official Verdict</h3>
                                            <p className="text-[9px] text-emerald-900 font-black uppercase tracking-widest">Input curatorial metrics for this entry</p>
                                        </div>
                                        
                                        <div className="space-y-10">
                                            {[
                                                { id: 'narrative', label: 'Narrative Strength' },
                                                { id: 'technique', label: 'Technical Execution' },
                                                { id: 'impact', label: 'Emotional Trajectory' }
                                            ].map(cat => (
                                                <div key={cat.id} className="space-y-4">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-emerald-900">
                                                        <span>{cat.label}</span>
                                                        <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{scores[cat.id as keyof typeof scores]}/10</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="1" max="10" step="1" 
                                                        value={scores[cat.id as keyof typeof scores]} 
                                                        onChange={e => setScores({...scores, [cat.id]: parseInt(e.target.value)})}
                                                        className="w-full h-1.5 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-900">Confidential Observations</label>
                                            <textarea 
                                                value={comment}
                                                onChange={e => setComment(e.target.value)}
                                                className="w-full bg-[#050505] border border-emerald-900/30 rounded-2xl p-5 text-emerald-300 text-sm focus:border-emerald-500 outline-none h-40 resize-none font-medium leading-relaxed shadow-inner"
                                                placeholder="Provide specific aesthetic feedback for the selection committee..."
                                            />
                                        </div>

                                        <button 
                                            onClick={handleSubmitVerdict}
                                            disabled={isSubmitting}
                                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-6 rounded-2xl uppercase tracking-[0.2em] text-xs shadow-[0_0_40px_rgba(16,185,129,0.2)] transition-all transform active:scale-95 disabled:opacity-20"
                                        >
                                            {isSubmitting ? 'SYNCHRONIZING_VERDICT...' : 'COMMIT OFFICIAL VERDICT'}
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-emerald-950 uppercase font-black tracking-widest text-center px-10 leading-loose">
                                        NOTICE: All scoring activity is logged for the 2026 selection audit.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
            <BottomNavBar onSearchClick={() => window.location.href='/'} />
        </div>
    );
};

export default JuryRoomPage;