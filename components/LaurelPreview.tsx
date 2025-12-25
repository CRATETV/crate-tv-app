
import React from 'react';

interface LaurelPreviewProps {
    movieTitle?: string;
    awardName: string;
    year: string;
    color: string;
}

const LaurelPreview: React.FC<LaurelPreviewProps> = ({ awardName, year, color }) => {
    // Professional Tapered Leaf - solid, elegant organic shape matching the provided reference
    const renderLeaf = (transform: string, key: string) => (
        <path 
            key={key}
            d="M0,0 C-3,-12 -8,-25 0,-35 C8,-25 3,-12 0,0 Z" 
            fill={color}
            transform={transform}
        />
    );

    // Tip detail (the 3-leaf crown at the very top as seen in high-end festivals)
    const renderTipCrown = (transform: string) => (
        <g transform={transform}>
            {/* Center Leaf */}
            <path d="M0,0 C-4,-12 -4,-22 0,-28 C4,-22 4,-12 0,0 Z" fill={color} />
            {/* Left Leaf */}
            <path d="M-4,-6 C-14,-12 -18,-22 -12,-28 C-6,-22 -3,-14 -4,-6 Z" fill={color} />
            {/* Right Leaf */}
            <path d="M4,-6 C14,-12 18,-22 12,-28 C6,-22 3,-14 4,-6 Z" fill={color} />
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
                    {/* Left Branch - No crossing at bottom for minimalist prestige feel */}
                    <g transform="translate(205, 360)">
                        {[...Array(11)].map((_, i) => (
                            renderLeaf(
                                `rotate(${i * -13 - 22}) translate(0, -120) scale(${1 - i * 0.02})`, 
                                `l-${i}`
                            )
                        ))}
                        {renderTipCrown("rotate(-172) translate(0, -125) scale(0.9)")}
                        {/* Minimalist Stem Line */}
                        <path 
                            d="M95,5 Q-115,-5 -105,-150" 
                            fill="none" 
                            stroke={color} 
                            strokeWidth="1.2" 
                            opacity="0.25" 
                        />
                    </g>

                    {/* Right Branch - Mirrored */}
                    <g transform="translate(395, 360)">
                        {[...Array(11)].map((_, i) => (
                            renderLeaf(
                                `rotate(${i * 13 + 22}) translate(0, -120) scale(${1 - i * 0.02})`, 
                                `r-${i}`
                            )
                        ))}
                        {renderTipCrown("rotate(172) translate(0, -125) scale(0.9)")}
                        <path 
                            d="M-95,5 Q 115,-5 105,-150" 
                            fill="none" 
                            stroke={color} 
                            strokeWidth="1.2" 
                            opacity="0.25" 
                        />
                    </g>
                </g>

                {/* Typography Hierarchy - Balanced for professional presentation */}
                <g fontFamily="'Inter', sans-serif" textAnchor="middle" fill={color}>
                    {/* AWARD CATEGORY */}
                    <text x="300" y="195" fontSize="13" fontWeight="700" className="uppercase tracking-[0.5em]" opacity="0.9">
                        {awardName}
                    </text>
                    
                    {/* BRANDING */}
                    <text x="300" y="270" fontSize="82" fontWeight="500" className="capitalize tracking-tight">
                        Crate
                    </text>
                    
                    {/* YEAR */}
                    <text x="300" y="320" fontSize="26" fontWeight="700" className="uppercase tracking-[0.6em]" opacity="0.7">
                        {year}
                    </text>
                </g>
            </svg>
        </div>
    );
};

export default LaurelPreview;
