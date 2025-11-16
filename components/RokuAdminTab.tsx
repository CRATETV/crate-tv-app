import React, { useState, useEffect } from 'react';

const RokuAdminTab: React.FC = () => {
    const [pkgStatus, setPkgStatus] = useState<'idle' | 'generating' | 'error'>('idle');
    const [sourceStatus, setSourceStatus] = useState<'idle' | 'generating' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

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
                    This is the official method for publishing and maintaining the Crate TV Roku channel. This process uses Roku's robust SDK (Software Development Kit) to provide a fully custom, branded channel that mirrors the web app's design and supports advanced features like the Live Film Festival and account linking.
                </p>
                <div className="bg-yellow-900/30 border border-yellow-800 text-yellow-300 text-sm rounded-lg p-4 mb-6">
                    <h3 className="font-bold mb-2">Important Notice Regarding Direct Publisher:</h3>
                    <p>As of January 2024, Roku has discontinued its "Direct Publisher" platform. All no-code methods have been deprecated. The custom SDK channel is now the required method for publishing.</p>
                </div>
            </div>
            
            {/* CUSTOM SDK METHOD */}
            <div className="bg-red-900/30 p-6 rounded-lg border-2 border-red-800">
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-600">
                    <h4 className="font-bold text-lg mb-3 text-white">Step 1: Download Your Channel Package</h4>
                     <p className="text-gray-400 mb-4 text-sm">
                         Click the button below to download your production-ready Roku channel package. This single file contains everything needed for publishing.
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
                    <h4 className="font-bold text-lg mb-3 text-white">Step 2: Upload to Roku</h4>
                     <ol className="list-decimal list-inside space-y-3 text-gray-300 text-sm">
                        <li>Log into your <a href="https://developer.roku.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Roku Developer Dashboard</a>.</li>
                        <li>Go to "Manage My Channels" and select your Crate TV SDK channel.</li>
                        <li>Navigate to the "Package Upload" page and upload the `.pkg` file you just downloaded.</li>
                        <li>Follow Roku's on-screen instructions to install a preview on your device, test it, and submit it for publishing.</li>
                    </ol>
                 </div>
                 <div className="mt-6">
                    <h4 className="font-bold text-lg mb-3 text-yellow-300">Sideloading for Development (Alternative)</h4>
                    <p className="text-gray-400 mb-4 text-sm">
                        For local development or if the automated package fails validation, you can use the manual sideloading process. This involves downloading the source code, zipping it correctly, and using your Roku device's developer uploader.
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