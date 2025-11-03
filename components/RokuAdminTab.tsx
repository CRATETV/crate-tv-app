import React, { useState } from 'react';

const RokuAdminTab: React.FC = () => {
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    
    const feedUrl = `${window.location.origin}/api/roku-direct-publisher-feed`;
    
    const handleCopy = () => {
        navigator.clipboard.writeText(feedUrl).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        });
    };

    return (
        <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-bold text-purple-400 mb-4">Set Up Your Roku Direct Publisher Channel</h2>
                <p className="text-gray-300 mb-6">
                    To automate your Roku channel, you need to create a "Direct Publisher" channel in your Roku Developer account and give it the feed URL below. This is a one-time setup. Once complete, publishing changes from this admin panel will automatically update your Roku channel.
                </p>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Your Roku Feed URL</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            readOnly
                            value={feedUrl}
                            className="form-input flex-grow"
                        />
                        <button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">
                            {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                 <h3 className="text-xl font-semibold text-white mb-4">Step-by-Step Guide</h3>
                 <ol className="list-decimal list-inside space-y-4 text-gray-300">
                    <li>Log into your <a href="https://developer.roku.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Roku Developer Dashboard</a>.</li>
                    <li>Go to "My Channels" and click "Add Channel".</li>
                    <li>Select <strong className="text-white">"Direct Publisher"</strong> from the options.</li>
                    <li>Follow the on-screen prompts to enter your channel properties (name, description, etc.).</li>
                    <li>When you get to the <strong className="text-white">"Feed URL"</strong> section, paste the URL you copied from above.</li>
                    <li>Complete the rest of the channel setup (logos, parental controls, etc.).</li>
                    <li><strong className="text-white">Preview and Publish</strong> your new channel. It may take some time for Roku to review and approve it.</li>
                </ol>
            </div>
            
            <div className="bg-yellow-900/30 border border-yellow-800 text-yellow-300 text-sm rounded-lg p-6">
                <h3 className="font-bold text-lg mb-2">Important: What About the Old Channel?</h3>
                <p>
                    This process creates a <strong className="text-yellow-200">brand new, separate channel</strong>. Once your new Direct Publisher channel is live and you've confirmed it's working correctly, you should <strong className="text-yellow-200">unpublish the old SDK channel</strong> from your Roku Developer Dashboard. This will prevent new users from downloading the old version and ensure all your viewers migrate to the new, automatically updated channel.
                </p>
            </div>
        </div>
    );
};

export default RokuAdminTab;
