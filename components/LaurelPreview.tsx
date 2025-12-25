
import React from 'react';

interface LaurelPreviewProps {
    movieTitle?: string;
    awardName: string;
    year: string;
    color: string;
}

const LaurelPreview: React.FC<LaurelPreviewProps> = ({ awardName, year, color }) => {
    // Generate a unique ID for the gradient to avoid collisions
    const gradId = `leafGrad-${color.replace('#', '')}`;

    // Pointed, symmetrical almond-shaped leaf with a center spine for 3D effect
    const render3DLeaf = (transform: string, key: string) => (
        <g key={key} transform={transform}>
            {/* Left half of leaf (slightly darker) */}
            <path 
                d="M0,0 C-4,-12 -12,-28 -12,-45 C-12,-28 -4,-12 0,0" 
                fill={`url(#${gradId}-dark)`}
            />
            {/* Right half of leaf (slightly lighter) */}
            <path 
                d="M0,0 C4,-12 12,-28 12,-45 C12,-28 4,-12 0,0" 
                fill={`url(#${gradId}-light)`}
            />
        </g>
    );

    return (
        <div className="flex items-center justify-center w-full h-full p-4 pointer-events-none">
            <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 600 450" 
                xmlns="http://www.w3.org/2000/svg"
                className="filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]"
            >
                <defs>
                    <linearGradient id={`${gradId}-light`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.8 }} />
                    </linearGradient>
                    <linearGradient id={`${gradId}-dark`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.7 }} />
                        <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.9 }} />
                    </linearGradient>
                </defs>

                {/* Laurel Branches */}
                <g>
                    {/* Left Branch - 22 layered leaves for high-density metallic look */}
                    <g transform="translate(155, 230) rotate(-6)">
                        {[...Array(22)].map((_, i) => (
                            render3DLeaf(`rotate(${i * -8.5 - 20}) translate(0, -100) scale(${1 - i * 0.015})`, `l-${i}`)
                        ))}
                        {/* Stem */}
                        <path d="M0,105 Q-115,95 -110,-115" fill="none" stroke={color} strokeWidth="4" opacity="0.4" />
                    </g>

                    {/* Right Branch */}
                    <g transform="translate(445, 230) rotate(6)">
                        {[...Array(22)].map((_, i) => (
                            render3DLeaf(`rotate(${i * 8.5 + 20}) translate(0, -100) scale(${1 - i * 0.015})`, `r-${i}`)
                        ))}
                        {/* Stem */}
                        <path d="M0,105 Q 115,95 110,-115" fill="none" stroke={color} strokeWidth="4" opacity="0.4" />
                    </g>
                    
                    {/* Crossed Stems (The 'X' at the bottom) */}
                    <path d="M285,340 L315,310" stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.9" />
                    <path d="M315,340 L285,310" stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.9" />
                </g>

                {/* Text Content - Professional hierarchy */}
                <g fontFamily="'Inter', sans-serif" textAnchor="middle" fill={color}>
                    {/* Category Label */}
                    <text x="300" y="195" fontSize="22" fontWeight="700" className="uppercase tracking-[0.2em]">
                        {awardName}
                    </text>
                    
                    {/* Brand Branding (Centerpiece) */}
                    <text x="300" y="265" fontSize="104" fontWeight="900" className="uppercase" style={{ letterSpacing: '-5px' }}>
                        CRATE
                    </text>
                    
                    {/* Year / Bottom Label */}
                    <text x="300" y="315" fontSize="22" fontWeight="600" className="uppercase tracking-[0.5em]" opacity="0.95">
                        CRATE {year}
                    </text>
                </g>
            </svg>
        </div>
    );
};

export default LaurelPreview;
