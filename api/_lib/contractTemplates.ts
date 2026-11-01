// CRATE TV agreement templates, signed inside CRATE (/sign).
//
// IMPORTANT: these are plain-English starting points written for CRATE's
// actual setup. Have a lawyer review them before relying on them — for
// example Philadelphia Volunteer Lawyers for the Arts (pvla.org).
//
// Editing a template: change the text AND bump its `version`. Every signature
// stores the exact text that was signed plus its version, so older signatures
// are never affected by later edits.
//
// Placeholders: {{signerName}} {{signerEmail}} {{date}} {{filmTitle}}
//               {{filmmakerPercent}} {{cratePercent}}

export type ContractAudience = 'filmmaker' | 'actor' | 'anyone';

export interface ContractTemplate {
    id: string;
    title: string;
    version: string;
    audience: ContractAudience;
    /** One line for the admin list. */
    summary: string;
    /** When true, the admin picks a film when sending it. */
    needsFilm: boolean;
    body: string;
}

const PARTIES = `This agreement is between **CRATE TV** ("CRATE", "we", "us"), the independent streaming service at cratetv.net, and **{{signerName}}** ("you").`;

const GENERAL = `## General
- **Changes.** Any change to this agreement must be in writing and accepted by both of us. Signing a newer version inside CRATE counts.
- **Electronic signature.** You agree that typing your name and confirming below is your legal signature, with the same effect as signing on paper.
- **Whole agreement.** This is the full agreement on its subject and replaces earlier conversations about it.
- **Law.** This agreement is governed by the laws of the Commonwealth of Pennsylvania, USA.
- **If part is invalid.** If a court finds part of this agreement unenforceable, the rest still applies.`;

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
    {
        id: 'filmmaker-distribution',
        title: 'Filmmaker Distribution Agreement',
        version: '1.0',
        audience: 'filmmaker',
        summary: 'Lets CRATE stream a film; sets the revenue split and how payouts work.',
        needsFilm: true,
        body: `${PARTIES}
It covers the film **{{filmTitle}}** (the "Film").

## 1. What you're giving CRATE
You give CRATE a **non-exclusive** licence to stream the Film on cratetv.net, the CRATE TV Roku channel and any other CRATE apps, worldwide, for the term below. Non-exclusive means you keep every other right: you can show, sell or license the Film anywhere else at the same time.

CRATE may also use the Film's title, poster, stills, trailer and up to 2 minutes of clips, and your name and approved bio, to promote the Film and CRATE.

## 2. What CRATE does
- Hosts and streams the Film, and lists it in the CRATE catalog.
- Sells rentals, watch party tickets and accepts tips for the Film, at prices CRATE sets in good faith.
- Gives you a filmmaker dashboard showing views and earnings.

## 3. Money
- **Your share:** **{{filmmakerPercent}}%** of the money CRATE receives for the Film (rentals, watch party tickets and tips). **CRATE keeps {{cratePercent}}%** to pay for hosting, streaming and distribution.
- If more than one person is credited as director or producer, your share is divided between them equally unless you tell us in writing how to divide it.
- Refunded or failed payments don't count.
- Festival passes and festival block tickets follow the festival's own terms, not this split. A festival film's individual rentals count toward your share once the festival has ended.
- **Payouts:** once your balance is at least $5.00 you can request a payout from your dashboard, and CRATE will send it within 30 days using the payout method you choose (PayPal, Cash App, Venmo, Zelle or check). CRATE may also pay you without a request.
- **Taxes:** you're responsible for your own taxes. CRATE may ask for a W-9 before paying you, and may issue a 1099 where US law requires it.

## 4. Your promises
You promise that you own the Film or have every right needed to let CRATE stream it, including rights to all music, footage, artwork and performances in it, and that it doesn't break anyone's copyright, privacy or other rights. The separate Rights & Clearances Warranty gives more detail.

## 5. Term and taking the Film down
- This agreement starts today and lasts **two years**, then renews automatically for one year at a time.
- **You can end it any time** by emailing CRATE. We'll remove the Film within 14 days. Money already earned is still paid to you.
- CRATE can remove the Film or end this agreement at any time, for example if there's a rights complaint.

## 6. Limits
CRATE provides the service as it is and doesn't guarantee any number of views or any amount of money. Neither of us is responsible to the other for indirect losses. CRATE's total responsibility to you under this agreement is limited to the money owed to you under section 3.

${GENERAL}`,
    },
    {
        id: 'rights-warranty',
        title: 'Rights & Clearances Warranty',
        version: '1.0',
        audience: 'filmmaker',
        summary: 'The filmmaker confirms they own or cleared the music, footage and performances.',
        needsFilm: true,
        body: `${PARTIES}
It covers the film **{{filmTitle}}** (the "Film").

## What you confirm
By signing, you confirm that:
1. You made the Film or own it, or you have written permission from whoever does to let CRATE stream it.
2. **Music.** Every song, score and sound recording in the Film is original, licensed for streaming, or in the public domain. You have the licences in writing if CRATE asks for them.
3. **Footage, images and artwork.** Any footage, photos, logos or artwork you didn't create is licensed, permitted or in the public domain.
4. **People.** Everyone who appears in the Film agreed to appear, and anyone under 18 appears with a parent or guardian's permission. You have their releases.
5. **Locations.** You had permission to film where you filmed, where permission was needed.
6. The Film doesn't defame anyone, invade anyone's privacy, or contain anything illegal.
7. Nobody else has an exclusive deal for the Film that would stop CRATE from streaming it.

## If there's a problem
- Tell CRATE right away if you learn of any rights problem or claim.
- CRATE may take the Film down while a claim is checked. That isn't a breach of any agreement with you.
- If someone makes a claim against CRATE because one of these statements wasn't true, you agree to cover CRATE's reasonable costs from that claim, including reasonable legal fees.

## Paperwork
You agree to keep copies of your music licences, releases and permissions for as long as the Film is on CRATE, and to share them if CRATE asks.

${GENERAL}`,
    },
    {
        id: 'filmmaker-master',
        title: 'Master Filmmaker Agreement (all-in-one)',
        version: '1.0',
        audience: 'filmmaker',
        summary: 'One agreement covering the licence, money, music and other rights, takedowns and payee/tax info. Send this instead of the separate ones.',
        needsFilm: true,
        body: `${PARTIES}
It covers the film **{{filmTitle}}** (the "Film"). It combines in one place everything in CRATE's separate Distribution Agreement, Rights & Clearances Warranty and Payee Information & Tax Acknowledgement, so you only need to sign this one.

## 1. What you're giving CRATE
You give CRATE a **non-exclusive** licence to stream the Film on cratetv.net, the CRATE TV Roku channel and any other CRATE apps, **worldwide**, for the term below. Non-exclusive means you keep every other right: you can show, sell or license the Film anywhere else at the same time.

CRATE may also use the Film's title, poster, stills, trailer and up to 2 minutes of clips, and your name and approved bio, to promote the Film and CRATE. CRATE may add captions or subtitles it makes, and may use technical formats and copies needed to host and stream the Film.

CRATE may choose not to show the Film in certain countries or regions (for example where the law requires it, or where a music or other licence does not reach). That does not breach this agreement.

## 2. What CRATE does
- Hosts and streams the Film, and lists it in the CRATE catalog.
- Sells rentals, watch party tickets and accepts tips for the Film, at prices CRATE sets in good faith.
- Gives you a filmmaker dashboard showing views and earnings.

## 3. Money
- **Your share:** **{{filmmakerPercent}}%** of the money CRATE receives for the Film (rentals, watch party tickets and tips). **CRATE keeps {{cratePercent}}%** to pay for hosting, streaming and distribution.
- If more than one person is credited as director or producer, your share is divided between them equally unless you tell us in writing how to divide it.
- Refunded or failed payments don't count.
- Festival passes and festival block tickets follow the festival's own terms, not this split. A festival film's individual rentals count toward your share once the festival has ended.
- **Payouts:** once your balance is at least $5.00 you can request a payout from your dashboard, and CRATE will send it within 30 days using the payout method you choose (PayPal, Cash App, Venmo, Zelle or check). CRATE may also pay you without a request.

## 4. Music, footage and everything in the Film (rights & clearances)
By signing, you confirm that:
1. You made the Film or own it, or you have written permission from whoever does to let CRATE stream it.
2. **Music.** Every song, score and sound recording in the Film is original, in the public domain, or licensed in writing **for online streaming, worldwide, for as long as the Film is on CRATE** (including the composition and the recording). You will give CRATE copies of those licences if asked.
3. **Footage, images and artwork.** Any footage, photos, logos or artwork you didn't create is licensed, permitted or in the public domain for the same use.
4. **People.** Everyone who appears in the Film agreed to appear, anyone under 18 appears with a parent or guardian's permission, and you have their releases.
5. **Locations.** You had permission to film where you filmed, where permission was needed.
6. The Film doesn't defame anyone, invade anyone's privacy, or contain anything illegal.
7. Nobody else has an exclusive deal for the Film that would stop CRATE from streaming it.
8. You will keep copies of your licences, releases and permissions for as long as the Film is on CRATE.

## 5. If there's a problem
- Tell CRATE right away if you learn of any rights problem or claim.
- CRATE may take the Film down while a claim is checked. That isn't a breach of any agreement with you.
- If someone makes a claim against CRATE because one of the statements in section 4 wasn't true, you agree to cover CRATE's reasonable costs from that claim, including reasonable legal fees.

## 6. Who gets paid, and taxes
- You confirm that **{{signerName}}** is the correct legal name (or business name) to receive CRATE earnings for the Film, and that the payout method you choose in your dashboard belongs to you. Tell CRATE if these details change; CRATE isn't responsible for a payment sent to the details you gave us.
- Payments from CRATE are not wages and nothing is withheld from them. You're responsible for reporting them and paying any taxes on them.
- Before paying you, CRATE may ask for a completed IRS Form W-9 (US) or W-8BEN (outside the US). Send it to CRATE by email or as an upload; please don't type your Social Security number anywhere on cratetv.net.
- Where US law requires it, CRATE will issue you a Form 1099.

## 7. Term and taking the Film down
- This agreement starts today and lasts **two years**, then renews automatically for one year at a time.
- **You can end it any time** by emailing CRATE. We'll remove the Film within 14 days. Money already earned is still paid to you.
- CRATE can remove the Film or end this agreement at any time, for example if there's a rights complaint.

## 8. Limits
CRATE provides the service as it is and doesn't guarantee any number of views or any amount of money. Neither of us is responsible to the other for indirect losses. CRATE's total responsibility to you under this agreement is limited to the money owed to you under section 3.

${GENERAL}`,
    },
    {
        id: 'festival-submission',
        title: 'Festival Submission Terms',
        version: '1.0',
        audience: 'filmmaker',
        summary: 'Terms for entering a film into a CRATE-hosted festival.',
        needsFilm: true,
        body: `${PARTIES}
It covers your submission of **{{filmTitle}}** (the "Film") to a festival hosted on CRATE.

## 1. Submitting
- Submitting doesn't guarantee selection. Selection decisions are final.
- Submission fees, if any, are not refundable unless the festival is cancelled.
- The information you give about the Film must be accurate.

## 2. If the Film is selected
- You allow CRATE and the festival to stream the Film during the festival's dates, as part of the festival's ticketed programme and watch parties.
- After the festival, the Film can stay in CRATE's festival catalog for up to 7 days so ticket holders can rewatch it.
- CRATE and the festival may use the Film's title, poster, stills, trailer and up to 2 minutes of clips to promote the festival, during and after it.
- If the Film wins an award, CRATE and the festival may announce it, and you may use the official laurel.

## 3. Money
- Festival passes and block tickets go to the festival under its own agreement with CRATE. They are not split with individual filmmakers.
- Tips sent to the Film during the festival are shared with you as your filmmaker share.
- Individual rentals of the Film bought while the festival is running stay with CRATE and the festival. Rentals after the festival ends count toward your filmmaker share if the Film stays on CRATE under a Filmmaker Distribution Agreement.

## 4. Rights
You confirm that you have the rights needed to show the Film, as described in CRATE's Rights & Clearances Warranty.

## 5. Staying on CRATE afterwards
After the festival the Film is removed from CRATE unless you sign a Filmmaker Distribution Agreement.

${GENERAL}`,
    },
    {
        id: 'actor-portal',
        title: 'Actor Portal Agreement',
        version: '1.0',
        audience: 'actor',
        summary: 'Lets CRATE publish an actor profile (photos and bio); sets the profile rules.',
        needsFilm: false,
        body: `${PARTIES}
It covers your profile in the CRATE TV Actor Portal and actors directory.

## 1. Your profile
- You can create a public profile with your name, photos, bio, links and credits.
- Your profile is reviewed by CRATE before it goes live. CRATE may decline or remove a profile at any time.
- You give CRATE permission to show your profile, photos and bio on cratetv.net, the CRATE Roku channel and CRATE's social media, including next to films you appear in. This permission is free of charge and lasts while your profile is active.

## 2. Your content
- You keep ownership of your photos and bio. You confirm you have the right to use them, including permission from the photographer where needed.
- Keep your profile accurate. Don't claim credits you don't have.
- Don't post anything illegal, hateful, sexually explicit, or that infringes someone else's rights.

## 3. Contact
- If you turn on "contactable", casting directors and filmmakers can reach you through CRATE. You can turn it off at any time.
- CRATE doesn't act as your agent and isn't responsible for any job, audition or agreement you make with someone you meet through CRATE.

## 4. Leaving
You can delete your profile at any time from your portal or by emailing CRATE. We'll remove it within 14 days. Copies already shared publicly, such as social media posts, may remain.

## 5. Age
You confirm you are 18 or older, or that a parent or guardian is creating this profile with you and agrees to this agreement.

${GENERAL}`,
    },
    {
        id: 'appearance-release',
        title: 'Appearance & Likeness Release',
        version: '1.0',
        audience: 'anyone',
        summary: 'Permission to use someone in red carpet clips, watch party intros and promos.',
        needsFilm: false,
        body: `${PARTIES}

## What you're allowing
You allow CRATE to record and use your name, voice, image and likeness, and any interview, introduction, Q&A or other appearance you give, in:
- red carpet videos, watch party introductions and festival programmes on CRATE,
- trailers, social media and other promotion for CRATE, its festivals and the films on CRATE.

## Terms
- This permission is free of charge and doesn't expire, unless we've agreed otherwise in writing.
- CRATE owns the recordings it makes and may edit them, but will not edit them to change the meaning of what you said or to show you in a false or degrading way.
- You can ask CRATE to stop using a recording in new promotion at any time. Content already published may stay up.
- You confirm you are 18 or older, or that a parent or guardian is signing with you.

${GENERAL}`,
    },
    {
        id: 'payee-information',
        title: 'Payee Information & Tax Acknowledgement',
        version: '1.0',
        audience: 'anyone',
        summary: 'Confirms who gets paid, how, and their tax responsibility. Pair with a W-9.',
        needsFilm: false,
        body: `${PARTIES}

## Who gets paid
You confirm that **{{signerName}}** is the correct legal name (or business name) to receive CRATE TV earnings for the films or work you have with CRATE, and that the payout method you choose in your filmmaker dashboard belongs to you.

## Taxes
- Payments from CRATE are not wages, and nothing is withheld from them. You're responsible for reporting them and paying any taxes on them.
- Before paying you, CRATE may ask for a completed IRS Form W-9 (US) or W-8BEN (outside the US). Send it to CRATE by email or as an upload; please don't type your Social Security number anywhere on cratetv.net.
- Where US law requires it (for example when payments in a year pass the IRS reporting threshold), CRATE will issue you a Form 1099.

## Accuracy
You agree to tell CRATE if your name, payout method or tax details change. CRATE isn't responsible for a payment sent to the payout details you gave us.

${GENERAL}`,
    },
];

export const getTemplate = (id: string) => CONTRACT_TEMPLATES.find(t => t.id === id);

export interface ContractFields {
    signerName?: string;
    signerEmail?: string;
    filmTitle?: string;
    filmmakerPercent?: number;
    date?: string;
}

export function renderContract(t: ContractTemplate, f: ContractFields): string {
    const pct = typeof f.filmmakerPercent === 'number' && Number.isFinite(f.filmmakerPercent) ? f.filmmakerPercent : 70;
    const round = (n: number) => String(Math.round(n * 100) / 100);
    const values: Record<string, string> = {
        signerName: (f.signerName || '').trim() || '[your name]',
        signerEmail: f.signerEmail || '',
        filmTitle: (f.filmTitle || '').trim() || '[film title]',
        filmmakerPercent: round(pct),
        cratePercent: round(100 - pct),
        date: f.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' }),
    };
    return t.body.replace(/\{\{(\w+)\}\}/g, (_, k) => values[k] ?? '');
}
