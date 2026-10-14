// api/_lib/festivalHelpRules.ts
//
// Festival help button: the pure, database-free rules that decide what the
// self-service helper may fix on its own. Covered by tests/festivalHelp.test.ts.
//
// The helper only ever RESTORES access a viewer already paid for, using the
// same expiry rules as the original purchase. It never grants anything that
// has no ticket record behind it, never re-opens access that has legitimately
// ended, never touches a ticket marked refunded/revoked, and never touches
// film rentals (those go to a person).

import { blockAccessExpiry } from './watchPartyRules.js';
import { partnerIdFromPassItem, PWFF_PASS_ITEM_ID } from './partnerRules.js';

export interface HelpTicket {
    id: string;
    itemId?: string | null;
    paymentType?: string | null;
    uid?: string | null;
    email?: string | null;
    purchasedAtMs?: number | null;
    refunded?: boolean;
    revoked?: boolean;
    status?: string | null;
}

export interface HelpUserAccess {
    unlockedBlocks?: Record<string, string>;
    hasFestivalAllAccess?: boolean;
    festivalPassExpiry?: string;
    partnerPasses?: Record<string, string>;
    unlockedWatchPartyKeys?: string[];
    rentals?: Record<string, string>;
}

export interface HelpBlockInfo { id: string; title: string; screeningStartTime?: string | null }

export interface PwffWindow { firstStartMs: number; lastStartMs: number }

export type RepairAction =
    | { kind: 'ok' }                                    // access is already there
    | { kind: 'grant-block'; blockId: string; expiresAt: string }
    | { kind: 'grant-all-access' }
    | { kind: 'grant-partner-pass'; partnerId: string }
    | { kind: 'grant-watch-party'; movieKey: string }
    | { kind: 'ended' }                                 // the ticket's access window is over
    | { kind: 'refunded' }                              // marked refunded/revoked — a person decides
    | { kind: 'needs-person' };                         // rentals, unknown items

export interface TicketDiagnosis { ticketId: string; itemId: string; label: string; action: RepairAction }

const DAY = 24 * 60 * 60 * 1000;
/** A PWFF all-access pass only belongs to a festival that started within this long after purchase. */
export const PASS_BELONGS_TO_FESTIVAL_MS = 180 * DAY;

/** Shows only enough of an email for someone to recognise their own: j•••@gmail.com */
export function maskEmail(email: string | null | undefined): string {
    if (!email || !email.includes('@')) return '';
    const [user, domain] = email.split('@');
    return `${user.slice(0, 1)}•••@${domain}`;
}

export const sameEmail = (a: unknown, b: unknown) =>
    typeof a === 'string' && typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase() && a.trim() !== '';

/** Tickets this account owns: bought while signed in as it, or bought with its email and never attached to any account. */
export function ownedTickets(tickets: HelpTicket[], uid: string, email: string | null | undefined): HelpTicket[] {
    return tickets.filter(t => t.uid === uid || (!t.uid && sameEmail(t.email, email)));
}

function isRefunded(t: HelpTicket): boolean {
    return !!t.refunded || !!t.revoked || t.status === 'refunded' || t.status === 'revoked';
}

/**
 * For one ticket, what (if anything) needs restoring on the account.
 * `rewatchWindowMs` is the festival rewatch week (FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS).
 */
export function diagnoseTicket(
    t: HelpTicket,
    user: HelpUserAccess,
    ctx: {
        nowMs: number;
        rewatchWindowMs: number;
        blocks: Map<string, HelpBlockInfo>;
        pwff: PwffWindow | null;
        labels?: Map<string, string>;
    },
): TicketDiagnosis {
    const itemId = String(t.itemId || '');
    const label = ctx.labels?.get(itemId) || ctx.blocks.get(itemId)?.title || itemId || 'Unknown item';
    const out = (action: RepairAction): TicketDiagnosis => ({ ticketId: t.id, itemId, label, action });
    if (!itemId) return out({ kind: 'needs-person' });
    if (isRefunded(t)) return out({ kind: 'refunded' });
    const purchasedAtMs = t.purchasedAtMs || ctx.nowMs;

    // PWFF all-access pass
    if (itemId === PWFF_PASS_ITEM_ID) {
        const hasIt = !!user.hasFestivalAllAccess || (!!user.festivalPassExpiry && Date.parse(user.festivalPassExpiry) > ctx.nowMs);
        if (hasIt) return out({ kind: 'ok' });
        // Only restore a pass for THIS year's festival: bought no more than
        // 180 days before it starts, and the rewatch week isn't over yet.
        if (!ctx.pwff) return out({ kind: 'needs-person' });
        const belongs = purchasedAtMs >= ctx.pwff.firstStartMs - PASS_BELONGS_TO_FESTIVAL_MS;
        const stillOn = ctx.nowMs <= ctx.pwff.lastStartMs + ctx.rewatchWindowMs + DAY;
        if (!belongs || !stillOn) return out({ kind: 'ended' });
        return out({ kind: 'grant-all-access' });
    }

    // Partner festival pass
    const passPartner = partnerIdFromPassItem(itemId);
    if (passPartner) {
        if (user.partnerPasses?.[passPartner]) return out({ kind: 'ok' });
        return out({ kind: 'grant-partner-pass', partnerId: passPartner });
    }

    // Block ticket (PWFF, Crate Fest or a partner festival)
    if (t.paymentType === 'block') {
        const block = ctx.blocks.get(itemId);
        if (!block) return out({ kind: 'needs-person' });
        const shouldLast = blockAccessExpiry({ nowMs: purchasedAtMs, screeningStartTime: block.screeningStartTime, rewatchWindowMs: ctx.rewatchWindowMs });
        if (shouldLast.getTime() <= ctx.nowMs) return out({ kind: 'ended' });
        const current = user.unlockedBlocks?.[itemId];
        if (current && Date.parse(current) >= shouldLast.getTime()) return out({ kind: 'ok' });
        return out({ kind: 'grant-block', blockId: itemId, expiresAt: shouldLast.toISOString() });
    }

    // Single-film watch party ticket
    if (t.paymentType === 'watchPartyTicket') {
        if ((user.unlockedWatchPartyKeys || []).includes(itemId)) return out({ kind: 'ok' });
        return out({ kind: 'grant-watch-party', movieKey: itemId });
    }

    // Film rentals have their own expiry rules — a person checks those.
    if (t.paymentType === 'movie') {
        const exp = user.rentals?.[itemId];
        if (exp && Date.parse(exp) > ctx.nowMs) return out({ kind: 'ok' });
        return out({ kind: 'needs-person' });
    }
    return out({ kind: 'needs-person' });
}

/** First and last PWFF screening start, from the schedule shown on /pwff. */
export function pwffWindowOf(blocks: { screeningStartTime?: string | null; watchPartyStartTime?: string | null }[]): PwffWindow | null {
    const starts = blocks.map(b => Date.parse(String(b.screeningStartTime || b.watchPartyStartTime || ''))).filter(Number.isFinite);
    if (!starts.length) return null;
    return { firstStartMs: Math.min(...starts), lastStartMs: Math.max(...starts) };
}

export const HELP_CATEGORIES = ['ticket', 'playback', 'schedule', 'email', 'other'] as const;
export type HelpCategory = typeof HELP_CATEGORIES[number];
