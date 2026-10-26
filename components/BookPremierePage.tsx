import React, { useEffect, useState } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import SquarePaymentModal from './SquarePaymentModal';
import { useAuth } from '../contexts/AuthContext';
import { PREMIERE_PRICES_CENTS } from '../api/_lib/paymentRules';

// cratetv.net/book-premiere (Oct 2026): where a filmmaker pays for a
// premiere night. Send them this link in your reply to a /premiere request.
//   $25  holds the date (every premiere)
//   $50  the rest of a free premiere's $75 hosting fee
// Prices are decided by the server (api/_lib/paymentRules.ts), not this page.
// Payments land in Square like every other sale, are listed in
// Admin → Payments & refunds, saved in `premiere_payments`, and emailed to
// the studio inbox.

type Kind = 'premiereBooking' | 'premiereBalance';

const OPTIONS: { kind: Kind; title: string; body: string }[] = [
    {
        kind: 'premiereBooking',
        title: 'Hold my date',
        body: 'Every premiere starts here. For a ticketed premiere it\'s all you pay up front: CRATE keeps 30% of ticket sales afterwards, minus this $25.',
    },
    {
        kind: 'premiereBalance',
        title: 'Free premiere balance',
        body: 'For a free premiere (your audience watches free): the rest of the $75 hosting fee. Pay it once your date is set.',
    },
];

const dollars = (kind: Kind) => `$${(PREMIERE_PRICES_CENTS[kind] / 100).toFixed(0)}`;

const BookPremierePage: React.FC = () => {
    const { user } = useAuth();
    const [film, setFilm] = useState(() => new URLSearchParams(window.location.search).get('film')?.slice(0, 150) || '');
    const [paying, setPaying] = useState<Kind | null>(null);
    const [paid, setPaid] = useState<Kind | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const prev = document.title;
        document.title = 'Book Your Premiere | Crate TV';
        return () => { document.title = prev; };
    }, []);

    const signIn = () => {
        const back = `/book-premiere${film.trim() ? `?film=${encodeURIComponent(film.trim())}` : ''}`;
        window.history.pushState({}, '', `/login?redirect=${encodeURIComponent(back)}&view=signup`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const start = (kind: Kind) => {
        if (!film.trim()) { setError('Add your film\'s title first.'); return; }
        setError('');
        if (!user) { signIn(); return; }
        setPaying(kind);
    };

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#050505]">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow pt-28 pb-24 md:pb-12 px-4 md:px-12">
                <div className="max-w-3xl mx-auto">
                    <p className="text-red-500 font-black uppercase tracking-[0.35em] text-[10px] md:text-xs mb-4 text-center">Premiere night on CRATE</p>
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-center leading-[0.95]">Book your premiere</h1>
                    <p className="text-gray-400 text-center mt-5 max-w-xl mx-auto">Pay securely by card. You'll get a receipt by email, and we'll be in touch to set up your premiere page, countdown and tickets.</p>

                    {paid ? (
                        <div className="mt-10 rounded-[2rem] bg-white/5 border border-white/10 p-10 text-center space-y-3">
                            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Payment received</h2>
                            <p className="text-gray-400">{paid === 'premiereBooking' ? `Your date for ${film} is held.` : `Your free premiere for ${film} is fully paid.`} A receipt is on its way to your email.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mt-10">
                                <label htmlFor="film" className="form-label">Your film's title</label>
                                <input id="film" value={film} onChange={e => setFilm(e.target.value)} maxLength={150} className="form-input" placeholder="e.g. You Don't Know My Name" />
                                {error && <p className="text-red-500 text-sm font-bold mt-2">{error}</p>}
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4 mt-6">
                                {OPTIONS.map(o => (
                                    <div key={o.kind} className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 flex flex-col">
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500">{o.kind === 'premiereBooking' ? 'Step 1 · every premiere' : 'Free premieres only'}</p>
                                        <h2 className="text-xl font-black mt-2">{o.title}</h2>
                                        <p className="text-4xl font-black mt-3">{dollars(o.kind)}</p>
                                        <p className="text-sm text-gray-400 mt-3 leading-relaxed flex-grow">{o.body}</p>
                                        <button onClick={() => start(o.kind)} className="mt-5 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-colors">
                                            {user ? `Pay ${dollars(o.kind)}` : 'Sign in to pay'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-center text-xs text-gray-500 mt-6">Not sure which one? Pay the $25 to hold your date; we'll sort out the rest together. Questions: studio@cratetv.net</p>
                        </>
                    )}
                </div>
            </main>
            {paying && (
                <SquarePaymentModal
                    paymentType={paying}
                    premiereFilmTitle={film.trim()}
                    onClose={() => setPaying(null)}
                    onPaymentSuccess={() => { setPaid(paying); setPaying(null); }}
                />
            )}
            <CollapsibleFooter />
            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export default BookPremierePage;
