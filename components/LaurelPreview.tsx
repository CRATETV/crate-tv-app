
import React from 'react';

interface LaurelPreviewProps {
    movieTitle?: string;
    awardName: string;
    year: string;
    color: string;
}

const LaurelPreview: React.FC<LaurelPreviewProps> = ({ awardName, year, color }) => {
    // This design matches the provided image reference:
    // BEST [CATEGORY]
    // CRATE
    // CRATE [YEAR]
    return (
        <svg 
            width="600" 
            height="400" 
            viewBox="0 0 600 400" 
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-2xl"
        >
            <g fill={color}>
                {/* Left Laurel Branch - More detailed to match reference */}
                <g transform="translate(150, 200) rotate(-10)">
                    {[...Array(18)].map((_, i) => (
                        <path 
                            key={`l-${i}`}
                            d="M0,0 C-10,-5 -25,-25 -25,-40 C-25,-25 -10,-5 0,0" 
                            transform={`rotate(${i * -10 - 20}) translate(0, -90)`}
                        />
                    ))}
                    <path d="M-5,100 Q-110,90 -105,-100 Q-100,-110 -90,-100" fill="none" stroke={color} strokeWidth="3" opacity="0.3" />
                </g>

                {/* Right Laurel Branch */}
                <g transform="translate(450, 200) rotate(10)">
                    {[...Array(18)].map((_, i) => (
                        <path 
                            key={`r-${i}`}
                            d="M0,0 C10,-5 25,-25 25,-40 C25,-25 10,-5 0,0" 
                            transform={`rotate(${i * 10 + 20}) translate(0, -90)`}
                        />
                    ))}
                    <path d="M5,100 Q110,90 105,-100 Q100,-110 90,-100" fill="none" stroke={color} strokeWidth="3" opacity="0.3" />
                </g>
            </g>

            {/* Text Content - Matching the reference image layout */}
            <g fontFamily="'Inter', sans-serif" textAnchor="middle" fill={color}>
                {/* BEST [CATEGORY] */}
                <text x="300" y="170" fontSize="28" fontWeight="700" className="uppercase tracking-tight">
                    {awardName}
                </text>
                
                {/* CRATE */}
                <text x="300" y="230" fontSize="72" fontWeight="900" className="uppercase" style={{ letterSpacing: '-2px' }}>
                    CRATE
                </text>
                
                {/* CRATE [YEAR] */}
                <text x="300" y="270" fontSize="24" fontWeight="600" className="uppercase tracking-widest" opacity="0.9">
                    CRATE {year}
                </text>
            </g>
        </svg>
    );
};

export default LaurelPreview;
