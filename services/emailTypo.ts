// Catches obvious email typos at sign-up (for example "name@gmail.con").
//
// Firebase only checks that an address is shaped like an email, so a typo'd
// address creates an account that can never receive mail (verification,
// tickets, replies). This only flags clear mistakes, never anything unusual
// but plausible, and the person can always fix it and continue.

/** Misspelled endings that are never real. Maps typo -> correct ending. */
const TLD_TYPOS: Record<string, string> = {
    con: 'com', cmo: 'com', ocm: 'com', vom: 'com', xom: 'com', comm: 'com', coom: 'com', cim: 'com',
};

/** Common big-provider domains, misspelled. */
const DOMAIN_TYPOS: Record<string, string> = {
    'gmial.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com',
    'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com', 'gmai.com': 'gmail.com',
    'gmal.com': 'gmail.com', 'gmail.comm': 'gmail.com',
    'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yahoo.cm': 'yahoo.com',
    'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
    'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com',
    'icloud.co': 'icloud.com', 'iclod.com': 'icloud.com', 'icoud.com': 'icloud.com',
};

/** Returns a corrected address to suggest, or null if the email looks fine. */
export function suggestEmailFix(email: string): string | null {
    const e = String(email || '').trim().toLowerCase();
    const at = e.lastIndexOf('@');
    if (at < 1 || at === e.length - 1) return null;
    const local = e.slice(0, at);
    const domain = e.slice(at + 1);

    if (DOMAIN_TYPOS[domain]) return `${local}@${DOMAIN_TYPOS[domain]}`;

    const dot = domain.lastIndexOf('.');
    if (dot > 0) {
        const tld = domain.slice(dot + 1);
        if (TLD_TYPOS[tld]) return `${local}@${domain.slice(0, dot)}.${TLD_TYPOS[tld]}`;
    }
    return null;
}

/** The message shown on the sign-up form. */
export function emailTypoMessage(email: string): string | null {
    const fix = suggestEmailFix(email);
    return fix ? `Check your email: did you mean ${fix}? Fix it above and try again.` : null;
}
