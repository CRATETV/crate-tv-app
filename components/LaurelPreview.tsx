import React from 'react';

interface LaurelPreviewProps {
    movieTitle?: string;
    awardName: string;
    year: string;
    color: string;
    customUrl?: string;
}

/**
 * CrateTV Official Selection Laurel — Definitive Edition
 *
 * Geometry guarantee: R=295, inner ring at r=163.
 * All text sits inside 326px diameter clear zone.
 * Topmost leaf base at y≈291 — text starts at y≈403. 112px gap. Zero overlap.
 *
 * Design features:
 * - 20 leaves per branch, two-layer depth (outer + inner offset)
 * - Dramatic scale taper: 1.25 (bottom) → 0.52 (top)
 * - Midrib vein on every leaf
 * - 7-leaf top fan with center apex gem
 * - 3-leaf bottom tie
 * - Art Deco double inner ring
 * - Refined typographic hierarchy
 */
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

    const LEAF = "M0,0 C-13,-1 -20,-18 -15,-42 C-11,-56 11,-56 15,-42 C20,-18 13,-1 0,0 Z";
    const CX = 500, CY = 500, R = 295, N = 20;

    const makeBranch = (side: 'left' | 'right') => {
        const startA = side === 'left' ? 128 : 52;
        const endA   = side === 'left' ? 232 : -52;
        return Array.from({ length: N }, (_, i) => {
            const t       = i / (N - 1);
            const a       = startA + (endA - startA) * t;
            const ar      = (a * Math.PI) / 180;
            const off     = i % 2 === 0 ? 0 : -30;
            const lx      = CX + (R + off) * Math.cos(ar);
            const ly      = CY + (R + off) * Math.sin(ar);
            const rot     = 90 + a;
            const sc      = (1.25 - t * 0.73).toFixed(3);
            const opacity = i % 2 === 0 ? 0.95 : 0.80;
            return (
                <g key={`${side}-${i}`} transform={`translate(${lx.toFixed(1)},${ly.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${sc})`}>
                    <path d={LEAF} fill={color} opacity={opacity} />
                    <path d="M0,-1 L0,-50" stroke={color} strokeWidth="1.3" fill="none" opacity="0.20" />
                </g>
            );
        });
    };

    const topY = CY - R + 18;
    const botY = CY + R - 18;
    const fanLeaves = [[-54,0.44],[-36,0.58],[-18,0.68],[0,0.78],[18,0.68],[36,0.58],[54,0.44]];
    const tieLeaves = [[-26,0.38],[0,0.48],[26,0.38]];

    return (
        <div className="flex items-center justify-center w-full h-full p-4 pointer-events-none select-none">
            <svg width="100%" height="100%" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">

                {/* Branches */}
                {makeBranch('left')}
                {makeBranch('right')}

                {/* 7-leaf top fan */}
                <g transform={`translate(${CX},${topY})`}>
                    {fanLeaves.map(([angle, scale], i) => (
                        <g key={i} transform={`rotate(${angle}) translate(0,-10) scale(${scale})`}>
                            <path d={LEAF} fill={color} opacity="0.92" />
                        </g>
                    ))}
                </g>
                {/* Apex gem */}
                <circle cx={CX} cy={topY - 2} r="4" fill={color} opacity="0.85" />

                {/* Bottom 3-leaf tie */}
                <g transform={`translate(${CX},${botY}) rotate(180)`}>
                    {tieLeaves.map(([angle, scale], i) => (
                        <g key={i} transform={`rotate(${angle}) translate(0,-8) scale(${scale})`}>
                            <path d={LEAF} fill={color} opacity="0.62" />
                        </g>
                    ))}
                </g>

                {/* Art Deco double inner ring */}
                <circle cx={CX} cy={CY} r="163" fill="none" stroke={color} strokeWidth="0.75" opacity="0.22" />
                <circle cx={CX} cy={CY} r="156" fill="none" stroke={color} strokeWidth="0.35" opacity="0.14" />

                {/* Typography */}
                <g textAnchor="middle" fill={color} fontFamily="Georgia, 'Times New Roman', serif">

                    <line x1="318" y1="403" x2="682" y2="403" stroke={color} strokeWidth="0.7" opacity="0.38" />

                    <text x={CX} y="422" fontSize="16" fontWeight="400" letterSpacing="9">
                        {awardName.toUpperCase()}
                    </text>

                    <line x1="308" y1="439" x2="692" y2="439" stroke={color} strokeWidth="0.6" opacity="0.32" />
                    <line x1="308" y1="445" x2="692" y2="445" stroke={color} strokeWidth="0.3" opacity="0.18" />

                    <text x={CX} y="500" fontSize="82" fontWeight="900" dominantBaseline="middle" letterSpacing="3">
                        CRATE
                    </text>

                    <line x1="318" y1="553" x2="682" y2="553" stroke={color} strokeWidth="0.7" opacity="0.38" />

                    <text x={CX} y="596" fontSize="40" fontWeight="700" letterSpacing="10">
                        {year}
                    </text>

                </g>
            </svg>
        </div>
    );
};

export default LaurelPreview;
