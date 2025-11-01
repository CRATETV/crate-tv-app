import React, { useState } from 'react';

const EmailSender: React.FC = () => {
    const [subject, setSubject] = useState('');
    const [htmlBody, setHtmlBody] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !htmlBody.trim()) {
            setMessage('Subject and message body cannot be empty.');
            setStatus('error');
            return;
        }

        setStatus('sending');
        setMessage('');

        const password = sessionStorage.getItem('adminPassword');
        if (!password) {
            setMessage('Authentication error. Please log in again.');
            setStatus('error');
            return;
        }
        
        try {
            const response = await fetch('/api/send-bulk-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, htmlBody, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send emails.');
            }

            setStatus('success');
            setMessage(data.message || 'Emails sent successfully!');
            setSubject('');
            setHtmlBody('');
        } catch (err) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
        }
    };

    return (
        <div className="bg-gray-950 p-6 rounded-lg text-gray-200">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-cyan-400">Email All Users</h2>
            <p className="text-sm text-gray-400 mb-6">Send an email to every registered user on Crate TV. Use this for important announcements. HTML is supported in the message body.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-300">Subject</label>
                    <input
                        type="text"
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="htmlBody" className="block text-sm font-medium text-gray-300">Message Body (HTML Supported)</label>
                    <textarea
                        id="htmlBody"
                        value={htmlBody}
                        onChange={(e) => setHtmlBody(e.target.value)}
                        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                        rows={10}
                        required
                        placeholder="<h1>New Movie Alert!</h1><p>Check out our latest release...</p>"
                    />
                </div>
                 {message && (
                    <p className={`text-sm ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                        {message}
                    </p>
                )}
                <div>
                    <button type="submit" disabled={status === 'sending'} className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 text-white font-bold py-2 px-5 rounded-md transition-colors">
                        {status === 'sending' ? 'Sending...' : 'Send Email to All Users'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EmailSender;
