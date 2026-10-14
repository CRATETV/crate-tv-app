// api/_lib/partnerRules.ts
//
// "Festival in a box" — the pure, database-free rules for partner festivals.
// Shared by the server (api/partner-portal.ts, api/admin-partners.ts) and the
// browser (PartnerPortalPage, PartnersAdminTab, PartnerFestivalPage), so the
// portal shows exactly the same validation, sales totals and payout math the
// server uses. Covered by tests/partnerRules.test.ts.
//
// How a partner festival flows:
//   1. CRATE admin creates a partner and invites the partner's team by email.
//   2. The team signs in at /partner and builds a DRAFT: festival details,
//      films (uploads + runtimes) and a schedule of blocks.
//   3. They submit it; CRATE reviews, then approves (publishes) or sends it
//      back with a note.
//   4. Publishing turns the draft into normal CRATE movies + festival blocks
//      tagged with the partner's id, so tickets, watch parties, reminders,
//      auto-advance and rewatch all work exactly as they do for PWFF.
//   5. Sales and the end-of-festival payout report are computed from
//      festival_tickets attributed to the partner's blocks, pass and films.

// ─── Types ────────────────────────────────────────────────────────────────

export interface PartnerFilmDraft {
    id: string;
    title: string;
    director: string;
    synopsis: string;
    durationInMinutes: number;
    posterUrl: string;
    videoUrl: string;
    year?: string;
    country?: string;
    /** The festival gave CRATE permission to keep this film on the site
     *  after the festival (like LUNA). Everything else is deleted. */
    keepAfterFestival?: boolean;
}

export interface PartnerBlockDraft {
    id: string;
    title: string;
    filmIds: string[];
    /** ISO string (UTC), entered in the partner's local time zone. */
    screeningStartTime: string;
    price: number;
    capacity?: number;
    releaseAfterScreening?: boolean;
}

export interface PartnerDayDraft {
    day: number;
    /** Display label, e.g. "Friday, May 14". */
    date: string;
    blocks: PartnerBlockDraft[];
}

export interface PartnerFestivalDetails {
    title: string;
    tagline: string;
    description: string;
    startDate: string;
    endDate: string;
    /** Hex colour, e.g. "#e11d48". */
    accentColor: string;
    logoUrl: string;
    heroImageUrl: string;
    websiteUrl?: string;
    /** All-access pass price for this festival. 0/empty = no pass sold. */
    passPrice?: number;
    /** IANA time zone the schedule was entered in (from the partner's browser). */
    timeZone?: string;
}

export interface PartnerDraft {
    details: PartnerFestivalDetails;
    films: PartnerFilmDraft[];
    days: PartnerDayDraft[];
    updatedAt?: string;
}

export type ReviewState = 'draft' | 'submitted' | 'changes_requested' | 'approved';

export interface PartnerReview {
    state: ReviewState;
    note?: string;
    submittedAt?: string;
    reviewedAt?: string;
}

export interface PartnerPublished {
    details: PartnerFestivalDetails;
    blockIds: string[];
    filmKeys: string[];
    publishedAt: string;
}

export interface PartnerPayout {
    deductions: number;
    deductionsNote?: string;
    paidAt?: string;
    paidAmount?: number;
    paidNote?: string;
}

export interface PartnerCleanup {
    deletedAt: string;
    deletedFilmKeys: string[];
    keptFilmKeys: string[];
    failedFiles?: string[];
}

export interface PartnerRecord {
    id: string;
    name: string;
    slug: string;
    /** Who the partner's share is paid to (e.g. a 501(c)(3) foundation). */
    payeeName: string;
    contactEmail: string;
    /** CRATE's share of net sales, in percent (e.g. 30). */
    crateSharePct: number;
    memberUids: string[];
    memberEmails: string[];
    status: 'active' | 'archived';
    createdAt: string;
    draft?: PartnerDraft;
    review: PartnerReview;
    published?: PartnerPublished;
    payout?: PartnerPayout;
    cleanup?: PartnerCleanup;
}

/** The public, non-sensitive slice of a partner shown on its festival page. */
export interface PublicPartnerFestival {
    partnerId: string;
    name: string;
    slug: string;
    details: PartnerFestivalDetails;
    blockIds: string[];
}

export interface TicketLike {
    itemId?: string;
    paymentType?: string;
    amountPaid?: number;
    purchasedAt?: string | null;
    partnerId?: string | null;
}

// ─── Ids & keys ───────────────────────────────────────────────────────────

export function slugify(input: string): string {
    return (input || '')
        .toLowerCase()
        .normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
}

