// api/_lib/zineRules.ts — the rules of The Unpack (the zine), kept in one place
// so the website, the writing screen and the server all agree: what the story
// types are called, which stories are visible, reading time, the "ready to
// publish?" checklist, and how a festival partner's piece becomes a draft.

export type StoryType = 'NEWS' | 'INTERVIEW' | 'SPOTLIGHT' | 'DEEP_DIVE' | 'FILM_FEATURE' | 'DIRECTORS_NOTES' | 'FESTIVAL_VOICES';

export const STORY_TYPE_LABELS: Record<StoryType, string> = {
    NEWS: 'News',
    INTERVIEW: 'Interview',
    SPOTLIGHT: 'Spotlight',
    DEEP_DIVE: 'Deep dive',
    FILM_FEATURE: 'Film feature',
    DIRECTORS_NOTES: "Director's notes",
    FESTIVAL_VOICES: 'From the festivals',
};

export const typeLabel = (t?: string) => STORY_TYPE_LABELS[t as StoryType] || 'Story';

export interface SectionLike { id?: string; type: string; content?: string; caption?: string; credit?: string; label?: string; }
export interface StoryLike {
    title?: string; subtitle?: string; heroImage?: string; author?: string; type?: string; status?: string;
    sections?: SectionLike[]; content?: string; linkedMovieKey?: string;
}

/** Old stories have no status; they were published the moment they were saved. */
export const isPublishedStory = (s: { status?: string } | null | undefined) => !!s && s.status !== 'draft';

const wordsIn = (t?: string) => (t || '').trim().split(/\s+/).filter(Boolean).length;

export function storyWords(s: StoryLike): number {
    if (s.sections && s.sections.length) {
        return s.sections.reduce((n, sec) => ['text', 'quote', 'callout', 'header'].includes(sec.type) ? n + wordsIn(sec.content) : n, 0);
    }
    return wordsIn(s.content);
}

export const readingMinutes = (s: StoryLike) => Math.max(1, Math.ceil(storyWords(s) / 200));

export interface StoryCheck { errors: string[]; tips: string[]; }

/** errors stop a story being published; tips are friendly nudges. */
export function storyChecklist(s: StoryLike): StoryCheck {
    const errors: string[] = [], tips: string[] = [];
    const title = (s.title || '').trim();
    const sections = s.sections || [];
    const words = storyWords(s);

    if (!title) errors.push('Add a headline.');
    else if (title.length > 80) tips.push(`Your headline is ${title.length} characters. Under 70 reads best on phones and in shares.`);
    if (!(s.heroImage || '').trim()) errors.push('Add a cover picture. Every story needs one.');
    if (!(s.author || '').trim()) errors.push('Add a byline (who wrote it).');
    if (words < 60) errors.push(`The story is only ${words} words. Write at least 60 so it feels like a real piece.`);
    if (!(s.subtitle || '').trim()) tips.push('Add a one-line summary under the headline. It shows on the cover and when the story is shared.');

    const empty = sections.filter(sec => !(sec.content || '').trim()).length;
    if (empty) errors.push(`${empty} empty block${empty === 1 ? '' : 's'}. Fill in or delete ${empty === 1 ? 'it' : 'them'}.`);

    const pictures = sections.filter(sec => sec.type === 'image');
    if (pictures.some(p => !(p.caption || '').trim())) tips.push('Some pictures have no caption. A short caption says who or what we are looking at.');
    if (pictures.length + sections.filter(sec => sec.type === 'gallery').length > 0 && !sections.some(sec => (sec.credit || '').trim())) {
        tips.push('Add a photo credit (who took the picture) on at least your main photo.');
    }
    const film = !!(s.linkedMovieKey || sections.some(sec => sec.type === 'film'));
    if (['FILM_FEATURE', 'DIRECTORS_NOTES', 'INTERVIEW'].includes(s.type || '') && !film) tips.push('Add a film card so readers can watch the film right from the story.');
    if (words > 600 && !sections.some(sec => sec.type === 'quote')) tips.push('Long story: add a pull quote to give the page a break.');
    if (words > 350 && !sections.some(sec => sec.type === 'header')) tips.push('Add a heading or two so readers can find their place.');
    return { errors, tips };
}

