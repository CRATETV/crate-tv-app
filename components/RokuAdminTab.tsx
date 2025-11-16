import React, { useState, useEffect } from 'react';

const RokuAdminTab: React.FC = () => {
    const [pkgStatus, setPkgStatus] = useState<'idle' | 'generating' | 'error'>('idle');
    const [sourceStatus, setSourceStatus] = useState<'idle' | 'generating' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [feedUrl, setFeedUrl] = useState('');
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    useEffect(() => {
        // Construct the feed URL based on the current window location
        if (typeof window !== 'undefined') {
            const url = new URL('/api/roku-direct-publisher-feed', window.location.origin);
            setFeedUrl(url.href);
        }
    }, []);

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(feedUrl).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        });
    };

    const handleDownload = async (type: 'pkg' | 'source') => {
        const isPkg = type === 'pkg';
        const setStatus = isPkg ? setPkgStatus : setSourceStatus;
        const endpoint = isPkg ? '/api/generate-roku-zip' : '/api/generate-roku-source-zip';
        const filename = isPkg ? 'cratetv-roku-channel.pkg' : 'cratetv-roku-source.zip';

        setStatus('generating');
        setErrorMessage('');
        const password = sessionStorage.getItem('adminPassword');

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to generate ${type} file.`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
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
                <h2 className="text-2xl font-bold text-purple-400 mb-4">Publish Your Custom Roku Channel</h2>
                <p className="text-gray-300 mb-6">
                   Choose one of the methods below to publish your content on Roku. The "No-Code Way" is the fastest and easiest method for most users. The "Custom SDK" method provides a more deeply integrated, web-app-like experience.
                </p>
            </div>
            
            {/* NO-CODE DIRECT PUBLISHER METHOD */}
            <div className="bg-green-900/20 p-6 rounded-lg border-2 border-green-700">
                <h3 className="text-2xl font-bold text-green-300 mb-4">Method 1: The No-Code Way (Recommended)</h3>
                <p className="text-green-200/90 mb-6">
                    Use Roku's **Direct Publisher** platform for a beautiful, automatically generated channel. No coding or manual packaging is required. Your channel will update automatically whenever you publish new content here.
                </p>
                <ol className="list-decimal list-inside space-y-4 text-gray-300">
                    <li>
                        <strong className="text-white">Copy your unique Content Feed URL.</strong><br/>
                        This is the special link that tells Roku what content to display.
                        <div className="my-3 flex items-center gap-2">
                            <input type="text" readOnly value={feedUrl} className="form-input !py-1 text-sm bg-gray-700 w-full" />
                            <button onClick={handleCopyUrl} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-xs flex-shrink-0">
                                {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </li>
                    <li>
                        <strong className="text-white">Create a Direct Publisher channel.</strong><br/>
                        Log into your <a href="https://developer.roku.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Roku Developer Dashboard</a>, click "Add Channel", and select "Direct Publisher".
                    </li>
                    <li>
                        <strong className="text-white">Configure your channel.</strong><br/>
                        Follow Roku's on-screen instructions. In the "Feed URL" section, paste the URL you copied above. Customize your branding with logos and colors.
                    </li>
                     <li>
                        <strong className="text-white">Preview and Publish.</strong><br/>
                        Test your channel and submit it for review. That's it!
                    </li>
                </ol>
            </div>


            {/* CUSTOM SDK METHOD */}
            <div className="bg-red-900/30 p-6 rounded-lg border-2 border-red-800">
                <h3 className="text-2xl font-bold text-red-300 mb-4">Method 2: Custom SDK Channel (Advanced)</h3>
                <p className="text-red-200/90 mb-6">
                    This method provides a fully custom channel that mirrors your web app's design and supports advanced features like the Live Film Festival and account linking. This requires manually uploading a package file for any code changes.
                </p>
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-600">
                    <h4 className="font-bold text-lg mb-3">Step 1: Download Your Channel Package</h4>
                     <p className="text-gray-400 mb-4 text-sm">
                         Click the button below to download your production-ready Roku channel package.
                     </p>
                     <button 
                        onClick={() => handleDownload('pkg')}
                        disabled={pkgStatus === 'generating'}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-2 px-5 rounded-lg text-sm transition-colors"
                     >
                        {pkgStatus === 'generating' ? 'Generating Package...' : 'Download Custom Package (.pkg)'}
                     </button>
                     {pkgStatus === 'error' && <p className="text-red-400 text-sm mt-4">{errorMessage}</p>}
                 </div>
                 <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-600 mt-6">
                    <h4 className="font-bold text-lg mb-3">Step 2: Upload to Roku</h4>
                     <ol className="list-decimal list-inside space-y-3 text-gray-300 text-sm">
                        <li>Log into your <a href="https://developer.roku.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Roku Developer Dashboard</a>.</li>
                        <li>Go to "Manage My Channels" and select your SDK channel.</li>
                        <li>Navigate to the "Package Upload" page and upload the package file.</li>
                        <li>Follow Roku's instructions to preview and publish.</li>
                    </ol>
                 </div>
                 <div className="mt-6">
                    <h4 className="font-bold text-lg mb-3 text-yellow-300">Sideloading for Development (Plan B)</h4>
                    <p className="text-gray-400 mb-4 text-sm">
                        If the automated package fails validation, you can use the manual sideloading process. This involves downloading the source code, zipping it correctly, and using your Roku device's uploader.
                    </p>
                     <button 
                        onClick={() => handleDownload('source')}
                        disabled={sourceStatus === 'generating'}
                        className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-black font-bold py-2 px-5 rounded-lg text-sm transition-colors"
                    >
                        {sourceStatus === 'generating' ? 'Zipping Source...' : 'Download Source Code (.zip)'}
                    </button>
                     {sourceStatus === 'error' && <p className="text-red-300 text-sm mt-2">{errorMessage}</p>}
                </div>
            </div>
        </div>
    );
};

export default RokuAdminTab;