/** Short random id for draft films/blocks (browser or server). */
export function newDraftId(): string {
    const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
    const bytes = new Uint8Array(8);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

const SAFE_ID = /^[a-z0-9-]{1,48}$/;
export const isSafeId = (id: unknown): id is string => typeof id === 'string' && SAFE_ID.test(id);

// Movie keys and block ids must match the site's route patterns
// (/movie/:key, /watchparty/:key → [a-zA-Z0-9_-]+).
export const partnerFilmKey = (partnerId: string, filmId: string) => `p_${partnerId}_${filmId}`.replace(/-/g, '_');
export const partnerBlockId = (partnerId: string, blockId: string) => `p_${partnerId}_b_${blockId}`.replace(/-/g, '_');
export const partnerDayDocId = (partnerId: string, day: number) => `partner_${partnerId}_day_${day}`;
export const partnerPassItemId = (partnerId: string) => `partner-pass:${partnerId}`;
export const PARTNER_PASS_PREFIX = 'partner-pass:';
export const partnerIdFromPassItem = (itemId: unknown): string | null =>
    typeof itemId === 'string' && itemId.startsWith(PARTNER_PASS_PREFIX) && isSafeId(itemId.slice(PARTNER_PASS_PREFIX.length))
        ? itemId.slice(PARTNER_PASS_PREFIX.length)
        : null;

export function emptyDraft(name = ''): PartnerDraft {
    return {
        details: {
            title: name, tagline: '', description: '', startDate: '', endDate: '',
            accentColor: '#e11d48', logoUrl: '', heroImageUrl: '', websiteUrl: '', passPrice: 0,
        },
        films: [],
        days: [],
    };
}

// ─── Validation ───────────────────────────────────────────────────────────

export interface DraftCheck { errors: string[]; warnings: string[] }

const isHttpsUrl = (u: unknown) => typeof u === 'string' && /^https:\/\/\S+$/.test(u);
const isHexColour = (c: unknown) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);

/** What must be fixed before a draft can be submitted (errors) or should be
 *  double-checked (warnings). Shown live in the partner portal. */
export function checkDraft(draft: PartnerDraft | undefined | null): DraftCheck {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!draft) return { errors: ['Nothing has been entered yet.'], warnings };

    const d = draft.details || ({} as PartnerFestivalDetails);
    if (!d.title?.trim()) errors.push('Festival name is missing.');
    if (!d.description?.trim()) warnings.push('Add a short festival description for the public page.');
    if (d.accentColor && !isHexColour(d.accentColor)) errors.push('Brand colour must look like #e11d48.');
    if (d.passPrice != null && (typeof d.passPrice !== 'number' || d.passPrice < 0)) errors.push('Festival pass price must be 0 or more.');

    const films = draft.films || [];
    if (films.length === 0) errors.push('Add at least one film.');
    const filmIds = new Set<string>();
    films.forEach((f, i) => {
        const label = f.title?.trim() ? `"${f.title.trim()}"` : `Film ${i + 1}`;
        if (!isSafeId(f.id)) errors.push(`${label} has an invalid id.`);
        if (filmIds.has(f.id)) errors.push(`${label} is listed twice.`);
        filmIds.add(f.id);
        if (!f.title?.trim()) errors.push(`${label} needs a title.`);
        if (!f.director?.trim()) warnings.push(`${label} has no director listed.`);
        if (!isHttpsUrl(f.videoUrl)) errors.push(`${label} needs its video uploaded.`);
        if (!isHttpsUrl(f.posterUrl)) warnings.push(`${label} has no poster.`);
        if (!(typeof f.durationInMinutes === 'number' && f.durationInMinutes > 0)) {
            errors.push(`${label} needs its runtime (minutes) — the watch party uses it to know when to move on.`);
        }
    });

    const days = draft.days || [];
    const blocks = days.flatMap(day => day.blocks || []);
    if (blocks.length === 0) errors.push('Add at least one screening block to the schedule.');
    const dayNumbers = new Set<number>();
    days.forEach(day => {
        if (!(Number.isInteger(day.day) && day.day > 0)) errors.push('Each schedule day needs a day number (1, 2, 3…).');
        if (dayNumbers.has(day.day)) errors.push(`Day ${day.day} appears twice.`);
        dayNumbers.add(day.day);
    });

    const blockIds = new Set<string>();
    const usedFilms = new Set<string>();
    blocks.forEach((b, i) => {
        const label = b.title?.trim() ? `Block "${b.title.trim()}"` : `Block ${i + 1}`;
        if (!isSafeId(b.id)) errors.push(`${label} has an invalid id.`);
        if (blockIds.has(b.id)) errors.push(`${label} is listed twice.`);
        blockIds.add(b.id);
        if (!b.title?.trim()) errors.push(`${label} needs a title.`);
        if (!b.screeningStartTime || Number.isNaN(Date.parse(b.screeningStartTime))) errors.push(`${label} needs a start date and time.`);
        if (!(typeof b.price === 'number' && b.price >= 0)) errors.push(`${label} needs a ticket price (0 for free).`);
        else if (b.price === 0) warnings.push(`${label} is free.`);
        if (b.capacity != null && !(Number.isInteger(b.capacity) && b.capacity >= 0)) errors.push(`${label} capacity must be a whole number.`);
        if (!b.filmIds?.length) errors.push(`${label} has no films.`);
        const seen = new Set<string>();
        (b.filmIds || []).forEach(fid => {
            if (!filmIds.has(fid)) errors.push(`${label} includes a film that was removed.`);
            if (seen.has(fid)) errors.push(`${label} lists the same film twice.`);
            seen.add(fid);
            usedFilms.add(fid);
        });
    });
    films.forEach(f => {
        if (!usedFilms.has(f.id)) warnings.push(`"${f.title || 'Untitled'}" isn't in any block yet.`);
    });
    return { errors, warnings };
}

