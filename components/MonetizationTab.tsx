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
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">AI-Powered Monetization for Video</h2>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-2">Step 1: Partner with a Video Ad Platform</h3>
                <p className="text-gray-400 mb-4">
                    Since AdSense approval can be challenging, a great alternative for video-heavy sites like Crate TV is <strong className="text-purple-400">VDO.AI</strong>. They are an AI-powered platform specifically designed to maximize revenue from video ads and are known for a straightforward, self-service approval process.
                </p>
                <a 
                    href="https://vdo.ai/publisher-signup/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105"
                >
                    Sign Up for VDO.AI
                </a>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-2">Step 2: Activate Your Ads</h3>
                <p className="text-gray-400 mb-4">
                    Once your account is approved, VDO.AI will provide you with a VAST Ad Tag URL. This is the link that serves video ads to your platform. Paste it below and click "Save" to activate monetization. If left blank, a sample ad will run for testing purposes.
                </p>
                <div>
                    <label htmlFor="adTagUrl" className="block text-sm font-medium text-gray-300 mb-1">Production VAST Ad Tag URL</label>
                    <input
                        type="url"
                        id="adTagUrl"
                        value={adTagUrl}
                        onChange={(e) => setAdTagUrl(e.target.value)}
                        className="form-input"
                        placeholder="https://pub.vdo.ai/..."
                    />
                </div>
                <div className="mt-4 flex items-center gap-4">
                    <button
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
                    >
                        Save & Activate Ads
                    </button>
                    {status === 'saved' && <p className="text-green-400 text-sm">Ad settings saved!</p>}
                </div>
            </div>
        </div>
    );
};

export default MonetizationTab;