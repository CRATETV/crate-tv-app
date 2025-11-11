import React, { useState, useEffect } from 'react';

const MonetizationTab: React.FC = () => {
    const [adTagUrl, setAdTagUrl] = useState('');
    const [status, setStatus] = useState<'idle' | 'saved'>('idle');

    useEffect(() => {
        const savedUrl = localStorage.getItem('productionAdTagUrl') || '';
        setAdTagUrl(savedUrl);
    }, []);

    const handleSave = () => {
        localStorage.setItem('productionAdTagUrl', adTagUrl.trim());
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 3000);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Monetization Settings</h2>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-2">Programmatic Video Ads (VAST)</h3>
                <p className="text-gray-400 mb-4">
                    Enter the VAST ad tag URL provided by your video ad network (e.g., Google Ad Manager, VDO.AI, etc.). This will enable pre-roll video ads on all eligible films. If left blank, a sample ad will be used for testing purposes.
                </p>
                <div>
                    <label htmlFor="adTagUrl" className="block text-sm font-medium text-gray-300 mb-1">Production VAST Ad Tag URL</label>
                    <input
                        type="url"
                        id="adTagUrl"
                        value={adTagUrl}
                        onChange={(e) => setAdTagUrl(e.target.value)}
                        className="form-input"
                        placeholder="https://your-ad-network.com/vast.xml"
                    />
                </div>
                <div className="mt-4 flex items-center gap-4">
                    <button
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
                    >
                        Save Ad Tag
                    </button>
                    {status === 'saved' && <p className="text-green-400 text-sm">Settings saved!</p>}
                </div>
            </div>
        </div>
    );
};

export default MonetizationTab;