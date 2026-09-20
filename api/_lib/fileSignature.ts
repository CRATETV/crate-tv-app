/**
 * Identify a file by its actual first bytes ("magic numbers"), not by the name
 * or Content-Type the uploader claimed. Someone renaming malware.exe to film.mp4
 * (and telling the browser it's video/mp4) gets caught here.
 *
 * This is a file-TYPE check, not a virus scan: a genuine video with something
 * appended to it still passes. That's what the antivirus layer is for.
 */

export type FileKind = 'jpeg' | 'png' | 'gif' | 'webp' | 'heic' | 'mp4' | 'webm' | 'avi' | 'mpeg' | 'asf' | 'flv';

export const IMAGE_KINDS: FileKind[] = ['jpeg', 'png', 'gif', 'webp'];
export const VIDEO_KINDS: FileKind[] = ['mp4', 'webm', 'avi', 'mpeg', 'asf', 'flv'];

const ascii = (b: Uint8Array, start: number, end: number) =>
    String.fromCharCode(...Array.from(b.subarray(start, end)));
const startsWith = (b: Uint8Array, bytes: number[]) =>
    b.length >= bytes.length && bytes.every((v, i) => b[i] === v);

// Executables / archives / scripts. A real image or video never starts with these.
const isExecutableOrArchive = (b: Uint8Array): boolean =>
    ascii(b, 0, 2) === 'MZ' ||                                        // Windows .exe / .dll
    startsWith(b, [0x7f, 0x45, 0x4c, 0x46]) ||                        // ELF
    startsWith(b, [0x50, 0x4b, 0x03, 0x04]) ||                        // ZIP / jar / docx / apk
    startsWith(b, [0x50, 0x4b, 0x05, 0x06]) ||                        // empty ZIP
    startsWith(b, [0xfe, 0xed, 0xfa, 0xce]) || startsWith(b, [0xce, 0xfa, 0xed, 0xfe]) || // Mach-O
    startsWith(b, [0xfe, 0xed, 0xfa, 0xcf]) || startsWith(b, [0xcf, 0xfa, 0xed, 0xfe]) ||
    startsWith(b, [0xca, 0xfe, 0xba, 0xbe]) ||                        // Java class / Mach-O fat
    ascii(b, 0, 2) === '#!' ||                                        // shell script
    /^\s*<(!doctype|html|script|\?xml|svg)/i.test(ascii(b, 0, 16));   // HTML / SVG / XML

const MP4_BOXES = ['ftyp', 'moov', 'mdat', 'free', 'wide', 'skip', 'pnot'];

// HEIC / HEIF / AVIF *images* use the very same ftyp container as MP4 video (iPhone photos
// are the common case), told apart only by the brand code after 'ftyp'.
const IMAGE_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1', 'avif', 'avis'];

export function detectFileKind(head: Uint8Array): FileKind | null {
    if (head.length < 12 || isExecutableOrArchive(head)) return null;

    if (startsWith(head, [0xff, 0xd8, 0xff])) return 'jpeg';
    if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
    if (ascii(head, 0, 6) === 'GIF87a' || ascii(head, 0, 6) === 'GIF89a') return 'gif';

    if (ascii(head, 0, 4) === 'RIFF') {
        if (ascii(head, 8, 12) === 'WEBP') return 'webp';
        if (ascii(head, 8, 12) === 'AVI ') return 'avi';
        return null;
    }

    // MP4 / MOV / M4V / 3GP: [4-byte box size]['ftyp'...]. A genuine ftyp box is tiny,
    // so a huge "size" here means the first bytes are something else pretending.
    if (MP4_BOXES.includes(ascii(head, 4, 8))) {
        const size = (head[0] * 0x1000000) + (head[1] << 16) + (head[2] << 8) + head[3];
        if (ascii(head, 4, 8) === 'ftyp') {
            if (size < 8 || size > 4096) return null;
            if (IMAGE_BRANDS.includes(ascii(head, 8, 12))) return 'heic';
        }
        return 'mp4';
    }

    if (startsWith(head, [0x1a, 0x45, 0xdf, 0xa3])) return 'webm';                        // WebM / Matroska
    if (startsWith(head, [0x00, 0x00, 0x01, 0xba]) || startsWith(head, [0x00, 0x00, 0x01, 0xb3])) return 'mpeg';
    if (startsWith(head, [0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11])) return 'asf'; // WMV / WMA
    if (ascii(head, 0, 3) === 'FLV' && head[3] === 1) return 'flv';

    return null;
}
