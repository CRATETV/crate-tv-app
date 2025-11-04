import React, { useState, useRef, useEffect } from 'react';
import Header from './Header';
// FIX: Corrected import path
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';


const ContactPage: React.FC = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState<'success' | 'error' | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const formRef = useRef<HTMLFormElement>(null);
    const { isFestivalLive } = useFestival();

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
    
    const formInputClasses = "form-input";

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
            />

            <main className="flex-grow pt-24 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">Contact Us</h1>
                    <p className="text-lg text-gray-400 mb-10 text-center">
                        Have a question, feedback, or a collaboration idea? We'd love to hear from you.
                    </p>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8">
                        {submissionStatus === 'success' ? (
                            <div className="text-center p-8">
                                <h2 className="text-3xl font-bold text-green-500 mb-4">Message Sent!</h2>
                                <p className="text-gray-300">Thank you for reaching out. We'll get back to you as soon as possible.</p>
                            </div>
                        ) : (
                            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">Your Name</label>
                                    <input type="text" id="name" name="name" className={formInputClasses} required />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Your Email</label>
                                    <input type="email" id="email" name="email" className={formInputClasses} required />
                                </div>
                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-gray-400 mb-2">Message</label>
                                    <textarea id="message" name="message" rows={5} className={formInputClasses} required></textarea>
                                </div>
                                <button type="submit" className="submit-btn w-full mt-8" disabled={isSubmitting}>
                                    {isSubmitting ? 'Sending...' : 'Send Message'}
                                </button>
                                
                                {submissionStatus === 'error' && (
                                    <div className="mt-4 text-center text-red-500">
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
            <BottomNavBar 
                isFestivalLive={isFestivalLive}
                onSearchClick={() => {
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new Event('pushstate'));
                }}
            />
        </div>
    );
};

export default ContactPage;