// ─── Publishing ───────────────────────────────────────────────────────────

export interface PublishPlan {
    movies: Record<string, Record<string, unknown>>;
    days: { docId: string; data: Record<string, unknown> }[];
    blockIds: string[];
    filmKeys: string[];
}

export function formatBlockTime(when: Date, timeZone?: string): string {
    try {
        return when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timeZone || 'America/New_York', timeZoneName: 'short' });
    } catch {
        return when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' });
    }
}

/** Turns an approved draft into CRATE movie docs + festival day docs. */
export function buildPublishPlan(partner: Pick<PartnerRecord, 'id' | 'name' | 'slug'>, draft: PartnerDraft): PublishPlan {
    const filmKeyById = new Map(draft.films.map(f => [f.id, partnerFilmKey(partner.id, f.id)]));
    const movies: PublishPlan['movies'] = {};
    for (const f of draft.films) {
        const key = filmKeyById.get(f.id)!;
        movies[key] = {
            key,
            title: f.title.trim(),
            director: (f.director || '').trim(),
            synopsis: (f.synopsis || '').trim(),
            poster: f.posterUrl || '',
            tvPoster: f.posterUrl || '',
            fullMovie: f.videoUrl,
            durationInMinutes: f.durationInMinutes,
            trailer: '',
            cast: [],
            // Hidden from the main catalog rows; shown on the partner's own
            // festival page. releaseAfterScreening on a block can list it later.
            isUnlisted: true,
            partnerId: partner.id,
            partnerName: partner.name,
            partnerSlug: partner.slug,
            // Respected by the auto-unlist cron; films without it are deleted
            // after the festival (see festivalCleanupDueMs / cleanup-partner-festivals).
            keepInCatalogAfterFestival: !!f.keepAfterFestival,
        };
        // strip undefined (Firestore rejects them)
        Object.keys(movies[key]).forEach(k => movies[key][k] === undefined && delete movies[key][k]);
    }

    const blockIds: string[] = [];
    const days = [...draft.days].sort((a, b) => a.day - b.day).map(day => {
        const blocks = (day.blocks || []).map(b => {
            const id = partnerBlockId(partner.id, b.id);
            blockIds.push(id);
            const start = new Date(b.screeningStartTime);
            return {
                id,
                title: b.title.trim(),
                time: formatBlockTime(start, draft.details?.timeZone),
                movieKeys: b.filmIds.map(fid => filmKeyById.get(fid)!).filter(Boolean),
                price: b.price,
                screeningStartTime: start.toISOString(),
                watchPartyStartTime: start.toISOString(),
                isWatchPartyEnabled: true,
                releaseAfterScreening: !!b.releaseAfterScreening,
                ...(b.capacity ? { capacity: b.capacity } : {}),
                partnerId: partner.id,
            };
        });
        return {
            docId: partnerDayDocId(partner.id, day.day),
            data: { day: day.day, date: day.date || '', blocks, partnerId: partner.id },
        };
    });

    return { movies, days, blockIds, filmKeys: [...filmKeyById.values()] };
}

/** Ticket/visibility windows keep working for blocks already on sale, so a
 *  republish must never silently drop a block people bought tickets for. */
