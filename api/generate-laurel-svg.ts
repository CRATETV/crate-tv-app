// api/generate-laurel-svg.ts
// CrateTV Official Selection Laurel — Definitive Edition
// Transparent SVG — download and layer on any background in Canva, Photoshop, phone editor
// Usage: /api/generate-laurel-svg?award=Official+Selection&year=2026&color=gold

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const awardName = searchParams.get('award') || 'Official Selection';
    const year      = searchParams.get('year')  || new Date().getFullYear().toString();
    const colorKey  = (searchParams.get('color') || 'gold').toLowerCase();

    const colors: Record<string, string> = {
        gold:     '#FFD700',
        white:    '#FFFFFF',
        silver:   '#C6C6C6',
        black:    '#181818',
        rosegold: '#B76E79',
    };
    const isGradient = colorKey === 'gradient';
    const color = isGradient ? '#FFFFFF' : (colors[colorKey] ?? colors.gold);

    // Rainbow stops for the "gradient" laurel — teal at the tip, sweeping
    // through blue/purple/magenta/orange down to red at the base.
    const RAINBOW_STOPS: [number, string][] = [
        [0.00, '#2DD9C9'], [0.20, '#2E86C1'], [0.40, '#8E44AD'],
        [0.60, '#C0339B'], [0.80, '#E8651C'], [1.00, '#E63328'],
    ];
    function hexToRgb(hex: string): [number, number, number] {
        const n = parseInt(hex.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function rgbToHex(r: number, g: number, b: number): string {
        return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    }
    function rainbowColorAt(t: number): string {
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

    const CX = 500, CY = 500, R = 295, N = 20;
    const LEAF = 'M0,0 C-14,-1 -22,-19 -17,-44 C-13,-58 13,-58 17,-44 C22,-19 14,-1 0,0 Z';

    function buildBranch(side: 'left' | 'right'): string {
        const startA = side === 'left' ? 128 : 52;
        const endA   = side === 'left' ? 232 : -52;
        return Array.from({ length: N }, (_, i) => {
            const t   = i / (N - 1);
            const a   = startA + (endA - startA) * t;
            const ar  = (a * Math.PI) / 180;
            const off = i % 2 === 0 ? 0 : -30;
            const lx  = (CX + (R + off) * Math.cos(ar)).toFixed(1);
            const ly  = (CY + (R + off) * Math.sin(ar)).toFixed(1);
            const rot = (90 + a).toFixed(1);
            const sc  = (1.25 - t * 0.73).toFixed(3);
            const op  = i % 2 === 0 ? 0.95 : 0.80;
            const fill = isGradient ? rainbowColorAt(t) : color;
            const veinColor = isGradient ? '#000000' : color;
            const veinOp = isGradient ? 0.15 : 0.20;
            return `<g transform="translate(${lx},${ly}) rotate(${rot}) scale(${sc})">
  <path d="${LEAF}" fill="${fill}" opacity="${op}"/>
  <path d="M0,-1 L0,-53" stroke="${veinColor}" stroke-width="1.3" fill="none" opacity="${veinOp}"/>
</g>`;
        }).join('\n');
    }

    const topY = CY - R + 18;
    const botY = CY + R - 18;

    const fanColor = isGradient ? rainbowColorAt(0.05) : color;
    const fanLeaves = [[-54,0.44],[-36,0.58],[-18,0.68],[0,0.78],[18,0.68],[36,0.58],[54,0.44]];
    const fanSvg = fanLeaves.map(([a,s]) =>
        `<g transform="rotate(${a}) translate(0,-10) scale(${s})"><path d="${LEAF}" fill="${fanColor}" opacity="0.92"/></g>`
    ).join('\n');

    const tieColor = isGradient ? rainbowColorAt(1) : color;
    const tieSvg = [[-26,0.38],[0,0.48],[26,0.38]].map(([a,s]) =>
        `<g transform="rotate(${a}) translate(0,-8) scale(${s})"><path d="${LEAF}" fill="${tieColor}" opacity="0.62"/></g>`
    ).join('\n');

    const wreathSvg = isGradient
        ? `<image href="https://cratetv.net/laurel-wreath.png" x="0" y="0" width="1000" height="1000" preserveAspectRatio="xMidYMid meet"/>`
        : `<!-- Left branch -->
${buildBranch('left')}

<!-- Right branch -->
${buildBranch('right')}

<!-- 7-leaf top fan -->
<g transform="translate(${CX},${topY})">
${fanSvg}
</g>
<!-- Apex gem -->
<circle cx="${CX}" cy="${topY - 2}" r="4" fill="${color}" opacity="0.85"/>

<!-- Bottom tie -->
<g transform="translate(${CX},${botY}) rotate(180)">
${tieSvg}
</g>

<!-- Art Deco double inner ring -->
<circle cx="${CX}" cy="${CY}" r="163" fill="none" stroke="${color}" stroke-width="0.75" opacity="0.22"/>
<circle cx="${CX}" cy="${CY}" r="156" fill="none" stroke="${color}" stroke-width="0.35" opacity="0.14"/>`;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">

${wreathSvg}

<!-- Typography -->
<g text-anchor="middle" fill="${color}" font-family="Georgia, 'Times New Roman', serif">
  <line x1="318" y1="403" x2="682" y2="403" stroke="${color}" stroke-width="0.7" opacity="0.38"/>
  <text x="${CX}" y="422" font-size="16" font-weight="400" letter-spacing="9">${awardName.toUpperCase()}</text>
  <line x1="308" y1="439" x2="692" y2="439" stroke="${color}" stroke-width="0.6" opacity="0.32"/>
  <line x1="308" y1="445" x2="692" y2="445" stroke="${color}" stroke-width="0.3" opacity="0.18"/>
  <text x="${CX}" y="500" font-size="82" font-weight="900" dominant-baseline="middle" letter-spacing="3">CRATE</text>
  <line x1="318" y1="553" x2="682" y2="553" stroke="${color}" stroke-width="0.7" opacity="0.38"/>
  <text x="${CX}" y="596" font-size="40" font-weight="700" letter-spacing="10">${year}</text>
</g>

</svg>`;

    const filename = `CrateTV-${awardName.replace(/\s+/g, '-')}-${year}.svg`;

    return new Response(svg, {
        status: 200,
        headers: {
            'Content-Type': 'image/svg+xml',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'public, max-age=86400',
        },
    });
}
