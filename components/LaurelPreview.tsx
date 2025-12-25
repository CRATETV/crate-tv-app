
import React from 'react';

interface LaurelPreviewProps {
    movieTitle?: string;
    awardName: string;
    year: string;
    color: string;
}

const LaurelPreview: React.FC<LaurelPreviewProps> = ({ awardName, year, color }) => {
    // Elegant Tapered Teardrop Leaf - "Cute" but Prestigious
    const renderLeaf = (transform: string, key: string) => (
        <path 
            key={key}
            d="M0,0 C-1.5,-12 -5,-28 0,-42 C5,-28 1.5,-12 0,0 Z" 
            fill={color}
            transform={transform}
        />
    );

    // Refined Triple-Tip Crown - The "Signature" of high-end laurels
    const renderTipCrown = (transform: string) => (
        <g transform={transform}>
            {/* Center Leaf */}
            <path d="M0,0 C-2,-10 -2,-22 0,-30 C2,-22 2,-10 0,0 Z" fill={color} />
            {/* Left Leaf */}
            <path d="M-3,-5 C-10,-12 -15,-22 -8,-28 C-3,-22 -1,-12 -3,-5 Z" fill={color} />
            {/* Right Leaf */}
            <path d="M3,-5 C10,-12 15,-22 8,-28 C3,-22 1,-12 3,-5 Z" fill={color} />
        </g>
    );

    return (
        <div className="flex items-center justify-center w-full h-full p-4 pointer-events-none select-none">
            <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 600 600" 
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Laurel Branches - Symmetrical & Full */}
                <g transform="translate(0, 30)">
                    {/* Left Branch */}
                    <g transform="translate(215, 380)">
                        {[...Array(13)].map((_, i) => (
                            renderLeaf(
                                `rotate(${i * -12.5 - 20}) translate(0, -135) scale(${1 - i * 0.015})`, 
                                `l-${i}`
                            )
                        ))}
                        {renderTipCrown("rotate(-188) translate(0, -140) scale(0.9)")}
                    </g>

                    {/* Right Branch */}
                    <g transform="translate(385, 380)">
                        {[...Array(13)].map((_, i) => (
                            renderLeaf(
                                `rotate(${i * 12.5 + 20}) translate(0, -135) scale(${1 - i * 0.015})`, 
                                `r-${i}`
                            )
                        ))}
                        {renderTipCrown("rotate(188) translate(0, -140) scale(0.9)")}
                    </g>
                </g>

                {/* Typography - Absolute Mathematical Centering */}
                <g fontFamily="'Inter', sans-serif" textAnchor="middle" fill={color}>
                    {/* AWARD CATEGORY - Centered vertically in the crescent gap */}
                    <text 
                        x="300" 
                        y="230" 
                        fontSize="14" 
                        fontWeight="800" 
                        className="uppercase" 
                        style={{ letterSpacing: '0.5em' }} 
                        opacity="0.95"
                    >
                        {awardName}
                    </text>
                    
                    {/* BRANDING - Main Focus */}
                    <text 
                        x="300" 
                        y="305" 
                        fontSize="84" 
                        fontWeight="500" 
                        className="capitalize" 
                        style={{ letterSpacing: '-0.02em' }}
                    >
                        Crate
                    </text>
                    
                    {/* YEAR - Balanced Footer */}
                    <text 
                        x="300" 
                        y="355" 
                        fontSize="26" 
                        fontWeight="700" 
                        className="uppercase" 
                        style={{ letterSpacing: '0.6em' }} 
                        opacity="0.75"
                    >
                        {year}
                    </text>
                </g>
            </svg>
        </div>
    );
};

export default LaurelPreview;
