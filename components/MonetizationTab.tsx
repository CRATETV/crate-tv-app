import React from 'react';

const MonetizationTab: React.FC = () => {
    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Revenue & Monetization</h2>
            
            <div className="max-w-3xl">
                {/* Strategy 1: Direct Support */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-semibold text-white mb-2">Monetization Strategy: Community Support</h3>
                    <p className="text-gray-400 mb-4">
                        Crate TV focuses on a high-quality, ad-free viewer experience. Your primary revenue source is direct support from the community.
                    </p>
                    <p className="text-gray-400 mb-4">
                        The <strong className="text-purple-400">"Support Filmmaker"</strong> button is live on every movie page. This processes payments securely via Square, allowing viewers to tip filmmakers directly.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div className="p-4 bg-purple-900/20 rounded-md border border-purple-800/50">
                            <h4 className="font-bold text-purple-200 mb-1">Filmmaker Earnings</h4>
                            <p className="text-sm text-gray-400">
                                Filmmakers receive <strong>70%</strong> of all donations made to their films. This is automatically calculated in the "Payouts" tab.
                            </p>
                        </div>
                        <div className="p-4 bg-blue-900/20 rounded-md border border-blue-800/50">
                            <h4 className="font-bold text-blue-200 mb-1">Platform Sustainability</h4>
                            <p className="text-sm text-gray-400">
                                Crate TV retains <strong>30%</strong> of donations to cover hosting, streaming bandwidth, and payment processing fees.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-900/50 rounded-md border border-gray-600">
                        <p className="text-sm text-gray-300">
                            <strong>Tip:</strong> Share your "Top 10" lists on social media. Viewers are 3x more likely to donate after watching a highly-ranked film.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonetizationTab;