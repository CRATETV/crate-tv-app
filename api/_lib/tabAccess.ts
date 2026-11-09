// api/_lib/tabAccess.ts
//
// Which admin-panel tabs a staff member may use — the SERVER's copy of the
// rules the panel (components/AdminPage.tsx) uses to build its menu.
//
// Before this existed, the panel only HID tabs a staff member hadn't been
// given. The data endpoints behind those tabs just asked "is this any valid
// staff key?", so someone given only "Films" could still call the Email,
// Subscribers or Submissions endpoints directly. Now the endpoints ask
// canUseTab() as well.
//
// Keep this in step with AdminPage.tsx (LEGACY_TAB_MAP, MASTER_ONLY and the
// implied-tab rules). tests/tabAccess.test.ts pins the rules.

// Old tab IDs that may still be saved in staff grants → the tab they live in now.
export const LEGACY_TAB_MAP: Record<string, string> = {
    hero: 'homepage', heroSpotlight: 'homepage',
    mail: 'email', dispatch: 'email',
    intel: 'users', accountLookup: 'users',
    payouts: 'money', revenueFlow: 'money',
    shopRequests: 'shop', shopRevenue: 'shop',
    rokuControl: 'roku', rokuAnalytics: 'roku',
    audit: 'system', errorLog: 'system', security: 'system',
    festivalReport: 'pwff',
    pipeline: 'submissions',
};

// Never open to staff, whatever is saved in Firestore. Only the owner/master keys.
export const MASTER_ONLY_TABS = ['permissions', 'system', 'money', 'bookkeeping', 'refunds', 'contracts', 'roku', 'partners', 'storage'];

/** The tabs a staff grant really opens: old IDs renamed, implied tabs added, master-only tabs removed. */
export function effectiveTabs(assigned: unknown): string[] {
    const list = Array.isArray(assigned) ? assigned.filter((t): t is string => typeof t === 'string') : [];
    const granted = new Set(list.map(id => LEGACY_TAB_MAP[id] || id));
    // Actor approvals used to live inside Submissions — keep that access.
    if (granted.has('submissions')) granted.add('actors');
    // Whoever can edit Films can also bulk-upload them.
    if (granted.has('movies')) granted.add('bulkUpload');
    return [...granted].filter(t => !MASTER_ONLY_TABS.includes(t));
}

/** True when the grant opens at least one of the tabs an endpoint serves. */
export function grantAllows(assigned: unknown, tabs: string[]): boolean {
    const open = effectiveTabs(assigned);
    return tabs.some(t => open.includes(t));
}
