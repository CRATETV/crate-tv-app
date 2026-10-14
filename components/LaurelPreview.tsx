import React, { useId } from 'react';

interface LaurelPreviewProps {
    movieTitle?: string;
    awardName: string;
    year: string;
    color: string;
    customUrl?: string;
    /** Lettering/ring colour override, e.g. dark text on the signature wreath for light posters. */
    textColor?: string;
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
/** The signature wreath artwork; exports inline it so it survives the PNG conversion. */
export const WREATH_SRC = '/laurel-wreath.png';

const LaurelPreview: React.FC<LaurelPreviewProps> = ({ awardName, year, color, customUrl, textColor: textOverride }) => {
    // Unique per instance: several laurels can be on one page (preview + export copies).
    const tintId = `laurel-tint-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
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
    const textColor = textOverride || (isGradient ? '#FFFFFF' : color);
    const CX = 500;

    return (
        <div className="flex items-center justify-center w-full h-full p-4 pointer-events-none select-none">
            <svg width="100%" height="100%" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">

                {/* The illustrated wreath (public/laurel-wreath.png). The signature
                    finish shows it in full colour; every other finish is the SAME
                    wreath filled with one solid colour, for posters that need white,
                    black or a metallic laurel. */}
                {!isGradient && (
                    <defs>
                        <filter id={tintId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                            <feFlood floodColor={color} result="tint" />
                            <feComposite in="tint" in2="SourceAlpha" operator="in" />
                        </filter>
                    </defs>
                )}
                <image href={WREATH_SRC} x="0" y="0" width="1000" height="1000" preserveAspectRatio="xMidYMid meet"
                    filter={isGradient ? undefined : `url(#${tintId})`} />

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