export function blocksRemovedWithSales(previousBlockIds: string[], nextBlockIds: string[], soldBlockIds: Set<string>): string[] {
    const next = new Set(nextBlockIds);
    return previousBlockIds.filter(id => !next.has(id) && soldBlockIds.has(id));
}

// ─── Sales & payout ───────────────────────────────────────────────────────

export interface SalesLine { id: string; label: string; orders: number; gross: number }
export interface SalesSummary {
    blocks: SalesLine[];
    pass: SalesLine;
    rentals: SalesLine;
    totals: { orders: number; gross: number; free: number };
    lastSaleAt: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeSales(
    tickets: TicketLike[],
    ctx: { partnerId: string; blocks: { id: string; title: string }[]; filmKeys: string[] },
): SalesSummary {
    const blockIndex = new Map(ctx.blocks.map(b => [b.id, b.title]));
    const filmKeys = new Set(ctx.filmKeys);
    const passId = partnerPassItemId(ctx.partnerId);
    const blocks = new Map<string, SalesLine>(ctx.blocks.map(b => [b.id, { id: b.id, label: b.title, orders: 0, gross: 0 }]));
    const pass: SalesLine = { id: passId, label: 'Festival pass', orders: 0, gross: 0 };
    const rentals: SalesLine = { id: 'rentals', label: 'Individual film rentals', orders: 0, gross: 0 };
    let free = 0;
    let lastSaleAt: string | null = null;

    for (const t of tickets) {
        const amount = typeof t.amountPaid === 'number' && t.amountPaid > 0 ? t.amountPaid : 0;
        let line: SalesLine | undefined;
        if (t.itemId === passId) line = pass;
        else if (t.itemId && blockIndex.has(t.itemId)) line = blocks.get(t.itemId);
        else if (t.paymentType === 'movie' && t.itemId && filmKeys.has(t.itemId)) line = rentals;
        else if (t.partnerId === ctx.partnerId && t.itemId) {
            // A block that has since been removed from the schedule — keep the money visible.
            if (!blocks.has(t.itemId)) blocks.set(t.itemId, { id: t.itemId, label: 'Removed block', orders: 0, gross: 0 });
            line = blocks.get(t.itemId);
        }
        if (!line) continue;
        line.orders += 1;
        line.gross = round2(line.gross + amount);
        if (amount === 0) free += 1;
        if (t.purchasedAt && (!lastSaleAt || t.purchasedAt > lastSaleAt)) lastSaleAt = t.purchasedAt;
    }

    const blockLines = [...blocks.values()];
    const all = [...blockLines, pass, rentals];
    return {
        blocks: blockLines,
        pass,
        rentals,
        totals: {
            orders: all.reduce((s, l) => s + l.orders, 0),
            gross: round2(all.reduce((s, l) => s + l.gross, 0)),
            free,
        },
        lastSaleAt,
    };
}

export interface PayoutBreakdown {
    gross: number;
    deductions: number;
    net: number;
    crateSharePct: number;
    crateAmount: number;
    partnerAmount: number;
}

/** Same method used for PWFF: deductions come off first, then CRATE's % of
 *  what's left; the partner receives the remainder. */
export function computePayout(gross: number, deductions: number, crateSharePct: number): PayoutBreakdown {
    const g = round2(Math.max(0, gross || 0));
    const d = round2(Math.min(g, Math.max(0, deductions || 0)));
    const pct = Math.min(100, Math.max(0, crateSharePct || 0));
    const net = round2(g - d);
    const crateAmount = round2(net * pct / 100);
    return { gross: g, deductions: d, net, crateSharePct: pct, crateAmount, partnerAmount: round2(net - crateAmount) };
}

// ─── Sanitising input from the browser ────────────────────────────────────

const str = (v: unknown, max: number) => (typeof v === 'string' ? v : '').slice(0, max);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v));
const url = (v: unknown) => {
    const s = str(v, 2048).trim();
    return /^https:\/\/\S+$/.test(s) ? s : '';
};

