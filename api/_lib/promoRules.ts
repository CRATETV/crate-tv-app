// api/_lib/promoRules.ts — "Promo Pages": a cinematic promo site for a film,
// run from the admin panel (Admin → Promo pages).
//
// Two separate things:
//   • the TEMPLATE (the look and layout) is code: components/promo/*. It stays
//     when a page is deleted, ready for the next film.
//   • each film's PAGE is data: one Firestore doc in `promo_pages/{slug}`.
//     Deleting a page removes that doc (and its votes/sign-ups) only.
//
// Shared by the server (api/promo*.ts) and the browser (admin tab + public
// page), so keep it free of server-only imports.

export const PROMO_PAGES = 'promo_pages';
export const PROMO_ENTRIES = 'entries'; // sub-collection: one doc per email (vote + sign-up)

export type PromoTemplate = 'fight-night';
export type PromoFont = 'anton' | 'bebas' | 'oswald' | 'playfair' | 'archivo';

export interface PromoMedia { type: 'image' | 'video'; src: string; pos: string }
export interface PromoSide { first: string; last: string; nickname: string; corner: string; photo: string; tape: string[][] }
/** A backer level. link = where tapping it goes to pay (the filmmaker's page); empty = the main crowdfund link. */
export interface PromoTier { amount: string; name: string; text: string; link: string }
export interface PromoSlot { name: string; logo: string; link: string }
export interface PromoStep { when: string; title: string; text: string; key: boolean }
export interface PromoPlace { title: string; text: string }
export interface PromoPack { tag: string; name: string; price: string; spots: string; perks: string[]; top: boolean }
export interface PromoPerson { role: string; name: string; text: string; photo: string }
export interface PromoStat { n: string; label: string; note: string }

export interface PromoPage {
    slug: string;
    title: string;
    published: boolean;
    look: {
        template: PromoTemplate;
        font: PromoFont;
        bg: string; ink: string; accent: string; sideA: string; sideB: string;
        grain: boolean; flare: boolean; letterbox: boolean;
    };
    sections: { fight: boolean; countdown: boolean; vote: boolean; partners: boolean; instagram: boolean };
    hero: { title: string; kicker: string; ringText: string; topMeta: string; footLeft: string; footRight: string; media: PromoMedia[] };
    sideA: PromoSide;
    sideB: PromoSide;
    marquee: string;
    countdown: {
        date: string;          // ISO date-time; when it passes the page flips to the reveal
        forceReveal: boolean;  // flip now, whatever the date
        eyebrow: string; headline: string; outlined: string; buttonText: string;
        revealEyebrow: string; revealHeadline: string; revealOutlined: string; trailerUrl: string;
    };
    vote: { eyebrow: string; headline: string; outlined: string };
    partnersBlock: { eyebrow: string; headline: string; outlined: string; text: string; email: string; slots: PromoSlot[] };
    /** link = the main payment page (a crowdfund, or the filmmaker's own). Money never goes through CRATE. */
    crowdfund: { eyebrow: string; headline: string; outlined: string; text: string; link: string; tiers: PromoTier[] };
    instagram: { handle: string; url: string; posts: string[] };
    footer: { line1: string; line2: string; pressEmail: string; credit: string };
    partnerPage: {
        enabled: boolean;
        headline: string; outlined: string; intro: string;
        steps: PromoStep[]; places: PromoPlace[]; packs: PromoPack[]; packsNote: string;
        team: PromoPerson[]; stats: PromoStat[];
        contactEmail: string; contactPhone: string;
        /** "I'm interested" form. Each answer is emailed to contactEmail and never stored. */
        form: { enabled: boolean; headline: string; outlined: string; text: string; button: string };
    };
    createdAt?: string;
    updatedAt?: string;
}

