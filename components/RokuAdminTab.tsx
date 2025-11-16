import React, { useState } from 'react';

const Step: React.FC<{ number: string; title: string; children: React.ReactNode; }> = ({ number, title, children }) => (
    <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-purple-600/20 text-purple-300 rounded-full flex items-center justify-center border-2 border-purple-500 font-bold text-lg">
            {number}
        </div>
        <div>
            <h4 className="text-lg font-bold text-white">{title}</h4>
            <div className="text-gray-300 leading-relaxed text-sm space-y-2">{children}</div>
        </div>
    </div>
);


const RokuAdminTab: React.FC = () => {
    const [sourceStatus, setSourceStatus] = useState<'idle' | 'generating' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleDownloadSource = async () => {
        setSourceStatus('generating');
        setErrorMessage('');
        const password = sessionStorage.getItem('adminPassword');

        try {
            const response = await fetch('/api/generate-roku-source-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to generate source file.`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cratetv-source.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setSourceStatus('idle');

        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
            setSourceStatus('error');
            setTimeout(() => setSourceStatus('idle'), 5000);
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-purple-400">Publishing Your Custom Roku Channel</h2>
            <p className="text-gray-300">
                The "incorrectly packaged" error from Roku means the upload was not signed by a Roku device. Follow this official process to create a valid, signed package for the Channel Store.
            </p>

            <div className="space-y-10">
                <Step number="1" title="Enable Developer Mode on Your Roku">
                    <p>On your Roku remote, press the following sequence:</p>
                    <code className="bg-gray-700 p-2 rounded-md text-purple-300 font-mono">Home (3x), Up (2x), Right, Left, Right, Left, Right</code>
                    <p>Follow the on-screen steps and take note of the IP address shown on your TV.</p>
                </Step>
                
                <Step number="2" title="Download Your Channel's Source Code">
                     <p>Click the button below to download the latest version of your channel's source code, ready for sideloading.</p>
                     <button 
                        onClick={handleDownloadSource}
                        disabled={sourceStatus === 'generating'}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-sm transition-colors disabled:bg-gray-600 mt-2"
                    >
                        {sourceStatus === 'generating' ? 'Zipping Source...' : 'Download Channel Source (.zip)'}
                    </button>
                    {sourceStatus === 'error' && <p className="text-red-400 text-sm mt-2">{errorMessage}</p>}
                </Step>

                <Step number="3" title="Sideload and Package on Your Roku Device">
                    <p>In a web browser on your computer, navigate to your Roku's IP address (e.g., <code className="bg-gray-700 p-1 rounded-md text-xs">http://192.168.1.100</code>).</p>
                    <ol className="list-decimal list-inside space-y-2 pl-4 mt-2">
                        <li>On the "Development Application Installer" page, click **Upload** and select the <code className="bg-gray-700 p-1 rounded-md text-xs">cratetv-source.zip</code> file you just downloaded.</li>
                        <li>After it installs, click the **Packager** link on the top-right of the page.</li>
                        <li>
                            **First-Time Setup:** If 'Packager' isn't clickable, you need to generate a signing key. Telnet into your device (port 8080) and run the `genkey` command. This is a one-time setup per device.
                        </li>
                        <li>Enter a password for your key, then click **Package**.</li>
                        <li>Click the purple link to download the final, signed <strong className="text-white">.pkg</strong> file to your computer.</li>
                    </ol>
                </Step>
                
                <Step number="4" title="Upload the Final Package to the Channel Store">
                    <p>
                        Log in to your <a href="https://developer.roku.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Roku Developer Dashboard</a>. Go to "Manage My Channels," select your channel, and navigate to the "Package Upload" page.
                    </p>
                    <p>Upload the <strong className="text-white">.pkg file</strong> you downloaded from your Roku device. This package is correctly signed and will be accepted by the store.</p>
                </Step>
            </div>
             <div className="mt-12 bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <h3 className="font-bold text-lg mb-2 text-white">What About Updates?</h3>
                <p className="text-gray-300 text-sm"><strong className="text-green-400">Content Updates:</strong> Adding new movies or changing categories in your admin panel will appear on your Roku channel <strong className="text-green-400">automatically</strong>. No new package is needed.</p>
                <p className="text-gray-300 mt-2 text-sm"><strong className="text-yellow-400">App Updates:</strong> You only need to repeat these steps if there is a code change to the Roku channel itself (e.g., a new feature or bug fix).</p>
            </div>
        </div>
    );
};

export default RokuAdminTab;