// ── Festival partners writing for the zine ───────────────────────────────

export interface PartnerPiece {
    title: string; deck: string; body: string; pullQuote: string;
    byline: string; role: string;
    photos: { url: string; caption: string; credit: string }[];
}

export const PIECE_LIMITS = { title: 120, deck: 200, minWords: 120, maxWords: 2500, maxPhotos: 6 };

const clean = (v: unknown, max: number) =>
    (typeof v === 'string' ? v : '').replace(/<[^>]*>/g, '').replace(/\r\n/g, '\n').trim().slice(0, max);

export function sanitizePartnerPiece(input: any): { piece: PartnerPiece; errors: string[] } {
    const piece: PartnerPiece = {
        title: clean(input?.title, PIECE_LIMITS.title).replace(/\s+/g, ' '),
        deck: clean(input?.deck, PIECE_LIMITS.deck).replace(/\s+/g, ' '),
        body: clean(input?.body, 30_000),
        pullQuote: clean(input?.pullQuote, 240).replace(/\s+/g, ' '),
        byline: clean(input?.byline, 80).replace(/\s+/g, ' '),
        role: clean(input?.role, 80).replace(/\s+/g, ' '),
        photos: (Array.isArray(input?.photos) ? input.photos : []).slice(0, PIECE_LIMITS.maxPhotos)
            .map((p: any) => ({ url: clean(p?.url, 600), caption: clean(p?.caption, 200), credit: clean(p?.credit, 80) }))
            .filter((p: { url: string }) => /^https:\/\/\S+$/.test(p.url)),
    };
    const errors: string[] = [];
    if (!piece.title) errors.push('Add a headline.');
    if (!piece.byline) errors.push('Add the name that should appear as the writer.');
    const words = wordsIn(piece.body);
    if (words < PIECE_LIMITS.minWords) errors.push(`Write at least ${PIECE_LIMITS.minWords} words (you have ${words}).`);
    if (words > PIECE_LIMITS.maxWords) errors.push(`Keep it under ${PIECE_LIMITS.maxWords} words (you have ${words}).`);
    if (!piece.photos.length) errors.push('Add at least one picture. The first one becomes the cover.');
    if (piece.photos.some(p => !p.caption)) errors.push('Give every picture a short caption.');
    return { piece, errors };
}

let counter = 0;
const sid = () => `sec_${Date.now().toString(36)}_${(counter++).toString(36)}`;

/** Turns an approved partner piece into a DRAFT story for the editor to polish. */
export function pieceToDraftStory(piece: PartnerPiece, partner: { id: string; name: string }) {
    const blocks = piece.body.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
    const sections: any[] = [];
    const [cover, ...rest] = piece.photos;
    const paragraphs = blocks.length;
    // Spread the remaining pictures evenly through the story.
    const spots = new Map<number, typeof rest[number]>();
    rest.forEach((ph, i) => spots.set(Math.min(paragraphs - 1, Math.max(0, Math.round(((i + 1) * paragraphs) / (rest.length + 1)) - 1)), ph));
    const quoteAt = piece.pullQuote ? Math.max(0, Math.round(paragraphs / 2) - 1) : -1;
    blocks.forEach((b, i) => {
        if (b.startsWith('## ')) sections.push({ id: sid(), type: 'header', content: b.replace(/^##\s+/, '') });
        else sections.push({ id: sid(), type: 'text', content: b });
        if (i === quoteAt) sections.push({ id: sid(), type: 'quote', content: piece.pullQuote });
        const ph = spots.get(i);
        if (ph) sections.push({ id: sid(), type: 'image', content: ph.url, caption: ph.caption, credit: ph.credit });
    });
    return {
        title: piece.title,
        subtitle: piece.deck,
        content: '',
        sections,
        heroImage: cover?.url || '',
        author: piece.role ? `${piece.byline}, ${piece.role}` : piece.byline,
        type: 'FESTIVAL_VOICES' as const,
        status: 'draft' as const,
        partnerId: partner.id,
        partnerName: partner.name,
        template: 'festival-voices',
    };
}
