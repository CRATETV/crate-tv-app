import React, { useState } from 'react';

const faqs = [
    {
        q: "Is Crate TV free?",
        a: "Yes — creating a Crate TV account is completely free. You can browse the catalog, watch films on The Square, and explore the platform at no cost. Some content — like live watch party screenings and festival blocks — require a ticket purchase. We're always transparent about what's free and what's ticketed."
    },
    {
        q: "What kind of films are on Crate TV?",
        a: "Crate is home to independent cinema that deserves to be seen. Short films, features, documentaries — work that was made with intention, craft, and vision. These are films that came out of film festivals, film schools, and years of dedication. Not algorithm-driven content. Not filler. Real stories, well told, from filmmakers who care deeply about their work."
    },
    {
        q: "What are Watch Parties?",
        a: "Watch Parties are live simultaneous screenings where everyone watching sees the film at the exact same moment — whether you're in the room in Philadelphia or watching from across the world. There's a live chat running alongside the film so you're experiencing it together. It's the closest thing to a cinema experience you can have from your couch. Watch parties are typically ticketed events, often tied to the Playhouse West Film Festival."
    },
    {
        q: "What is the Playhouse West Film Festival?",
        a: "PWFF is an annual independent film festival based in Philadelphia, PA. It's one of the longest-running independent film festivals in the region — now in its 13th year. Crate TV is the official virtual streaming home of the festival, meaning virtual ticket holders can watch every screening live from anywhere in the world at the same time films screen physically in Philadelphia."
    },
    {
        q: "How do I watch on Roku?",
        a: "Search for 'Crate TV' in the Roku Channel Store and add it to your device. Once installed, you can browse the full catalog and watch directly on your TV. The Roku app is free to download."
    },
    {
        q: "I'm a filmmaker. Can I submit my film?",
        a: "Yes — and we want to hear from you. Crate TV was built specifically because too many great films end up on a hard drive after the festival circuit ends. We believe your work deserves to be seen, celebrated, and found by the audiences it was made for. Submit through our filmmaker portal and we'll be in touch."
    },
    {
        q: "How does Crate TV support filmmakers?",
        a: "Every film on Crate has a director's profile page. Filmmakers get real analytics — how many people watched, where they're from, how long they stayed. Watch parties put filmmakers in direct conversation with their audience. The Crate Zine features filmmaker interviews and behind-the-scenes stories. And our festival partnership gives filmmakers a virtual distribution window alongside physical screenings."
    },
    {
        q: "Who is behind Crate TV?",
        a: "Crate TV was founded by Salome Denoon in Philadelphia, PA. It was built out of a genuine belief that independent film deserves a real platform — not an afterthought, not a hard drive. A home."
    },
];

const FaqPage: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const navigate = (path: string) => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white">

            {/* Hero */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(229,9,20,0.10)_0%,transparent_60%)] pointer-events-none" />
                <div className="relative max-w-2xl mx-auto px-4 pt-24 pb-16 text-center">
                    <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-500/20 rounded-full px-4 py-1.5 mb-8">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">About Crate TV</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-3">
                        The Distribution<br /><span className="text-red-600">Afterlife.</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-6">Television powered by creatives</p>
                    <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
                        Too many great films end up on a hard drive after the festival circuit ends. Crate TV exists so that doesn't happen. Your work deserves to be seen.
                    </p>
                </div>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* Mission section */}
            <div className="max-w-2xl mx-auto px-4 py-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
                    {[
                        {
                            icon: '🎬',
                            title: 'For Filmmakers',
                            body: 'You made something real. After the festival, after the circuit, after the hard work — Crate is where your film lives. A permanent home with a real audience.'
                        },
                        {
                            icon: '🍿',
                            title: 'For Audiences',
                            body: 'Stories that were made with intention. Films that came out of film schools, festivals, and years of craft. Not filler. Not noise. Work that earned your time.'
                        },
                        {
                            icon: '📺',
                            title: 'On Every Screen',
                            body: 'Web, mobile, and Roku TV. Crate goes wherever you watch. Free to join, live watch parties, festival screenings — all in one place.'
                        },
                    ].map((card, i) => (
                        <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-3">
                            <span className="text-2xl">{card.icon}</span>
                            <h3 className="font-black uppercase tracking-widest text-sm text-white">{card.title}</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">{card.body}</p>
                        </div>
                    ))}
                </div>

                {/* Watch party feature callout */}
                <div className="bg-red-600/5 border border-red-500/15 rounded-2xl p-8 mb-16 flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center flex-shrink-0 text-xl">🎭</div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-red-400 mb-2">Live Watch Parties</p>
                        <h3 className="text-xl font-black text-white mb-2">Cinema from your couch.</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Watch parties are live simultaneous screenings where every viewer — in Philadelphia and around the world — sees the film at the exact same moment. Live chat, shared experience, real community. It's the closest thing to a cinema night you can have from anywhere.
                        </p>
                    </div>
                </div>

                {/* FAQ */}
                <div className="mb-16">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-8 text-center">Frequently Asked Questions</p>
                    <div className="space-y-2">
                        {faqs.map((faq, i) => (
                            <div
                                key={i}
                                className={`border rounded-2xl overflow-hidden transition-all ${openIndex === i ? 'border-red-500/20 bg-red-500/[0.02]' : 'border-white/5 bg-white/[0.01]'}`}
                            >
                                <button
                                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                    className="w-full flex items-center justify-between px-6 py-4 text-left gap-4"
                                >
                                    <span className={`font-bold text-sm transition-colors ${openIndex === i ? 'text-white' : 'text-gray-300'}`}>
                                        {faq.q}
                                    </span>
                                    <span className={`text-gray-600 flex-shrink-0 transition-transform ${openIndex === i ? 'rotate-180 text-red-400' : ''}`}>
                                        ↓
                                    </span>
                                </button>
                                {openIndex === i && (
                                    <div className="px-6 pb-5 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4 animate-[fadeIn_0.2s_ease-out]">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA section */}
                <div className="text-center space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">Ready?</p>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Find your next film.</h2>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                        <button
                            onClick={() => navigate('/')}
                            className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-sm px-8 py-4 rounded-2xl transition-all active:scale-95"
                        >
                            Browse Crate TV
                        </button>
                        <button
                            onClick={() => navigate('/portal')}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-sm px-8 py-4 rounded-2xl transition-all active:scale-95"
                        >
                            Submit Your Film
                        </button>
                    </div>
                    <p className="text-[11px] text-gray-700 pt-2">
                        Founded by Salome Denoon · Philadelphia, PA · cratetv.net
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FaqPage;
