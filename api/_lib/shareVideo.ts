// Small pure helpers for the "Make a video" button in Share a film (kept out of the component so they can be tested).

/** Where in the trailer the clip starts: the film's own "start here" second, kept early enough that the whole clip fits. */
export function clipStart(trailerStart: number | undefined, duration: number, clipLen: number): number {
    const want = Number.isFinite(trailerStart) && (trailerStart as number) > 0 ? (trailerStart as number) : 0;
    if (!Number.isFinite(duration) || duration <= 0) return want;
    return Math.max(0, Math.min(want, duration - clipLen));
}

/** The best video type this browser can record. Only real H.264 counts as MP4 (a plain "video/mp4" can secretly hold a format Instagram refuses). */
export function pickRecorderType(isSupported: (mime: string) => boolean): { mime: string; ext: 'mp4' | 'webm' } | null {
    const options: Array<{ mime: string; ext: 'mp4' | 'webm' }> = [
        { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
        { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
        { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
        { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
        { mime: 'video/webm', ext: 'webm' },
    ];
    return options.find(o => isSupported(o.mime)) || null;
}

/** True when the trailer is a plain video file we can play ourselves (not a YouTube or Vimeo page). */
export function isPlainVideoUrl(url?: string): boolean {
    const u = (url || '').trim();
    return /^https?:\/\//i.test(u) && !/youtube\.com|youtu\.be|vimeo\.com/i.test(u);
}