/** Keeps only known fields, with sane types and lengths. Never trusts the browser. */
export function sanitizeDraft(input: any): PartnerDraft {
    const d = input?.details || {};
    const pass = num(d.passPrice);
    const details: PartnerFestivalDetails = {
        title: str(d.title, 120).trim(),
        tagline: str(d.tagline, 200),
        description: str(d.description, 4000),
        startDate: str(d.startDate, 40),
        endDate: str(d.endDate, 40),
        accentColor: /^#[0-9a-fA-F]{6}$/.test(str(d.accentColor, 7)) ? str(d.accentColor, 7) : '#e11d48',
        logoUrl: url(d.logoUrl),
        heroImageUrl: url(d.heroImageUrl),
        websiteUrl: url(d.websiteUrl),
        passPrice: Number.isFinite(pass) && pass > 0 ? Math.round(pass * 100) / 100 : 0,
        timeZone: str(d.timeZone, 64) || 'America/New_York',
    };
    const films: PartnerFilmDraft[] = (Array.isArray(input?.films) ? input.films : []).slice(0, 200).map((f: any) => {
        const dur = num(f?.durationInMinutes);
        return {
            id: isSafeId(f?.id) ? f.id : newDraftId(),
            title: str(f?.title, 160),
            director: str(f?.director, 160),
            synopsis: str(f?.synopsis, 3000),
            durationInMinutes: Number.isFinite(dur) && dur > 0 ? Math.min(600, Math.ceil(dur)) : 0,
            posterUrl: url(f?.posterUrl),
            videoUrl: url(f?.videoUrl),
            year: str(f?.year, 8),
            country: str(f?.country, 80),
            keepAfterFestival: !!f?.keepAfterFestival,
        };
    });
    const days: PartnerDayDraft[] = (Array.isArray(input?.days) ? input.days : []).slice(0, 31).map((day: any) => ({
        day: Math.max(1, Math.min(99, Math.round(num(day?.day)) || 1)),
        date: str(day?.date, 60),
        blocks: (Array.isArray(day?.blocks) ? day.blocks : []).slice(0, 40).map((b: any) => {
            const price = num(b?.price);
            const cap = num(b?.capacity);
            return {
                id: isSafeId(b?.id) ? b.id : newDraftId(),
                title: str(b?.title, 160),
                filmIds: (Array.isArray(b?.filmIds) ? b.filmIds : []).filter(isSafeId).slice(0, 40),
                screeningStartTime: Number.isNaN(Date.parse(str(b?.screeningStartTime, 40))) ? '' : new Date(str(b?.screeningStartTime, 40)).toISOString(),
                price: Number.isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : -1,
                ...(Number.isFinite(cap) && cap > 0 ? { capacity: Math.round(cap) } : {}),
                releaseAfterScreening: !!b?.releaseAfterScreening,
            };
        }),
    }));
    return { details, films, days, updatedAt: new Date().toISOString() };
}

// ─── After the festival: film cleanup ─────────────────────────────────────

/** Extra time after the rewatch window closes before partner films are
 *  deleted — room for late refunds, disputes or a "please keep it" request. */
export const PARTNER_FILM_CLEANUP_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * When a partner festival's films are due to be deleted: the latest block's
 * end (or start, if it never had a watch party) + the rewatch window + the
 * grace period. Null when there are no blocks or a block has no time yet.
 */
export function festivalCleanupDueMs(
    blocks: { screeningStartTime?: string; festivalEndTime?: string }[],
    rewatchWindowMs: number,
    graceMs: number = PARTNER_FILM_CLEANUP_GRACE_MS,
): number | null {
    if (!blocks.length) return null;
    let latest = -Infinity;
    for (const b of blocks) {
        const t = Date.parse(b.festivalEndTime || b.screeningStartTime || '');
        if (Number.isNaN(t)) return null;
        latest = Math.max(latest, t);
    }
    return latest + rewatchWindowMs + graceMs;
}

/**
 * The storage key for a file a partner uploaded — or null if the URL is not
 * inside THIS partner's folder of OUR bucket. Cleanup never deletes anything
 * else (CRATE's own films, another partner's files, outside links).
 */
export function partnerStorageKey(url: unknown, bucket: string, partnerId: string): string | null {
    if (typeof url !== 'string' || !url || !bucket || !isSafeId(partnerId)) return null;
    let u: URL;
    try { u = new URL(url); } catch { return null; }
    if (u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase();
    let key: string;
    if (host === `${bucket}.s3.amazonaws.com` || (host.startsWith(`${bucket}.s3.`) && host.endsWith('.amazonaws.com'))) {
        key = u.pathname.replace(/^\//, '');
    } else if (/^s3[.-]([a-z0-9-]+\.)?amazonaws\.com$/.test(host) && u.pathname.startsWith(`/${bucket}/`)) {
        key = u.pathname.slice(bucket.length + 2);
    } else {
        return null;
    }
    try { key = decodeURIComponent(key); } catch { return null; }
    if (key.includes('..')) return null;
    return key.startsWith(`partners/${partnerId}/`) ? key : null;
}
