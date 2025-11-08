import React, { useState } from 'react';

const RokuAdminTab: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'generating' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleDownload = async () => {
        setStatus('generating');
        setErrorMessage('');
        const password = sessionStorage.getItem('adminPassword');

        try {
            const response = await fetch('/api/generate-roku-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate package.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cratetv-roku-channel.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setStatus('idle');

        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
            setStatus('error');
            // Reset status after a few seconds so user can try again
            setTimeout(() => setStatus('idle'), 5000);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-bold text-purple-400 mb-4">Publish Your Roku SDK Channel</h2>
                <p className="text-gray-300 mb-6">
                    This tool automates the Roku channel creation process. It dynamically inserts your live content feed URL into the channel code and packages everything into a zip file, ready for you to upload to your Roku Developer account.
                </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                 <h3 className="text-xl font-semibold text-white mb-4">One-Click Package Download</h3>
                 <p className="text-gray-400 mb-6">
                     Click the button below to download your production-ready Roku channel package. This tool automatically includes the latest Crate TV branding (logo and splash screen) in your channel package.
                 </p>
                 <button 
                    onClick={handleDownload}
                    disabled={status === 'generating'}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
                 >
                    {status === 'generating' ? 'Generating Package...' : 'Download Roku Package (.zip)'}
                 </button>
                 {errorMessage && <p className="text-red-400 text-sm mt-4">{errorMessage}</p>}
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                 <h3 className="text-xl font-semibold text-white mb-4">Final Steps: Upload to Roku</h3>
                 <ol className="list-decimal list-inside space-y-4 text-gray-300">
                    <li>Log into your <a href="https://developer.roku.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Roku Developer Dashboard</a>.</li>
                    <li>Go to "Manage My Channels" and select your SDK channel.</li>
                    <li>Navigate to the "Package Upload" page and upload the ZIP file you just downloaded.</li>
                    <li>Follow Roku's instructions to install a preview on your device, test it, and then submit it for publishing.</li>
                </ol>
            </div>
        </div>
    );
};

export default RokuAdminTab;