// ── Look options ────────────────────────────────────────────────────────────
export const PROMO_FONTS: Record<PromoFont, { label: string; family: string; google: string }> = {
    anton:    { label: 'Fight poster (Anton)', family: "'Anton', Impact, sans-serif", google: 'Anton' },
    bebas:    { label: 'Clean bold (Bebas Neue)', family: "'Bebas Neue', Impact, sans-serif", google: 'Bebas+Neue' },
    oswald:   { label: 'Strong (Oswald)', family: "'Oswald', Impact, sans-serif", google: 'Oswald:wght@600;700' },
    archivo:  { label: 'Wide (Archivo Black)', family: "'Archivo Black', Impact, sans-serif", google: 'Archivo+Black' },
    playfair: { label: 'Elegant (Playfair)', family: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:wght@700;900' },
};

/** One-click colour sets. Each still adjusts by hand afterwards. */
export const PROMO_LOOK_PRESETS: { id: string; label: string; colors: Pick<PromoPage['look'], 'bg' | 'ink' | 'accent' | 'sideA' | 'sideB'> }[] = [
    { id: 'fight-night', label: 'Fight Night (black & gold)', colors: { bg: '#060606', ink: '#f2efe8', accent: '#d4a845', sideA: '#c8312b', sideB: '#2f5fd0' } },
    { id: 'neon',        label: 'Neon (black, pink & cyan)', colors: { bg: '#07060b', ink: '#f4f1ff', accent: '#ff3d8b', sideA: '#ff3d8b', sideB: '#22d3ee' } },
    { id: 'noir',        label: 'Noir (black & white)',      colors: { bg: '#050505', ink: '#f5f5f5', accent: '#bdbdbd', sideA: '#8a8a8a', sideB: '#d9d9d9' } },
    { id: 'ivory',       label: 'Ivory (cream & crimson)',   colors: { bg: '#f1ebe0', ink: '#14110d', accent: '#a3241f', sideA: '#a3241f', sideB: '#1f3a6b' } },
    { id: 'island',      label: 'Island (deep green & gold)', colors: { bg: '#04110c', ink: '#f2efe2', accent: '#e8b839', sideA: '#e85d3a', sideB: '#2bb39a' } },
];

export const promoFontsHref = (fonts: PromoFont[]) =>
    'https://fonts.googleapis.com/css2?' +
    [...new Set(fonts)].map(f => `family=${PROMO_FONTS[f].google}`).join('&') +
    '&family=Inter:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap';

// ── Slugs ───────────────────────────────────────────────────────────────────
// The slug is the page's address: cratetv.net/p/<slug> and <slug>.cratetv.net
const RESERVED = new Set([
    'www', 'app', 'api', 'admin', 'cdn', 'mail', 'email', 'staging', 'preview', 'dev', 'test',
    'roku', 'shop', 'help', 'support', 'status', 'new', 'edit', 'partners', 'partner', 'p', 'crate', 'cratetv',
]);
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export function promoSlugify(s: string): string {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
}
export function slugProblem(slug: string): string | null {
    if (!SLUG_RE.test(slug)) return 'Use 1–40 lowercase letters, numbers and dashes (no dash at the start or end).';
    if (RESERVED.has(slug)) return `"${slug}" is reserved. Pick another address.`;
    return null;
}

/** Which promo page an address belongs to, if any. Pure, for tests and the router. */
export function promoRouteFor(hostname: string, pathname: string): { slug: string; view: 'site' | 'partners' } | null {
    const path = pathname.replace(/\/+$/, '') || '/';
    const m = path.match(/^\/p\/([a-z0-9-]+)(\/partners)?$/);
    if (m && SLUG_RE.test(m[1])) return { slug: m[1], view: m[2] ? 'partners' : 'site' };
    const host = hostname.toLowerCase();
    const sub = host.match(/^([a-z0-9-]+)\.cratetv\.net$/)?.[1];
    if (sub && !RESERVED.has(sub) && SLUG_RE.test(sub)) {
        if (path === '/') return { slug: sub, view: 'site' };
        if (path === '/partners') return { slug: sub, view: 'partners' };
    }
    return null;
}

export const DEFAULT_INTEREST_FORM = {
    enabled: true, headline: "I'm", outlined: 'interested',
    text: "Pick a package and leave your details. We'll call you within two days.",
    button: 'Send',
};

// ── Blank page (what "Start blank" gives you) ───────────────────────────────
export function blankPromo(slug: string, title: string): PromoPage {
    return {
        slug, title, published: false,
        look: { template: 'fight-night', font: 'anton', ...PROMO_LOOK_PRESETS[0].colors, grain: true, flare: true, letterbox: true },
        sections: { fight: true, countdown: true, vote: true, partners: true, instagram: false },
        hero: { title, kicker: '', ringText: '', topMeta: '', footLeft: '', footRight: '', media: [] },
        sideA: { first: 'Name', last: '', nickname: '', corner: 'Red corner', photo: '', tape: [['Record', ''], ['Height', ''], ['From', '']] },
        sideB: { first: 'Name', last: '', nickname: '', corner: 'Blue corner', photo: '', tape: [['Record', ''], ['Height', ''], ['From', '']] },
        marquee: '',
        countdown: {
            date: '', forceReveal: false,
            eyebrow: 'Coming soon', headline: 'The countdown', outlined: 'is on', buttonText: "I'm in",
            revealEyebrow: "It's here", revealHeadline: 'Watch the', revealOutlined: 'trailer', trailerUrl: '',
        },
        vote: { eyebrow: 'Pick a side', headline: 'Who', outlined: 'wins?' },
        partnersBlock: { eyebrow: 'Official partners', headline: 'Partner', outlined: 'with us', text: '', email: '', slots: [] },
        crowdfund: { eyebrow: 'Back the film', headline: 'Get in', outlined: 'the corner', text: '', link: '', tiers: [] },
        instagram: { handle: '', url: '', posts: [] },
        footer: { line1: '', line2: '', pressEmail: '', credit: `A CRATE TV promotion for ${title}` },
        partnerPage: {
            enabled: true, headline: 'Put your name', outlined: 'on the film', intro: '',
            steps: [], places: [], packs: [], packsNote: '', team: [], stats: [], contactEmail: '', contactPhone: '',
            form: { ...DEFAULT_INTEREST_FORM },
        },
    };
}

// ── The Champ (every word, photo and stat from the original promo site) ─────
// Photos ship with CRATE in public/promo/the-champ/. Swap them in the editor
// any time; uploads replace these links.
const CHAMP_IMG = '/promo/the-champ';
/** The film's own inbox: press, partner enquiries and the "I'm interested" form all go here. */
const CHAMP_EMAIL = 'thechampfilm@gmail.com';
export function theChampExample(slug: string): PromoPage {
    const p = blankPromo(slug, 'The Champ');
    return {
        ...p,
        hero: {
            title: 'The Champ', kicker: 'Ace · vs · Beast',
            ringText: 'Ace Broadus · vs · Beast Johnson · Empire Arena · Saturday February 20 · Heavyweight · 12 rounds · ',
            topMeta: 'Empire Arena · Sat Feb 20', footLeft: 'Ace · vs · Beast', footRight: 'Empire Arena · Feb 20',
            media: [
                { type: 'image', src: `${CHAMP_IMG}/ace-face.jpg`, pos: '50% 40%' },
                { type: 'image', src: `${CHAMP_IMG}/beast-face.jpg`, pos: '50% 40%' },
            ],
        },
        sideA: { first: 'Ace', last: 'Broadus', nickname: '', corner: 'Red corner', photo: `${CHAMP_IMG}/ace.jpg`,
            tape: [['Record', '24-1'], ['KOs', '19'], ['Height', `6'2"`], ['Weight', '224 lb'], ['Reach', '78"'], ['Stance', 'Orthodox'], ['From', 'North Philly']] },
        sideB: { first: 'Beast', last: 'Johnson', nickname: '', corner: 'Blue corner', photo: `${CHAMP_IMG}/beast.jpg`,
            tape: [['Record', '21-0'], ['KOs', '20'], ['Height', `6'4"`], ['Weight', '238 lb'], ['Reach', '81"'], ['Stance', 'Southpaw'], ['From', '']] },
        marquee: 'Ace Broadus · VS · Beast Johnson · Empire Arena · Saturday Feb 20',
        countdown: {
            date: '2027-02-20T20:00:00-05:00', forceReveal: false,
            eyebrow: 'Fight night', headline: 'The bell', outlined: 'rings in', buttonText: "I'm in",
            revealEyebrow: "It's here", revealHeadline: 'This was never a fight.', revealOutlined: "It's a film.", trailerUrl: '',
        },
        vote: { eyebrow: 'Pick a side', headline: 'Who takes', outlined: 'the belt?' },
        partnersBlock: {
            eyebrow: 'Official partners', headline: 'Put your name', outlined: 'on the fight',
            text: 'Your logo on the poster, the trunks, the ring canvas and the press conference backdrop. Limited spots.',
            email: CHAMP_EMAIL, slots: [],
        },
        crowdfund: {
            eyebrow: 'Back the film', headline: 'Get in', outlined: 'the corner',
            text: 'The Champ was shot in Philadelphia in January. Help us finish it: editing, sound, music and festival fees. Every backer gets their name in the credits.',
            link: '',
            tiers: [
                { amount: '$10', name: 'Ringside', text: 'Your name in the credits.', link: '' },
                { amount: '$25', name: 'Fight Card', text: 'Credits + the fight poster and the movie poster as downloads, sent to you before we post them anywhere.', link: '' },
                { amount: '$60', name: 'Fight Tee', text: 'Official The Champ t-shirt + credits.', link: '' },
                { amount: '$150', name: 'The Gloves', text: 'Gloves signed by Ace & Beast + tee + credits.', link: '' },
                { amount: '$500', name: 'Corner Team', text: 'Producer thanks credit, plus every reward from the other levels.', link: '' },
            ],
        },
        footer: { line1: 'Ace Broadus vs Beast Johnson', line2: 'Empire Arena · Saturday, February 20', pressEmail: CHAMP_EMAIL, credit: 'A CRATE TV promotion for The Champ' },
        partnerPage: {
            enabled: true, headline: 'Put your name', outlined: 'on the fight',
            intro: "The Champ is a short film. Ace Broadus vs Beast Johnson is the marketing. For six weeks we promote the fight like it's real, then on February 20 we reveal it's a movie and drop the trailer. Your brand rides the whole thing, from the first poster to the festival screen.",
            steps: [
                { when: 'Nov – Dec', title: 'Partners sign on', text: 'We meet with local businesses one-on-one and lock in partners before the shoot.', key: false },
                { when: 'Jan 11', title: 'The fight is announced', text: 'The poster drops. Ace and Beast start posting in character.', key: false },
                { when: 'Jan – Feb', title: 'Shoot + campaign', text: 'Training camp, trash talk, the press conference and the face-off, all filmed during production.', key: false },
                { when: 'Feb 20', title: 'The reveal', text: '"This was never a fight. It\'s a film." Trailer drops. Crowdfund opens.', key: true },
                { when: 'Spring 2027 →', title: 'Festivals', text: 'The finished film goes to festivals. Every selection is a new announcement with your name on it.', key: false },
            ],
            places: [
                { title: 'The fight poster', text: 'Every version: Instagram, posters around Philly, the website.' },
                { title: "The fighters' trunks", text: 'Your logo on Ace or Beast. In the promo videos and in the film itself.' },
                { title: 'The ring canvas', text: 'On camera for every fight scene in the movie.' },
                { title: 'Press conference backdrop', text: 'The step-and-repeat behind the fighters in our biggest viral moment.' },
                { title: 'The website', text: 'Listed as an Official Partner, seen by everyone who votes.' },
                { title: 'The end credits', text: "Your name in the film's credits, at every festival screening." },
            ],
            packs: [
                { tag: '', name: 'Ringside', price: '$250', spots: 'Unlimited', top: false, perks: ['Logo on the website as Official Partner', 'Thank-you post on The Champ Instagram', 'Name in the end credits'] },
                { tag: '', name: 'Corner', price: '$500', spots: '6 spots', top: false, perks: ['Everything in Ringside', 'Logo on the fight poster', 'Logo on the press conference backdrop'] },
                { tag: 'On screen', name: 'Ring Canvas', price: '$1,000', spots: '2 spots', top: false, perks: ['Everything in Corner', 'Logo on the ring canvas, seen in the film', "Logo on one fighter's trunks"] },
                { tag: 'Only one', name: 'Presenting Partner', price: '$2,500', spots: '1 spot', top: true, perks: ['Everything in Ring Canvas', '"Presented by" on the poster, site and reveal', 'Your name on the trailer', 'Special thanks credit in the film', 'Invites to the premiere'] },
            ],
            packsNote: "Want something different? We'll build a package around what your business needs: product in a scene, a branded post, an event at your location.",
            team: [
                { role: 'Campaign & Website', name: 'Name here', text: 'One line about their work.', photo: '' },
                { role: 'Director', name: 'Name here', text: 'One line about their work.', photo: '' },
                { role: 'Producer', name: 'Name here', text: 'One line about their work.', photo: '' },
                { role: 'Director of Photography', name: 'Name here', text: 'One line about their work.', photo: '' },
                { role: 'Ace Broadus', name: 'Actor name', text: 'One line about their work.', photo: '' },
                { role: 'Beast Johnson', name: 'Actor name', text: 'One line about their work.', photo: '' },
            ],
            stats: [
                { n: '', label: 'Instagram reach', note: 'Combined followers across Collab pages' },
                { n: '', label: 'CRATE TV users', note: 'Registered viewers on cratetv.net' },
                { n: '', label: 'Fight votes', note: 'People who picked a side' },
                { n: '', label: 'Email list', note: 'Fans signed up for the reveal' },
            ],
            contactEmail: CHAMP_EMAIL, contactPhone: '',
            form: { ...DEFAULT_INTEREST_FORM },
        },
    };
}

// ── Cleaning what the admin panel sends ─────────────────────────────────────
// Walks the shape of a blank page: anything not in that shape is dropped,
// wrong types fall back to the blank value, text is length-capped, links must
// be https (or a site path), colours must be #rrggbb.

const ITEM_TEMPLATES: Record<string, unknown> = {
    'hero.media': { type: 'image', src: '', pos: '50% 40%' },
    'sideA.tape': ['', ''], 'sideB.tape': ['', ''],
    'partnersBlock.slots': { name: '', logo: '', link: '' },
    'crowdfund.tiers': { amount: '', name: '', text: '', link: '' },
    'instagram.posts': '',
    'partnerPage.steps': { when: '', title: '', text: '', key: false },
    'partnerPage.places': { title: '', text: '' },
    'partnerPage.packs': { tag: '', name: '', price: '', spots: '', perks: [], top: false },
    'partnerPage.packs.perks': '',
    'partnerPage.team': { role: '', name: '', text: '', photo: '' },
    'partnerPage.stats': { n: '', label: '', note: '' },
    'sideA.tape.item': '', 'sideB.tape.item': '',
};
const URL_KEYS = new Set(['src', 'photo', 'logo', 'link', 'url', 'trailerUrl']);
const COLOR_KEYS = new Set(['bg', 'ink', 'accent', 'sideA', 'sideB']);
const LONG_KEYS = new Set(['intro', 'text', 'packsNote']);
const MAX_ITEMS = 40;

export function safeUrl(v: string): string {
    const s = v.trim();
    if (!s) return '';
    if (s.startsWith('/') && !s.startsWith('//')) return s.slice(0, 1000);
    try {
        const u = new URL(s);
        return u.protocol === 'https:' ? u.toString().slice(0, 1000) : '';
    } catch { return ''; }
}
export function instagramPostUrl(v: string): string {
    const m = String(v || '').trim().match(/^https?:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    return m ? `https://www.instagram.com/${m[1]}/${m[2]}/` : '';
}

function cleanValue(v: unknown, example: unknown, path: string, key: string): unknown {
    if (typeof example === 'string') {
        if (typeof v !== 'string') return example;
        if (path === 'instagram.posts') return instagramPostUrl(v);
        if (URL_KEYS.has(key)) return safeUrl(v);
        if (COLOR_KEYS.has(key) && path.startsWith('look.')) return /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim().toLowerCase() : example;
        return v.slice(0, LONG_KEYS.has(key) ? 2000 : 400);
    }
    if (typeof example === 'boolean') return typeof v === 'boolean' ? v : example;
    if (typeof example === 'number') return typeof v === 'number' && Number.isFinite(v) ? v : example;
    if (Array.isArray(example)) {
        if (!Array.isArray(v)) return example;
        const tmpl = ITEM_TEMPLATES[path] ?? ITEM_TEMPLATES[path + '.item'] ?? example[0] ?? '';
        const items = v.slice(0, MAX_ITEMS).map(item => cleanValue(item, tmpl, Array.isArray(tmpl) ? path + '.item' : path, key));
        // Drop empty Instagram links and media with no picture.
        if (path === 'instagram.posts') return items.filter(Boolean);
        if (path === 'hero.media') return (items as PromoMedia[]).filter(m => m.src);
        return items;
    }
    if (example && typeof example === 'object') {
        const src = (v && typeof v === 'object' && !Array.isArray(v)) ? v as Record<string, unknown> : {};
        const out: Record<string, unknown> = {};
        for (const [k, ex] of Object.entries(example as Record<string, unknown>)) {
            out[k] = cleanValue(src[k], ex, path ? `${path}.${k}` : k, k);
        }
        return out;
    }
    return example;
}

/** Clean an incoming page. slug and published are set by the server, never from input. */
export function cleanPromo(input: unknown, slug: string, published: boolean): PromoPage {
    const base = blankPromo(slug, 'Untitled');
    const cleaned = cleanValue(input, base, '', '') as PromoPage;
    cleaned.slug = slug;
    cleaned.published = published;
    if (!cleaned.title.trim()) cleaned.title = 'Untitled';
    if (cleaned.look.template !== 'fight-night') cleaned.look.template = 'fight-night';
    if (!(cleaned.look.font in PROMO_FONTS)) cleaned.look.font = 'anton';
    cleaned.hero.media = cleaned.hero.media.map(m => ({ ...m, type: m.type === 'video' ? 'video' : 'image' }));
    if (cleaned.countdown.date && Number.isNaN(Date.parse(cleaned.countdown.date))) cleaned.countdown.date = '';
    return cleaned;
}

/** Is the page showing its reveal? */
export function isRevealed(page: Pick<PromoPage, 'countdown'>, now = Date.now()): boolean {
    if (page.countdown.forceReveal) return true;
    const t = Date.parse(page.countdown.date);
    return Number.isFinite(t) && now >= t;
}

// ── Votes & sign-ups ────────────────────────────────────────────────────────
export type PromoSideKey = 'a' | 'b';
export interface PromoCounts { votesA: number; votesB: number; signups: number }

/**
 * How the totals change when one email votes / signs up.
 * prev = what that email had before (null if new). Pure, for tests.
 */
export function countChange(prev: { side?: PromoSideKey | null } | null, side: PromoSideKey | null): PromoCounts {
    const d: PromoCounts = { votesA: 0, votesB: 0, signups: prev ? 0 : 1 };
    const before = prev?.side ?? null;
    if (side && side !== before) {
        if (side === 'a') d.votesA++; else d.votesB++;
        if (before === 'a') d.votesA--; else if (before === 'b') d.votesB--;
    }
    return d;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ── "I'm interested" form (partners page) ───────────────────────────────────
// Answers are emailed to the page's contact email. Nothing is saved.

export interface PromoInterest { name: string; business: string; phone: string; email: string; pack: string; message: string }

/** Tidy and check a form answer. Returns the clean answer, or an error a visitor can read. */
export function cleanInterest(input: any, packNames: string[]): { ok: true; value: PromoInterest } | { ok: false; error: string } {
    const s = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);
    const value: PromoInterest = {
        name: s(input?.name, 100), business: s(input?.business, 120), phone: s(input?.phone, 40),
        email: s(input?.email, 200).toLowerCase(), pack: s(input?.pack, 80),
        message: String(input?.message ?? '').trim().slice(0, 1000),
    };
    if (!value.name) return { ok: false, error: 'Please add your name.' };
    if (!value.business) return { ok: false, error: 'Please add your business name.' };
    const digits = value.phone.replace(/\D/g, '');
    if (value.phone && (digits.length < 7 || digits.length > 15)) return { ok: false, error: 'That phone number looks too short.' };
    if (value.email && !EMAIL_RE.test(value.email)) return { ok: false, error: 'That email address looks wrong.' };
    if (!value.phone && !value.email) return { ok: false, error: 'Leave a phone number or an email so we can reach you.' };
    if (value.pack && value.pack !== NOT_SURE && !packNames.includes(value.pack)) value.pack = NOT_SURE;
    if (!value.pack) value.pack = NOT_SURE;
    return { ok: true, value };
}
export const NOT_SURE = 'Not sure yet';

const esc = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** The email that lands in the film's inbox. Plain, so it reads like a note, not a CRATE email. */
export function interestEmail(filmTitle: string, i: PromoInterest): { subject: string; html: string; text: string } {
    const rows: [string, string][] = [
        ['Package', i.pack], ['Name', i.name], ['Business', i.business],
        ['Phone', i.phone || '—'], ['Email', i.email || '—'],
    ];
    const subject = `${filmTitle}: ${i.business} is interested (${i.pack})`;
    const text = `${i.business} wants to talk about partnering on ${filmTitle}.\n\n` +
        rows.map(([k, v]) => `${k}: ${v}`).join('\n') + (i.message ? `\n\nMessage:\n${i.message}` : '') +
        `\n\nCall or reply within two days, while they're still warm.`;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;color:#14110d">` +
        `<p style="font-size:16px"><b>${esc(i.business)}</b> wants to talk about partnering on <b>${esc(filmTitle)}</b>.</p>` +
        `<table style="border-collapse:collapse;font-size:15px">` +
        rows.map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#6b665c">${k}</td><td style="padding:6px 0"><b>${esc(v)}</b></td></tr>`).join('') +
        `</table>` +
        (i.message ? `<p style="font-size:15px;margin-top:18px;white-space:pre-wrap">${esc(i.message)}</p>` : '') +
        `<p style="font-size:13px;color:#6b665c;margin-top:24px">Call or reply within two days, while they're still warm.</p></div>`;
    return { subject, html, text };
}
