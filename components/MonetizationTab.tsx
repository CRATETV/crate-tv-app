
import React, { useState, useEffect } from 'react';
import { useFestival } from '../contexts/FestivalContext';

const MonetizationTab: React.FC = () => {
    const { adConfig } = useFestival();
    const [adTagUrl, setAdTagUrl] = useState('');
    const [adScript, setAdScript] = useState('');
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (adConfig) {
            setAdTagUrl(adConfig.vastTagUrl || '');
            setAdScript(adConfig.socialBarScript || '');
        }
    }, [adConfig]);

    const handleSave = async () => {
        setStatus('saving');
        setErrorMessage('');
        const password = sessionStorage.getItem('adminPassword');
        
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    type: 'ads',
                    data: {
                        socialBarScript: adScript.trim(),
                        vastTagUrl: adTagUrl.trim()
                    }
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save ad settings.');
            }

            setStatus('saved');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
            setStatus('error');
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Revenue & Monetization</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Strategy 1: Direct Support */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-semibold text-white mb-2">Strategy 1: Community Support (Active)</h3>
                    <p className="text-gray-400 mb-4">
                        Since AdSense often rejects new streaming platforms, your best revenue source right now is direct viewer support.
                    </p>
                    <p className="text-gray-400 mb-4">
                        The <strong className="text-purple-400">"Support Filmmaker"</strong> button is live on every movie page. This processes payments via Square, bypassing ad networks entirely.
                    </p>
                    <div className="p-4 bg-purple-900/20 rounded-md border border-purple-800/50">
                        <p className="text-sm text-purple-200">
                            <strong>Tip:</strong> Share your "Top 10" lists on social media. Viewers are 3x more likely to donate after watching a highly-ranked film.
                        </p>
                    </div>
                </div>

                {/* Strategy 2: Ad Networks */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-semibold text-white mb-2">Strategy 2: Ad Networks</h3>
                    <p className="text-gray-400 mb-4">
                        We recommend <strong>Adsterra</strong> or <strong>PropellerAds</strong> for streaming sites.
                    </p>
                    
                    <div className="mb-6 space-y-6">
                        {/* Option A: Social Bar */}
                        <div className="bg-gray-900/50 p-4 rounded-md border border-gray-600">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                <span className="bg-green-500 text-black text-xs px-2 py-0.5 rounded">RECOMMENDED</span>
                                Option A: Social Bar (High Earnings)
                            </h4>
                            <p className="text-xs text-gray-400 mb-2">
                                1. On your Adsterra Dashboard, find the <strong>Social Bar</strong> row (Active).<br/>
                                2. Click the <strong>Get Code</strong> button next to it.<br/>
                                3. Copy the entire script code it gives you (starts with <code>&lt;script...</code>) and paste it below.
                            </p>
                            <textarea
                                value={adScript}
                                onChange={(e) => setAdScript(e.target.value)}
                                className="form-input w-full font-mono text-xs"
                                rows={4}
                                placeholder="Paste the full code here: <script type='text/javascript' src='//...'></script>"
                            />
                        </div>

                        {/* Option B: Video VAST */}
                        <div className="bg-gray-900/50 p-4 rounded-md border border-gray-600">
                            <h4 className="font-bold text-white mb-2">Option B: Video Player Ads (VAST)</h4>
                            <p className="text-xs text-gray-400 mb-2">
                                Requires <strong>"Video VAST"</strong> approval from support. Paste the VAST URL here to play ads before movies.
                            </p>
                            <input
                                type="url"
                                value={adTagUrl}
                                onChange={(e) => setAdTagUrl(e.target.value)}
                                className="form-input w-full"
                                placeholder="https://pub.propellerads.com/..."
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleSave}
                                disabled={status === 'saving'}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-2 px-4 rounded-md transition-colors w-full"
                            >
                                {status === 'saving' ? 'Publishing Global Ads...' : 'Save Ad Settings'}
                            </button>
                            {status === 'saved' && <p className="text-green-400 text-sm animate-pulse">Saved & Published!</p>}
                            {status === 'error' && <p className="text-red-400 text-sm">{errorMessage}</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonetizationTab;
