
import React from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import BackToTopButton from './BackToTopButton';

const AwardItem: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
    <div className="bg-gray-800/40 border border-white/5 p-6 rounded-xl hover:bg-gray-800/60 transition-all group">
        <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center border border-red-500/30 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">{title}</h3>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-12">
        <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-widest border-b border-red-600 pb-2 inline-block">
            {title}
        </h2>
        <div className="text-gray-300 space-y-4 leading-relaxed">
            {children}
        </div>
    </section>
);

const SubmissionTermsPage: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} showNavLinks={true} />

            <main className="flex-grow pt-24 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                    
                    {/* Header */}
                    <div className="text-center mb-20 animate-[fadeIn_0.8s_ease-out]">
                        <p className="text-red-500 font-black uppercase tracking-[0.4em] mb-4 text-sm">Official Selection Partner</p>
                        <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter">Festival Rules & Awards</h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
                            Our standard for excellence is high because independent film deserves nothing less. Review our categories and submission guidelines below.
                        </p>
                    </div>

                    {/* Award Categories */}
                    <div className="mb-24">
                        <h2 className="text-3xl font-black text-white mb-10 text-center uppercase tracking-[0.2em]">Crate Excellence Awards</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <AwardItem title="Best Short Film" desc="Awarded to the overall most impactful narrative or experimental short film of the festival." />
                            <AwardItem title="Best Director" desc="Recognizing a visionary filmmaker who demonstrates exceptional command of their craft." />
                            <AwardItem title="Best Screenplay" desc="Honoring the foundation of storytelling: powerful dialogue and innovative narrative structure." />
                            <AwardItem title="Best Performance" desc="Awarded to an actor or actress who brings undeniable truth and presence to the screen." />
                            <AwardItem title="Best Cinematography" desc="Celebrating the artistry of the lens and the visual language of the film." />
                            <AwardItem title="Audience Choice" desc="The highest honor bestowed by our community: the film that resonated most with Crate TV viewers." />
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl">
                        <h2 className="text-3xl font-black text-white mb-12 uppercase tracking-tighter">Rules & Terms</h2>
                        
                        <Section title="1. Eligibility & General Rules">
                            <p><strong>Originality:</strong> Submissions must be the original work of the entrants. If the film is based on a true story or another person’s life, the submitter must have the legal right to depict that subject.</p>
                            <p><strong>Language:</strong> Non-English language films must be subtitled in English.</p>
                            <p><strong>Format:</strong> Films must be submitted via an online screener (FilmFreeway or password-protected link). If selected, high-resolution digital files (ProRes or H.264) will be required.</p>
                            <p><strong>Premiere Status:</strong> We do not require premiere status. Your film can have played at other festivals or be available on other non-exclusive platforms.</p>
                        </Section>

                        <Section title="2. Grant of Rights (Exhibition License)">
                            <p>By submitting your film to Crate, you (the "Submitter") understand and agree to the following if your film is "Selected" for our catalog:</p>
                            <p><strong>Non-Exclusive License:</strong> You grant Crate [LLC Name] a non-exclusive license to stream and exhibit your film on the Crate platform. You retain 100% of the copyright.</p>
                            <p><strong>Term:</strong> The standard exhibition period is 12 months from the date of the "Live Premiere" on Crate. After 12 months, either party may terminate the agreement with 30 days' written notice.</p>
                            <p><strong>Territory:</strong> You grant Crate the right to stream your film globally, unless you specify geographic restrictions (Geo-blocking) during the submission process.</p>
                            <p><strong>Promotional Use:</strong> Crate is granted the right to use stills, trailers, and clips (up to 2 minutes) for marketing the platform and your film on social media and press materials.</p>
                        </Section>

                        <Section title="3. Warranties & Indemnity">
                            <p><strong>Third-Party Rights:</strong> The Submitter warrants that they have cleared all necessary rights, including music licenses, actor releases, and any copyrighted material appearing in the film.</p>
                            <p><strong>Indemnification:</strong> The Submitter agrees to indemnify and hold harmless Crate [LLC Name] from any and all claims, liabilities, and expenses (including legal fees) that may arise regarding copyright, trademark, or any other legal disputes related to the film.</p>
                        </Section>

                        <Section title="4. Selection & Awards">
                            <p><strong>Selection:</strong> "Official Selection" does not guarantee immediate streaming; it means the film has passed our curatorial review. You will be notified of your specific "Streaming Date."</p>
                            <p><strong>Laurels:</strong> All "Official Selections" and "Award Winners" are granted the right to use Crate digital laurels for their marketing materials indefinitely.</p>
                            <p><strong>Disqualification:</strong> Crate reserves the right to disqualify any film if legal disputes arise or if the film content violates our community standards (e.g., hate speech or unauthorized pornography).</p>
                        </Section>

                        <Section title="5. Fees & Refunds">
                            <p><strong>Submission Fees:</strong> All submission fees are non-refundable. Fees are used to cover the costs of the curatorial process and platform maintenance.</p>
                            <p><strong>Withdrawal:</strong> A filmmaker may withdraw their film at any time before it is officially selected. Once a film is "Selected" and scheduled for premiere, it cannot be withdrawn until the end of the initial 12-month term.</p>
                        </Section>
                    </div>

                    <div className="mt-16 text-center pb-12">
                        <p className="text-gray-500 text-sm italic">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>

                </div>
            </main>

            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export default SubmissionTermsPage;
