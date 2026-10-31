// components/seasonalAvatars.ts
//
// Seasonal looks for the avatars (Oct 2026). During a holiday window every avatar
// on the site (account page, menu, watch party lobby and chat) automatically wears
// the holiday look, and goes back to normal when the window ends. Nobody's saved
// avatar changes: the look is drawn on top at display time.
//
//   Halloween        Oct 24 - Nov 1    witch hat + little pumpkin
//   Christmas        Dec 10 - Dec 26   Santa hat + snow
//   Valentine's Day  Feb 7  - Feb 14   heart eyes + floating hearts
//   St. Patrick's    Mar 10 - Mar 17   green top hat + shamrock
//
// TO CHANGE a window: edit SEASONS below (month 1-12, day).
// TO PREVIEW a look any day: add ?season=christmas (or halloween, valentines,
// stpatricks) to any page address. ?season=off shows the normal avatars.
export type Season = 'halloween' | 'christmas' | 'valentines' | 'stpatricks';

interface Window { season: Season; from: [number, number]; to: [number, number] }
export const SEASONS: Window[] = [
    { season: 'halloween',  from: [10, 24], to: [11, 1] },
    { season: 'christmas',  from: [12, 10], to: [12, 26] },
    { season: 'valentines', from: [2, 7],   to: [2, 14] },
    { season: 'stpatricks', from: [3, 10],  to: [3, 17] },
];

const ALL: Season[] = ['halloween', 'christmas', 'valentines', 'stpatricks'];
const dayNumber = (m: number, d: number) => m * 100 + d;

/** Which look is on for this date (null = normal). `override` is the ?season= value. */
export function seasonFor(date: Date, override?: string | null): Season | null {
    if (override === 'off') return null;
    if (override && (ALL as string[]).includes(override)) return override as Season;
    const today = dayNumber(date.getMonth() + 1, date.getDate());
    for (const w of SEASONS) {
        if (today >= dayNumber(...w.from) && today <= dayNumber(...w.to)) return w.season;
    }
    return null;
}

// Where each animal's eyes are (for heart eyes) and how big.
const EYES: Record<string, { pts: [number, number][]; size: number }> = {
    fox: { pts: [[43, 55], [57, 55]], size: 5 },
    bear: { pts: [[42, 52], [58, 52]], size: 5 },
    cat: { pts: [[40, 55], [60, 55]], size: 6 },
    owl: { pts: [[38, 50], [62, 50]], size: 10 },
    penguin: { pts: [[42, 50], [58, 50]], size: 6.5 },
};

const heart = (cx: number, cy: number, s: number, fill = '#EC4899') =>
    `<path d="M ${cx} ${cy + s * 0.9} C ${cx - s * 1.5} ${cy - s * 0.1}, ${cx - s * 0.7} ${cy - s * 1.2}, ${cx} ${cy - s * 0.4} ` +
    `C ${cx + s * 0.7} ${cy - s * 1.2}, ${cx + s * 1.5} ${cy - s * 0.1}, ${cx} ${cy + s * 0.9} Z" fill="${fill}" stroke="#9D174D" stroke-width="0.6"/>`;

const LAYERS: Record<Season, (avatarKey: string) => string> = {
    halloween: () =>
        // witch hat, tilted
        `<g transform="rotate(-12 50 20)"><g transform="translate(10 7) scale(0.8)">` +
        `<ellipse cx="50" cy="26" rx="36" ry="6.5" fill="#1F1235"/>` +
        `<path d="M 31 25 L 52 -4 L 70 25 Z" fill="#2E1A4F"/>` +
        `<rect x="33" y="17" width="35" height="7" fill="#F97316"/>` +
        `<rect x="46" y="16" width="9" height="9" rx="1.5" fill="#FBBF24"/><rect x="48.5" y="18.5" width="4" height="4" fill="#2E1A4F"/>` +
        `</g></g>` +
        // little pumpkin, bottom right
        `<ellipse cx="82" cy="84" rx="9" ry="7.5" fill="#F97316" stroke="#C2410C" stroke-width="0.8"/>` +
        `<path d="M 82 77 Q 82 73 85 72" stroke="#166534" stroke-width="2" fill="none" stroke-linecap="round"/>` +
        `<path d="M 78 82 L 80 80 L 82 82 M 82 82 L 84 80 L 86 82" stroke="#7C2D12" stroke-width="1.2" fill="none"/>`,
    christmas: () =>
        // Santa hat, tilted, with pom-pom
        `<g transform="translate(4 8) scale(0.9) rotate(-14 50 20)">` +
        `<path d="M 20 27 C 22 6, 42 -2, 64 5 C 72 8, 77 17, 80 27 Z" fill="#DC2626" stroke="#991B1B" stroke-width="0.8"/>` +
        `<rect x="15" y="24" width="70" height="11" rx="5.5" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="0.6"/>` +
        `<circle cx="75" cy="9" r="6.5" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="0.6"/>` +
        `</g>` +
        // snow
        `<g fill="#FFFFFF" opacity="0.9"><circle cx="12" cy="30" r="1.6"/><circle cx="88" cy="38" r="1.4"/><circle cx="8" cy="62" r="1.3"/><circle cx="92" cy="70" r="1.7"/><circle cx="20" cy="88" r="1.4"/></g>`,
    valentines: (key) => {
        const eyes = EYES[key];
        const eyeHearts = eyes ? eyes.pts.map(([x, y]) => heart(x, y, eyes.size)).join('') : '';
        return eyeHearts +
            heart(14, 18, 4.5, '#FB7185') + heart(86, 28, 3.5, '#F472B6') + heart(80, 10, 3, '#FDA4AF') + heart(10, 70, 3.2, '#F472B6');
    },
    stpatricks: () =>
        // green top hat, tilted
        `<g transform="rotate(-10 50 20)">` +
        `<ellipse cx="50" cy="26" rx="31" ry="5.5" fill="#14532D"/>` +
        `<rect x="33" y="3" width="34" height="23" rx="3" fill="#16A34A" stroke="#14532D" stroke-width="0.8"/>` +
        `<rect x="33" y="17" width="34" height="6" fill="#0F2E1A"/>` +
        `<rect x="45" y="16" width="10" height="8" rx="1.5" fill="#FBBF24"/><rect x="47.5" y="18.5" width="5" height="3" fill="#0F2E1A"/>` +
        `</g>` +
        // shamrock, bottom right
        `<g fill="#22C55E" stroke="#15803D" stroke-width="0.6"><circle cx="80" cy="79" r="4.6"/><circle cx="87" cy="79" r="4.6"/><circle cx="83.5" cy="73.5" r="4.6"/></g>` +
        `<path d="M 83.5 80 Q 84 86 88 89" stroke="#15803D" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
};

/** Puts the holiday look on top of one avatar drawing (before its closing </svg>). */
export function applySeason(svg: string, avatarKey: string, season: Season | null): string {
    if (!season || typeof svg !== 'string') return svg;
    const at = svg.lastIndexOf('</svg>');
    if (at < 0) return svg;
    return svg.slice(0, at) + LAYERS[season](avatarKey) + svg.slice(at);
}

/** The ?season= value from the page address, if any. Never throws. */
export function seasonOverrideFromPage(): string | null {
    try { return new URLSearchParams(window.location.search).get('season'); } catch { return null; }
}
