import React from 'react';

interface LaurelPreviewProps {
    movieTitle?: string;
    awardName: string;
    year: string;
    color: string;
    customUrl?: string;
}

const LaurelPreview: React.FC<LaurelPreviewProps> = ({ awardName, year, color, customUrl }) => {
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
     * LEAN NEEDLE ENGINE V4.0
     * Features 20 needle-petals per side with 145-unit lateral expansion.
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
                    <g transform="translate(-145, 0)">
                        {[...Array(20)].map((_, i) => {
                            const scale = 1.1 - (i * 0.042);
                            const rotate = -12 - (i * 7.4); 
                            const dist = -285;
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
                    <g transform="translate(145, 0)">
                        {[...Array(20)].map((_, i) => {
                            const scale = 1.1 - (i * 0.042);
                            const rotate = 12 + (i * 7.4); 
                            const dist = -285;
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

                    {/* Elite Crown */}
                    <g transform="translate(0, -390) scale(0.65)">
                         <path d={petalPath} fill={color} />
                         <path d={petalPath} fill={color} transform="rotate(-30) translate(0, 8) scale(0.9)" />
                         <path d={petalPath} fill={color} transform="rotate(30) translate(0, 8) scale(0.9)" />
                    </g>
                </g>

                {/* SIGNATURE STUDIO V4 TYPOGRAPHY */}
                <g fontFamily="'Inter', sans-serif" textAnchor="middle" fill={color}>
                    {/* AWARD CATEGORY - ENHANCED FOR POSTER VISIBILITY */}
                    <text 
                        x="500" 
                        y="450" 
                        fontSize="24" 
                        fontWeight="900" 
                        className="uppercase" 
                        style={{ letterSpacing: '1.2em', textTransform: 'uppercase' }} 
                    >
                        {awardName}
                    </text>
                    
                    <text 
                        x="500" 
                        y="585" 
                        fontSize="135" 
                        fontWeight="900" 
                        dominantBaseline="middle"
                        className="uppercase"
                        style={{ letterSpacing: '-0.04em', textTransform: 'uppercase' }}
                    >
                        CRATE
                    </text>
                    
                    <text 
                        x="500" 
                        y="700" 
                        fontSize="42" 
                        fontWeight="700" 
                        className="uppercase" 
                        style={{ letterSpacing: '0.85em', textTransform: 'uppercase' }} 
                    >
                        {year}
                    </text>
                </g>
            </svg>
        </div>
    );
};

export default LaurelPreview;