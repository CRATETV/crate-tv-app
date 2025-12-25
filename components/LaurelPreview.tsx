
import React from 'react';

interface LaurelPreviewProps {
    movieTitle?: string;
    awardName: string;
    year: string;
    color: string;
}

const LaurelPreview: React.FC<LaurelPreviewProps> = ({ awardName, year, color }) => {
    // Utility to adjust color brightness for the beveled effect
    const adjustColor = (hex: string, amt: number) => {
        let usePound = false;
        if (hex[0] === "#") {
            hex = hex.slice(1);
            usePound = true;
        }
        const num = parseInt(hex, 16);
        let r = (num >> 16) + amt;
        if (r > 255) r = 255;
        else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amt;
        if (b > 255) b = 255;
        else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amt;
        if (g > 255) g = 255;
        else if (g < 0) g = 0;
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    };

    const highlightColor = adjustColor(color, 45);
    const midColor = color;
    const shadowColor = adjustColor(color, -55);
    const deepShadowColor = adjustColor(color, -110);

    const gradId = `laurelGrad-${color.replace('#', '')}`;

    // Single Beveled Leaf: Two paths meeting at a center spine
    const renderBeveledLeaf = (transform: string, key: string) => (
        <g key={key} transform={transform}>
            {/* Shadow Side (Left half) */}
            <path 
                d="M0,0 C-3,-10 -14,-25 -14,-42 C-14,-25 -3,-10 0,0" 
                fill={`url(#${gradId}-shadow)`}
            />
            {/* Highlight Side (Right half) */}
            <path 
                d="M0,0 C3,-10 14,-25 14,-42 C14,-25 3,-10 0,0" 
                fill={`url(#${gradId}-highlight)`}
            />
            {/* Center Spine Crease */}
            <path d="M0,0 L0,-42" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" fill="none" />
        </g>
    );

    return (
        <div className="flex items-center justify-center w-full h-full p-4 pointer-events-none select-none">
            <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 600 450" 
                xmlns="http://www.w3.org/2000/svg"
                className="filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)]"
            >
                <defs>
                    <linearGradient id={`${gradId}-highlight`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: highlightColor, stopOpacity: 1 }} />
                        <stop offset="50%" style={{ stopColor: midColor, stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: shadowColor, stopOpacity: 1 }} />
                    </linearGradient>
                    
                    <linearGradient id={`${gradId}-shadow`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: shadowColor, stopOpacity: 1 }} />
                        <stop offset="60%" style={{ stopColor: deepShadowColor, stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#000000', stopOpacity: 1 }} />
                    </linearGradient>

                    <linearGradient id={`${gradId}-text`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: highlightColor, stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: shadowColor, stopOpacity: 1 }} />
                    </linearGradient>
                </defs>

                {/* Laurel Branches */}
                <g>
                    {/* Left Branch */}
                    <g transform="translate(190, 240) rotate(-12)">
                        {[...Array(10)].map((_, i) => (
                            renderBeveledLeaf(
                                `rotate(${i * -13 - 22}) translate(0, -125) scale(${1.1 - i * 0.06})`, 
                                `l-${i}`
                            )
                        ))}
                        <path d="M0,110 Q-120,90 -110,-130" fill="none" stroke={color} strokeWidth="2.5" opacity="0.15" />
                    </g>

                    {/* Right Branch */}
                    <g transform="translate(410, 240) rotate(12)">
                        {[...Array(10)].map((_, i) => (
                            renderBeveledLeaf(
                                `rotate(${i * 13 + 22}) translate(0, -125) scale(${1.1 - i * 0.06})`, 
                                `r-${i}`
                            )
                        ))}
                        <path d="M0,110 Q 120,90 110,-130" fill="none" stroke={color} strokeWidth="2.5" opacity="0.15" />
                    </g>
                    
                    {/* The 'X' Cross at Bottom Center */}
                    <g stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.8">
                        <path d="M275,365 L325,325" />
                        <path d="M325,365 L275,325" />
                    </g>
                </g>

                {/* Typography Hierarchy */}
                <g fontFamily="'Inter', sans-serif" textAnchor="middle" fill={`url(#${gradId}-text)`}>
                    <text x="300" y="190" fontSize="18" fontWeight="800" className="uppercase tracking-[0.45em]">
                        {awardName}
                    </text>
                    <text x="300" y="278" fontSize="118" fontWeight="900" className="uppercase" style={{ letterSpacing: '-7px' }}>
                        CRATE
                    </text>
                    <text x="300" y="335" fontSize="28" fontWeight="700" className="uppercase tracking-[0.65em]" opacity="0.8">
                        {year}
                    </text>
                </g>
            </svg>
        </div>
    );
};

export default LaurelPreview;
