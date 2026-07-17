
import React, { useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import BottomNavBar from './BottomNavBar';

// Was a live page with exactly one product (a single tee linking out to an
// external store) — sparse enough that it read as unfinished rather than
// "not open yet." Replaced with an actual "Coming Soon" announcement in the
// same dramatic, single-focal-point spirit as Netflix's premiere reveal
// cards: dark, minimal, one bold idea on screen at a time. The email
// capture reuses the same /api/subscribe-newsletter endpoint the Zine page
// already uses, so a "notify me" list actually gets built in the meantime.
const MerchPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    const handleSearch = (query: string) => {
        window.history.pushState({}, '', `/?search=${encodeURIComponent(query)}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleMobileSearch = () => {
        window.history.pushState({}, '', '/?action=search');
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleNotifyMe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setStatus('loading');
        try {
            const res = await fetch('/api/subscribe-newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim() }),
            });
            if (res.ok) {
                setStatus('success');
                setEmail('');
            } else {
                setStatus('idle');
            }
        } catch {
            setStatus('idle');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <Header
                searchQuery=""
                onSearch={handleSearch}
                isScrolled={true}
                onMobileSearchClick={handleMobileSearch}
            />

            <main className="flex-grow flex items-center justify-center relative overflow-hidden py-32 px-6">
                {/* Ambient glow — no product photography exists yet, so the
                    drama comes from typography and light rather than an
                    image, same trick the reveal-card reference uses. */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vw] h-[140vw] max-w-[900px] max-h-[900px] bg-red-600/10 rounded-full blur-[120px]" />
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />
                </div>

                <div className="relative z-10 max-w-xl w-full text-center space-y-8 animate-[fadeIn_1s_ease-out]">
                    <span className="inline-block bg-red-600 text-white font-black uppercase text-[10px] tracking-[0.4em] px-4 py-2 rounded-full">
                        The Crate Shop
                    </span>
                    <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] italic">
                        Coming<br />Soon
                    </h1>
                    <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-md mx-auto">
                        Festival posters, printed on real things — tees, mugs, prints, and more, straight from the films you watched here. We're building it now.
                    </p>

                    <form onSubmit={handleNotifyMe} className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
                        {status === 'success' ? (
                            <p className="text-red-400 font-bold text-sm">You're on the list — we'll let you know.</p>
                        ) : (
                            <>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Your email"
                                    className="w-full sm:flex-1 bg-white/5 border border-white/15 rounded-full px-5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full sm:w-auto bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] px-6 py-3 rounded-full hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 whitespace-nowrap"
                                >
                                    {status === 'loading' ? 'Sending...' : 'Notify Me'}
                                </button>
                            </>
                        )}
                    </form>
                </div>

                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(12px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </main>

            <Footer />
            <BackToTopButton />

            <BottomNavBar onSearchClick={handleMobileSearch} />
        </div>
    );
};

export default MerchPage;
