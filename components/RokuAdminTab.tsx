import React, { useState } from 'react';

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
                   This tool provides a complete, production-ready package for your custom SDK channel. This channel is fully branded, mirrors your web app's design, and supports advanced features like personalization ("My List") and the Live Film Festival. The package you download is dynamically configured for this deployment—no coding required.
                </p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                 <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-600">
                    <h4 className="font-bold text-lg mb-3">Step 1: Download Your Channel Package</h4>
                     <p className="text-gray-400 mb-4 text-sm">
                         Click the button below to download your production-ready Roku channel package. This is the recommended method.
                     </p>
                     <button 
                        onClick={() => handleDownload('pkg')}
                        disabled={pkgStatus === 'generating'}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-3 px-6 rounded-lg text-base transition-colors"
                     >
                        {pkgStatus === 'generating' ? 'Generating Package...' : 'Download Custom Roku Package (.pkg)'}
                     </button>
                     {pkgStatus === 'error' && <p className="text-red-400 text-sm mt-4">{errorMessage}</p>}
                 </div>
                 <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-600 mt-6">
                    <h4 className="font-bold text-lg mb-3">Step 2: Upload to Roku</h4>
                     <ol className="list-decimal list-inside space-y-3 text-gray-300 text-sm">
                        <li>Log into your <a href="https://developer.roku.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Roku Developer Dashboard</a>.</li>
                        <li>Go to "Manage My Channels" and select your SDK channel.</li>
                        <li>Navigate to the "Package Upload" page and upload the package file you just downloaded.</li>
                        <li>Follow Roku's instructions to install a preview on your device, test it, and submit for publishing.</li>
                    </ol>
                 </div>
            </div>

            <div className="bg-red-900/30 p-6 rounded-lg border-2 border-red-800">
                <h3 className="text-2xl font-bold text-red-300 mb-4">Manual Packaging Instructions (Plan B)</h3>
                <p className="text-red-200/90 mb-6">
                    If the automated package download fails Roku's validation, use this foolproof manual method. This process uses your Roku device itself to create a perfectly signed package.
                </p>

                <ol className="list-decimal list-inside space-y-6 text-gray-300">
                    <li>
                        <strong className="text-white">Enable Developer Mode on your Roku device.</strong><br/>
                        On your Roku remote, press: <code className="bg-gray-700 p-1 rounded-md text-sm">Home (3x), Up (2x), Right, Left, Right, Left, Right</code>. Follow the on-screen instructions and note the IP address shown.
                    </li>
                    <li>
                        <strong className="text-white">Download the channel source code.</strong><br/>
                        This is different from the package above. This is a standard zip file for the Roku uploader.
                        <div className="my-3">
                            <button 
                                onClick={() => handleDownload('source')}
                                disabled={sourceStatus === 'generating'}
                                className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-bold py-2 px-5 rounded-lg text-sm transition-colors"
                            >
                                {sourceStatus === 'generating' ? 'Zipping Source...' : 'Download Source Code (.zip)'}
                            </button>
                             {sourceStatus === 'error' && <p className="text-red-300 text-sm mt-2">{errorMessage}</p>}
                        </div>
                    </li>
                    <li>
                        <strong className="text-white">Access the Roku Developer Uploader.</strong><br/>
                        In your web browser, go to <code className="bg-gray-700 p-1 rounded-md text-sm">http://&lt;your-roku-ip-address&gt;</code>.
                    </li>
                     <li>
                        <strong className="text-white">Upload and Install the Source Code.</strong><br/>
                        On the "Development Application Installer" page, upload the `.zip` file you just downloaded and click "Install". The channel will appear on your TV for testing.
                    </li>
                     <li>
                        <strong className="text-white">Create the Final Package.</strong><br/>
                        After testing, return to the web uploader page. While the app is installed, click the **"Package"** button. This will create and download the final, signed `.pkg` file. This is the file you can successfully upload to the main Roku Developer Dashboard.
                    </li>
                </ol>
                 <a href="https://developer.roku.com/docs/developer-program/getting-started/developer-setup.md#step-4-accessing-the-development-application-installer" target="_blank" rel="noopener noreferrer" className="text-sm text-purple-300 hover:underline mt-6 inline-block">View Official Roku Documentation &rarr;</a>
            </div>
        </div>
    );
};

export default RokuAdminTab;