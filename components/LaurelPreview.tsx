
import React from 'react';

interface LaurelPreviewProps {
    movieTitle?: string;
    awardName: string;
    year: string;
    color: string;
}

const LaurelPreview: React.FC<LaurelPreviewProps> = ({ awardName, year, color }) => {
    // This refined design uses pointed leaf paths to mimic classic hand-drawn festival laurels.
    const renderLeaf = (transform: string, key: string) => (
        <path 
            key={key}
            d="M0,0 C-5,-10 -15,-25 -15,-40 C-15,-25 -5,-10 0,0 C5,-10 15,-25 15,-40 C15,-25 5,-10 0,0" 
            transform={transform}
            className="opacity-95"
        />
    );

    return (
        <div className="flex items-center justify-center w-full h-full p-4 pointer-events-none">
            <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 600 450" 
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]"
            >
                {/* Laurel Branches */}
                <g fill={color}>
                    {/* Left Branch - 18 overlapping organic leaves */}
                    <g transform="translate(160, 225) rotate(-5)">
                        {[...Array(18)].map((_, i) => (
                            renderLeaf(`rotate(${i * -10 - 25}) translate(0, -105) scale(0.8, 1.2)`, `l-${i}`)
                        ))}
                        <path d="M0,110 Q-120,100 -115,-110" fill="none" stroke={color} strokeWidth="3.5" opacity="0.4" />
                    </g>

                    {/* Right Branch */}
                    <g transform="translate(440, 225) rotate(5)">
                        {[...Array(18)].map((_, i) => (
                            renderLeaf(`rotate(${i * 10 + 25}) translate(0, -105) scale(0.8, 1.2)`, `r-${i}`)
                        ))}
                        <path d="M0,110 Q 120,100 115,-110" fill="none" stroke={color} strokeWidth="3.5" opacity="0.4" />
                    </g>
                </g>

                {/* Typography - Exactly tuned to the user's reference photo layout */}
                <g fontFamily="'Inter', sans-serif" textAnchor="middle" fill={color}>
                    {/* TOP ROW: BEST [CATEGORY] */}
                    <text x="300" y="195" fontSize="22" fontWeight="700" className="uppercase tracking-[0.25em]">
                        {awardName}
                    </text>
                    
                    {/* CENTER ROW: CRATE (Branding) */}
                    <text x="300" y="265" fontSize="94" fontWeight="900" className="uppercase" style={{ letterSpacing: '-3px' }}>
                        CRATE
                    </text>
                    
                    {/* BOTTOM ROW: CRATE [YEAR] */}
                    <text x="300" y="315" fontSize="22" fontWeight="600" className="uppercase tracking-[0.4em]" opacity="0.9">
                        CRATE {year}
                    </text>
                </g>
            </svg>
        </div>
    );
};

export default LaurelPreview;
