
import React, { useState, useEffect } from 'react';

const RokuAdminTab: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'generating' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [instantTvFeedUrl, setInstantTvFeedUrl] = useState('');
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    
    useEffect(() => {
        // Set the feed URL on component mount
        const url = `${window.location.origin}/api/instant-tv-feed`;
        setInstantTvFeedUrl(url);
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(instantTvFeedUrl);
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2500);
    };


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
            setTimeout(() => setStatus('idle'), 5000);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-bold text-purple-400 mb-4">Publish to Roku</h2>
                <p className="text-gray-300 mb-6">
                   Choose one of the methods below to publish your Crate TV content library to your Roku channel.
                </p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                 <h3 className="text-xl font-semibold text-white mb-2">Method 1: Instant TV Channel (Easy & Fast)</h3>
                 <p className="text-gray-400 mb-4">
                     If you use the <a href="https://www.instanttvchannel.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Instant TV Channel</a> service, simply use the feed URL below. This feed is automatically kept up-to-date with your published content.
                 </p>
                 <div className="flex items-center gap-2">
                    <input type="text" value={instantTvFeedUrl} readOnly className="form-input flex-grow" />
                    <button onClick={handleCopy} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md text-sm">
                        {copyStatus === 'copied' ? 'Copied!' : 'Copy URL'}
                    </button>
                 </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                 <h3 className="text-xl font-semibold text-white mb-2">Method 2: Custom SDK Channel (Recommended)</h3>
                 <p className="text-gray-400 mb-6">
                    This method provides a fully custom, branded Roku channel that mirrors your web app's design and supports advanced features like the Live Film Festival. The package you download is dynamically configured for this deployment—no coding required.
                 </p>
                 <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-600">
                    <h4 className="font-bold text-lg mb-3">Step 1: Download Your Channel Package</h4>
                     <p className="text-gray-400 mb-4 text-sm">
                         Click the button below to download your production-ready Roku channel package.
                     </p>
                     <button 
                        onClick={handleDownload}
                        disabled={status === 'generating'}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-3 px-6 rounded-lg text-base transition-colors"
                     >
                        {status === 'generating' ? 'Generating Package...' : 'Download Custom Roku Package (.zip)'}
                     </button>
                     {errorMessage && <p className="text-red-400 text-sm mt-4">{errorMessage}</p>}
                 </div>
                 <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-600 mt-6">
                    <h4 className="font-bold text-lg mb-3">Step 2: Upload to Roku</h4>
                     <ol className="list-decimal list-inside space-y-3 text-gray-300 text-sm">
                        <li>Log into your <a href="https://developer.roku.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Roku Developer Dashboard</a>.</li>
                        <li>Go to "Manage My Channels" and select your SDK channel.</li>
                        <li>Navigate to the "Package Upload" page and upload the ZIP file you just downloaded.</li>
                        <li>Follow Roku's instructions to install a preview on your device, test it, and submit for publishing.</li>
                    </ol>
                 </div>
            </div>
        </div>
    );
};

export default RokuAdminTab;