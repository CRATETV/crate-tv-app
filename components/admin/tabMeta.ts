import type { AccentName } from './ui';

// Every admin tab: its name, icon, one-line description and search words.
// The tab IDs never change (staff permissions are stored by ID).

export interface TabMeta { label: string; icon: string; desc: string; keywords?: string }

export const TAB_META: Record<string, TabMeta> = {
    pulse:        { label: 'Overview', icon: '✨', desc: 'What needs you today, and how CRATE is doing.', keywords: 'home dashboard today pulse' },

    movies:       { label: 'Films', icon: '🎞️', desc: 'Add, edit and publish films in the catalog.', keywords: 'catalog movies add film upload edit' },
    bulkUpload:   { label: 'Bulk upload films', icon: '📤', desc: 'Upload many films at once (a whole festival); each is converted for streaming.', keywords: 'bulk upload many films festival convert video s3 mediaconvert hls' },
    submissions:  { label: 'Submissions', icon: '📥', desc: 'Films submitted to CRATE, waiting for review.', keywords: 'pipeline new films review' },
    homepage:     { label: 'Homepage', icon: '🏠', desc: 'The hero banner and featured films on the home screen.', keywords: 'hero featured banner' },
    categories:   { label: 'Rows & categories', icon: '🗂️', desc: 'The rows of films people browse.', keywords: 'rows categories carousel order' },
    spotlight:    { label: 'Monthly spotlight', icon: '🌟', desc: 'Pick a catalog film to highlight and email about each month.', keywords: 'spotlight highlight feature email' },
    editorial:    { label: 'Editorial', icon: '✍️', desc: 'Write and publish stories for The Unpack (the zine).', keywords: 'articles stories zine unpack write blog magazine partner pieces' },
    laurels:      { label: 'Laurels', icon: '🏆', desc: 'Award laurels for festival winners and selections.', keywords: 'awards laurel' },

    watchParty:   { label: 'Watch parties', icon: '🍿', desc: 'Schedule and run live screenings.', keywords: 'live screening premiere watch party' },
    pwff:         { label: 'PWFF festival', icon: '🎬', desc: 'Philadelphia Workplace Film Festival: dates, schedule, red carpet.', keywords: 'pwff festival red carpet playhouse' },
    partners:     { label: 'Partner festivals', icon: '🤝', desc: 'Other festivals running on CRATE (Festival in a box).', keywords: 'partners festival in a box' },
    crateFestHub: { label: 'Crate Fest', icon: '🎪', desc: "CRATE's own online festival, for when you're ready to run one.", keywords: 'crate fest festival future online' },
    ticketCodes:  { label: 'Access codes', icon: '🎟️', desc: 'Ticket and access codes for screenings and blocks.', keywords: 'tickets codes access' },

    users:        { label: 'Audience', icon: '👥', desc: 'Your viewers: who signed up, what they watch, account help.', keywords: 'users viewers accounts lookup' },
    actors:       { label: 'Actor approvals', icon: '🎭', desc: 'Approve actor profiles before they go public.', keywords: 'actors portal approve profiles talent' },
    email:        { label: 'Email', icon: '✉️', desc: 'Reply to messages and email your audience.', keywords: 'mail inbox newsletter blast' },

    money:        { label: 'Earnings & payouts', icon: '💸', desc: 'What every film earned, the split, and who you owe.', keywords: 'money revenue payouts pay filmmakers split earnings' },
    refunds:      { label: 'Payments & refunds', icon: '💳', desc: 'Every payment, double-charge alerts, and two-click refunds.', keywords: 'refund refunds payments double charge square customer charged twice' },
    contracts:    { label: 'Contracts', icon: '📜', desc: 'Send agreements, see who signed, keep signed copies.', keywords: 'contracts agreements sign legal w9' },
    vouchers:     { label: 'Promo codes', icon: '🏷️', desc: 'Discount and free-access codes.', keywords: 'promo vouchers discount coupon' },
    shop:         { label: 'Shop', icon: '🛍️', desc: 'Merch requests and shop revenue.', keywords: 'merch fourthwall store shop' },

    analytics:    { label: 'Stats', icon: '📊', desc: 'Views, growth and where your audience comes from.', keywords: 'analytics stats views growth' },
    roku:         { label: 'Roku', icon: '📺', desc: 'The Roku channel: rows, hero, announcements and stats.', keywords: 'roku tv channel' },
    storage:      { label: 'Storage clean-up', icon: '🧹', desc: 'Video files CRATE no longer uses: keep or delete them.', keywords: 's3 bucket storage cleanup clean up delete videos files aws cost' },
    system:       { label: 'Logs & security', icon: '🛡️', desc: 'Activity log, errors and security checks.', keywords: 'audit logs errors security' },
    permissions:  { label: 'Team & permissions', icon: '🔑', desc: 'Who on your team can open which tabs.', keywords: 'permissions team staff access roles' },
};

export const TAB_GROUPS: { title: string; accent: AccentName; ids: string[] }[] = [
    { title: 'Home', accent: 'coral', ids: ['pulse'] },
    { title: 'Films & content', accent: 'orange', ids: ['movies', 'bulkUpload', 'submissions', 'homepage', 'categories', 'spotlight', 'editorial', 'laurels'] },
    { title: 'Live & festivals', accent: 'violet', ids: ['watchParty', 'pwff', 'partners', 'crateFestHub', 'ticketCodes'] },
    { title: 'People', accent: 'magenta', ids: ['users', 'actors', 'email'] },
    { title: 'Money & legal', accent: 'green', ids: ['money', 'refunds', 'contracts', 'vouchers', 'shop'] },
    { title: 'Platform', accent: 'sky', ids: ['analytics', 'roku', 'storage', 'system', 'permissions'] },
];

export const groupOf = (id: string) => TAB_GROUPS.find(g => g.ids.includes(id));

/** Tabs that draw their own page header. */
export const SELF_HEADED = new Set(['pulse', 'money', 'refunds', 'contracts', 'actors', 'storage', 'bulkUpload']);
