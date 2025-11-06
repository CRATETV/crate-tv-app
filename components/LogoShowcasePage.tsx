import React from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';

const LogoCard: React.FC<{ title: string; children: React.ReactNode; bgColor?: string }> = ({ title, children, bgColor = 'bg-black' }) => (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <div className={`aspect-video ${bgColor} rounded-md flex items-center justify-center p-8`}>
            {children}
        </div>
    </div>
);

const LogoShowcasePage: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true} 
                onMobileSearchClick={() => {}}
                showSearch={false} 
            />
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                            Refined Logo Concepts
                        </h1>
                        <p className="text-lg text-gray-400">
                           Here are the new logo designs, rendered directly on this page for your review.
                        </p>
                    </div>

                    <div className="space-y-10">
                        <LogoCard title="Option 1: The Refined Geometric">
                            <svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style={{stopColor: '#8B5CF6', stopOpacity: 1}} />
                                        <stop offset="50%" style={{stopColor: '#EC4899', stopOpacity: 1}} />
                                        <stop offset="100%" style={{stopColor: '#F97316', stopOpacity: 1}} />
                                    </linearGradient>
                                </defs>
                                <path d="M50 50 H 10 V 110" stroke="url(#grad1)" strokeWidth="3" fill="none" />
                                <path d="M350 50 H 390 V 110" stroke="url(#grad1)" strokeWidth="3" fill="none" />
                                
                                <text x="200" y="95" fontFamily="Inter, sans-serif" fontSize="60" fontWeight="bold" fill="white" textAnchor="middle" letterSpacing="-2">
                                    CR<tspan baselineShift="-10" fontSize="70">A</tspan>TE
                                </text>
                                
                                <text x="285" y="125" fontFamily="Inter, sans-serif" fontSize="12" fill="white" textAnchor="middle">
                                    Television powered by creatives
                                </text>
                            </svg>
                        </LogoCard>

                        <LogoCard title="Option 2: The Cinematic Light">
                             <svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="grad2" x1="0%" y1="100%" x2="0%" y2="0%">
                                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
                                        <stop offset="50%" stopColor="#8B5CF6" stopOpacity="1" />
                                        <stop offset="100%" stopColor="#EC4899" stopOpacity="1" />
                                    </linearGradient>
                                     <linearGradient id="grad3" x1="100%" y1="0%" x2="0%" y2="0%">
                                        <stop offset="0%" stopColor="#F97316" stopOpacity="0" />
                                        <stop offset="50%" stopColor="#F97316" stopOpacity="1" />
                                        <stop offset="100%" stopColor="#EC4899" stopOpacity="1" />
                                    </linearGradient>
                                </defs>
                                <path d="M50 50 H 10 V 110" stroke="url(#grad2)" strokeWidth="4" fill="none" />
                                <path d="M350 50 H 390 V 110" stroke="url(#grad3)" strokeWidth="4" fill="none" />
                                
                                <text x="200" y="95" fontFamily="Inter, sans-serif" fontSize="60" fontWeight="bold" fill="white" textAnchor="middle" letterSpacing="-2">
                                    CR<tspan baselineShift="-10" fontSize="70">A</tspan>TE
                                </text>
                                
                                <text x="285" y="125" fontFamily="Inter, sans-serif" fontSize="12" fill="white" textAnchor="middle">
                                    Television powered by creatives
                                </text>
                            </svg>
                        </LogoCard>

                        <LogoCard title="Monochromatic Version (for Versatility)" bgColor="bg-gray-700">
                            <svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg">
                                <path d="M50 50 H 10 V 110" stroke="white" strokeWidth="3" fill="none" />
                                <path d="M350 50 H 390 V 110" stroke="white" strokeWidth="3" fill="none" />
                                
                                <text x="200" y="95" fontFamily="Inter, sans-serif" fontSize="60" fontWeight="bold" fill="white" textAnchor="middle" letterSpacing="-2">
                                    CR<tspan baselineShift="-10" fontSize="70">A</tspan>TE
                                </text>
                                
                                <text x="285" y="125" fontFamily="Inter, sans-serif" fontSize="12" fill="white" textAnchor="middle">
                                    Television powered by creatives
                                </text>
                            </svg>
                        </LogoCard>
                    </div>
                </div>
            </main>
            <CollapsibleFooter />
        </div>
    );
};

export default LogoShowcasePage;
