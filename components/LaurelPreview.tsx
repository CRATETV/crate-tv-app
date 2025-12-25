
import React from 'react';

interface LaurelPreviewProps {
    movieTitle?: string;
    awardName: string;
    year: string;
    color: string;
}

const LaurelPreview: React.FC<LaurelPreviewProps> = ({ awardName, year, color }) => {
    // Modern Tapered Leaf - sharper, more stylized point for a premium look
    const renderLeaf = (transform: string, key: string) => (
        <path 
            key={key}
            d="M0,0 C-1,-15 -5,-32 0,-46 C5,-32 1,-15 0,0 Z" 
            fill={color}
            transform={transform}
        />
    );

    // Modern 3-leaf tip crown - sharper geometry
    const renderTipCrown = (transform: string) => (
        <g transform={transform}>
            {/* Center Leaf */}
            <path d="M0,0 C-2,-12 -2,-25 0,-34 C2,-25 2,-12 0,0 Z" fill={color} />
            {/* Left Leaf */}
            <path d="M-4,-6 C-12,-15 -18,-25 -10,-32 C-4,-25 -2,-14 -4,-6 Z" fill={color} />
            {/* Right Leaf */}
            <path d="M4,-6 C12,-15 18,-25 10,-32 C4,-25 2,-14 4,-6 Z" fill={color} />
        </g>
    );

    return (
        <div className="flex items-center justify-center w-full h-full p-4 pointer-events-none select-none">
            <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 600 500" 
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Laurel Branches */}
                <g>
                    {/* Left Branch - No Stem lines for minimalist feel */}
                    <g transform="translate(205, 360)">
                        {[...Array(11)].map((_, i) => (
                            renderLeaf(
                                `rotate(${i * -13 - 22}) translate(0, -125) scale(${1 - i * 0.02})`, 
                                `l-${i}`
                            )
                        ))}
                        {renderTipCrown("rotate(-172) translate(0, -130) scale(0.85)")}
                    </g>

                    {/* Right Branch - Mirrored */}
                    <g transform="translate(395, 360)">
                        {[...Array(11)].map((_, i) => (
                            renderLeaf(
                                `rotate(${i * 13 + 22}) translate(0, -125) scale(${1 - i * 0.02})`, 
                                `r-${i}`
                            )
                        ))}
                        {renderTipCrown("rotate(172) translate(0, -130) scale(0.85)")}
                    </g>
                </g>

                {/* Typography Hierarchy - Perfectly Centered and Spaced */}
                <g fontFamily="'Inter', sans-serif" textAnchor="middle" fill={color}>
                    {/* AWARD CATEGORY - Positioned for optimal crescent balance */}
                    <text x="300" y="195" fontSize="14" fontWeight="800" className="uppercase tracking-[0.55em]" style={{ letterSpacing: '0.55em' }} opacity="0.95">
                        {awardName}
                    </text>
                    
                    {/* BRANDING */}
                    <text x="300" y="270" fontSize="88" fontWeight="500" className="capitalize tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                        Crate
                    </text>
                    
                    {/* YEAR */}
                    <text x="300" y="325" fontSize="28" fontWeight="700" className="uppercase tracking-[0.6em]" style={{ letterSpacing: '0.6em' }} opacity="0.75">
                        {year}
                    </text>
                </g>
            </svg>
        </div>
    );
};

export default LaurelPreview;
