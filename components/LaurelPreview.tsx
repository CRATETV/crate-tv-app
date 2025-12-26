
import React from 'react';

interface LaurelPreviewProps {
    movieTitle?: string;
    awardName: string;
    year: string;
    color: string;
    customUrl?: string;
}

const LaurelPreview: React.FC<LaurelPreviewProps> = ({ awardName, year, color, customUrl }) => {
    // If a custom URL is provided, display that instead of generating the SVG.
    if (customUrl) {
        return (
            <div className="flex items-center justify-center w-full h-full pointer-events-none select-none p-4">
                <img 
                    src={customUrl} 
                    alt={`${awardName} ${year}`} 
                    className="w-full max-w-[95%] h-auto object-contain drop-shadow-[0_8px_25px_rgba(0,0,0,0.9)]" 
                />
            </div>
        );
    }

    /**
     * LEAN PETAL ENGINE V4.0
     * Features 20 needle-petals per side with precise angular distribution.
     */
    const petalPath = "M0,0 C-3,-10 -6,-35 0,-65 C6,-35 3,-10 0,0 Z";

    return (
        <div className="flex items-center justify-center w-full h-full p-4 pointer-events-none select-none">
            <svg 
                id="laurelSvg"
                width="100%" 
                height="100%" 
                viewBox="0 0 1000 1000" 
                xmlns="http://www.w3.org/2000/svg"
            >
                <g transform="translate(500, 600)">
                    {/* Left Branch (20 Petals) */}
                    <g transform="translate(-130, 0)">
                        {[...Array(20)].map((_, i) => {
                            const scale = 1.1 - (i * 0.04);
                            const rotate = -12 - (i * 7.5); 
                            const dist = -280;
                            return (
                                <path 
                                    key={`l-${i}`}
                                    d={petalPath}
                                    fill={color}
                                    transform={`rotate(${rotate}) translate(0, ${dist}) scale(${scale})`}
                                />
                            );
                        })}
                    </g>

                    {/* Right Branch (20 Petals) */}
                    <g transform="translate(130, 0)">
                        {[...Array(20)].map((_, i) => {
                            const scale = 1.1 - (i * 0.04);
                            const rotate = 12 + (i * 7.5); 
                            const dist = -280;
                            return (
                                <path 
                                    key={`r-${i}`}
                                    d={petalPath}
                                    fill={color}
                                    transform={`rotate(${rotate}) translate(0, ${dist}) scale(${scale})`}
                                />
                            );
                        })}
                    </g>

                    {/* Elite Crown (V4 Flourish) */}
                    <g transform="translate(0, -385) scale(0.65)">
                         <path d={petalPath} fill={color} />
                         <path d={petalPath} fill={color} transform="rotate(-30) translate(0, 8) scale(0.9)" />
                         <path d={petalPath} fill={color} transform="rotate(30) translate(0, 8) scale(0.9)" />
                    </g>
                </g>

                {/* SIGNATURE STUDIO V4 TYPOGRAPHY */}
                <g fontFamily="'Inter', sans-serif" textAnchor="middle" fill={color}>
                    {/* AWARD CATEGORY */}
                    <text 
                        x="500" 
                        y="460" 
                        fontSize="20" 
                        fontWeight="900" 
                        className="uppercase" 
                        style={{ letterSpacing: '1.4em', textTransform: 'uppercase' }} 
                        opacity="0.8"
                    >
                        {awardName}
                    </text>
                    
                    {/* CORE BRANDING */}
                    <text 
                        x="500" 
                        y="575" 
                        fontSize="130" 
                        fontWeight="900" 
                        dominantBaseline="middle"
                        className="uppercase"
                        style={{ letterSpacing: '-0.03em', textTransform: 'uppercase' }}
                    >
                        CRATE
                    </text>
                    
                    {/* YEAR STAMP */}
                    <text 
                        x="500" 
                        y="685" 
                        fontSize="40" 
                        fontWeight="500" 
                        className="uppercase" 
                        style={{ letterSpacing: '0.8em', textTransform: 'uppercase' }} 
                        opacity="0.7"
                    >
                        {year}
                    </text>
                </g>
            </svg>
        </div>
    );
};

export default LaurelPreview;
