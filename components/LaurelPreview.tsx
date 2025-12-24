
import React from 'react';

interface LaurelPreviewProps {
    movieTitle?: string;
    awardName: string;
    year: string;
    color: string;
}

const LaurelPreview: React.FC<LaurelPreviewProps> = ({ awardName, year, color }) => {
    // This design mimics the high-density classic festival look:
    // Row 1: BEST [CATEGORY]
    // Row 2: CRATE
    // Row 3: CRATE [YEAR]
    return (
        <div className="flex items-center justify-center w-full h-full p-4">
            <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 600 450" 
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            >
                {/* Laurel Branches - Classic Dense Style */}
                <g fill={color}>
                    {/* Left Branch */}
                    <g transform="translate(150, 225) rotate(-5)">
                        {[...Array(18)].map((_, i) => (
                            <path 
                                key={`l-${i}`}
                                d="M0,0 C-10,-5 -22,-18 -22,-35 C-22,-18 -10,-5 0,0" 
                                transform={`rotate(${i * -10 - 20}) translate(0, -100)`}
                                className="opacity-95"
                            />
                        ))}
                        <path d="M0,105 Q-110,95 -105,-105" fill="none" stroke={color} strokeWidth="3" opacity="0.3" />
                    </g>

                    {/* Right Branch */}
                    <g transform="translate(450, 225) rotate(5)">
                        {[...Array(18)].map((_, i) => (
                            <path 
                                key={`r-${i}`}
                                d="M0,0 C10,-5 22,-18 22,-35 C22,-18 10,-5 0,0" 
                                transform={`rotate(${i * 10 + 20}) translate(0, -100)`}
                                className="opacity-95"
                            />
                        ))}
                        <path d="M0,105 Q 110,95 105,-105" fill="none" stroke={color} strokeWidth="3" opacity="0.3" />
                    </g>
                </g>

                {/* Text Content */}
                <g fontFamily="'Inter', sans-serif" textAnchor="middle" fill={color}>
                    {/* BEST [CATEGORY] */}
                    <text x="300" y="195" fontSize="24" fontWeight="700" className="uppercase tracking-[0.2em]">
                        {awardName}
                    </text>
                    
                    {/* CRATE (The main brand) */}
                    <text x="300" y="260" fontSize="88" fontWeight="900" className="uppercase" style={{ letterSpacing: '-2px' }}>
                        CRATE
                    </text>
                    
                    {/* CRATE [YEAR] */}
                    <text x="300" y="305" fontSize="20" fontWeight="600" className="uppercase tracking-[0.35em]" opacity="0.8">
                        CRATE {year}
                    </text>
                </g>
            </svg>
        </div>
    );
};

export default LaurelPreview;
