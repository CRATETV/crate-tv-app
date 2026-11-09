// Shared drawing bits for the Share a film picture and video.
export const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
export const SERIF = 'Georgia, "Times New Roman", serif';
export const GOLD = '#C9A45C';
export const RED = '#E5304F';

/** Letter-spaced text (canvas letterSpacing is not in every browser, so space it by hand). */
export function spaced(c: CanvasRenderingContext2D, text: string, cx: number, y: number, gap: number) {
    const chars = [...text];
    const widths = chars.map(ch => c.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
    let x = cx - total / 2; const prev = c.textAlign; c.textAlign = 'left';
    chars.forEach((ch, i) => { c.fillText(ch, x, y); x += widths[i] + gap; });
    c.textAlign = prev;
}
