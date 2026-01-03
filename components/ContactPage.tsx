
import React, { useState, useRef, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';


const ContactPage: React.FC = () => {
    const { settings } = useFestival();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState<'success' | 'error' | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const formRef = useRef<HTMLFormElement>(null);
    
    const studioEmail = settings.businessEmail || "studio@cratetv.net";

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmissionStatus(null);
        setErrorMessage('');

        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/send-contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server responded with an error.');
            }

            setSubmissionStatus('success');
            formRef.current?.reset();

        } catch (error) {
            console.error('Contact form error:', error);
            setSubmissionStatus('error');
            setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred. Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleGoHome = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };

    const formInputClasses = "form-input";

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#050505]">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
            />

            <main className="flex-grow pt-24 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-3xl mx-auto">
                    <button onClick={handleGoHome} className="mb-8 inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase font-black text-[10px] tracking-[0.3em]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Home
                    </button>

                    <h1 className="text-4xl md:text-7xl font-black text-white mb-4 text-center uppercase tracking-tighter">Contact Us</h1>
                    <p className="text-lg text-gray-400 mb-10 text-center font-medium">
                        Transmissions routed to <span className="text-red-500 font-black">{studioEmail}</span>
                    </p>

                    <div className="bg-white/5 border border-white/5 p-8 sm:p-12 rounded-[2.5rem] shadow-2xl">
                        {submissionStatus === 'success' ? (
                            <div className="text-center p-8 space-y-4">
                                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter">Message Routed</h2>
                                <p className="text-gray-400">Our coordination core has received your transmission.</p>
                                <button onClick={handleGoHome} className="mt-4 bg-white text-black font-black px-8 py-3 rounded-xl uppercase text-xs tracking-widest shadow-xl">Return Home</button>
                            </div>
                        ) : (
                            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="name" className="form-label">Full Name</label>
                                    <input type="text" id="name" name="name" className={formInputClasses} required />
                                </div>
                                <div>
                                    <label htmlFor="email" className="form-label">Your Email Address</label>
                                    <input type="email" id="email" name="email" className={formInputClasses} required />
                                </div>
                                <div>
                                    <label htmlFor="message" className="form-label">Message Content</label>
                                    <textarea id="message" name="message" rows={5} className={formInputClasses} required></textarea>
                                </div>
                                <button type="submit" className="submit-btn w-full mt-8" disabled={isSubmitting}>
                                    {isSubmitting ? 'Transmitting...' : 'Send Message'}
                                </button>
                                
                                {submissionStatus === 'error' && (
                                    <div className="mt-4 text-center text-red-500 text-xs font-black uppercase tracking-widest">
                                        <p>{errorMessage}</p>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            </main>

            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export default ContactPage;
