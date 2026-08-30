import React from 'react';

interface LaurelPreviewProps {
    movieTitle?: string;
    awardName: string;
    year: string;
    color: string;
    customUrl?: string;
}

// Rainbow stops for the "gradient" laurel — teal at the tip, sweeping
// through blue/purple/magenta/orange down to red at the base, matching
// the reference wreath. Interpolated per-leaf by its position (t) along
// the branch, 0 = tip, 1 = base.
const RAINBOW_STOPS: [number, string][] = [
    [0.00, '#2DD9C9'],
    [0.20, '#2E86C1'],
    [0.40, '#8E44AD'],
    [0.60, '#C0339B'],
    [0.80, '#E8651C'],
    [1.00, '#E63328'],
];

function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}
export function rainbowColorAt(t: number): string {
    const clamped = Math.max(0, Math.min(1, t));
    let lo = RAINBOW_STOPS[0], hi = RAINBOW_STOPS[RAINBOW_STOPS.length - 1];
    for (let i = 0; i < RAINBOW_STOPS.length - 1; i++) {
        if (clamped >= RAINBOW_STOPS[i][0] && clamped <= RAINBOW_STOPS[i + 1][0]) {
            lo = RAINBOW_STOPS[i]; hi = RAINBOW_STOPS[i + 1]; break;
        }
    }
    const span = hi[0] - lo[0];
    const localT = span === 0 ? 0 : (clamped - lo[0]) / span;
    const [r1, g1, b1] = hexToRgb(lo[1]);
    const [r2, g2, b2] = hexToRgb(hi[1]);
    return rgbToHex(r1 + (r2 - r1) * localT, g1 + (g2 - g1) * localT, b1 + (b2 - b1) * localT);
}

/**
 * CrateTV Official Selection Laurel — Definitive Edition
 *
 * Geometry guarantee: R=295, inner ring at r=163.
 * All text sits inside 326px diameter clear zone.
 * Topmost leaf base at y≈291 — text starts at y≈403. 112px gap. Zero overlap.
 *
 * `color="gradient"` renders the rainbow wreath (the site default); any
 * hex value renders the classic flat-tone wreath used for print exports
 * (Laurel Forge's Gold/White/Silver/Black/Rose Gold options).
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

    const isGradient = color === 'gradient';
    const textColor = isGradient ? '#FFFFFF' : color;
    const ringColor = isGradient ? '#FFFFFF' : color;

    const LEAF = "M0,0 C-14,-1 -22,-19 -17,-44 C-13,-58 13,-58 17,-44 C22,-19 14,-1 0,0 Z";
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
                    <path d="M0,-1 L0,-53" stroke={color} strokeWidth="1.3" fill="none" opacity="0.20" />
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

                {isGradient ? (
                    // The actual illustrated wreath artwork (public/laurel-wreath.png),
                    // background removed. Text renders on top, same as every other mode.
                    <image href="/laurel-wreath.png" x="0" y="0" width="1000" height="1000" preserveAspectRatio="xMidYMid meet" />
                ) : (
                    <>
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
                        <circle cx={CX} cy={CY} r="163" fill="none" stroke={ringColor} strokeWidth="0.75" opacity="0.22" />
                        <circle cx={CX} cy={CY} r="156" fill="none" stroke={ringColor} strokeWidth="0.35" opacity="0.14" />
                    </>
                )}

                {/* Typography */}
                <g textAnchor="middle" fill={textColor} fontFamily="Georgia, 'Times New Roman', serif">

                    <line x1="318" y1="403" x2="682" y2="403" stroke={textColor} strokeWidth="0.7" opacity="0.38" />

                    <text x={CX} y="422" fontSize="16" fontWeight="400" letterSpacing="9">
                        {awardName.toUpperCase()}
                    </text>

                    <line x1="308" y1="439" x2="692" y2="439" stroke={textColor} strokeWidth="0.6" opacity="0.32" />
                    <line x1="308" y1="445" x2="692" y2="445" stroke={textColor} strokeWidth="0.3" opacity="0.18" />

                    <text x={CX} y="500" fontSize="82" fontWeight="900" dominantBaseline="middle" letterSpacing="3">
                        CRATE
                    </text>

                    <line x1="318" y1="553" x2="682" y2="553" stroke={textColor} strokeWidth="0.7" opacity="0.38" />

                    <text x={CX} y="596" fontSize="40" fontWeight="700" letterSpacing="10">
                        {year}
                    </text>

                </g>
            </svg>
        </div>
    );
};

export default LaurelPreview;
