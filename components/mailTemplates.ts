// Ready-made replies for Studio Mail. Pick one in the composer and it fills the
// subject and message; {name}, {film} and {link} are filled in for you.
// Prices come from api/_lib/paymentRules.ts (the same numbers the payment page uses).
import { PREMIERE_PRICES_CENTS } from '../api/_lib/paymentRules';

export interface MailTemplate { id: string; label: string; subject: string; body: string }

const usd = (cents: number) => `$${(cents / 100).toFixed(0)}`;
const booking = usd(PREMIERE_PRICES_CENTS.premiereBooking);
const balance = usd(PREMIERE_PRICES_CENTS.premiereBalance);
const hostingTotal = usd(PREMIERE_PRICES_CENTS.premiereBooking + PREMIERE_PRICES_CENTS.premiereBalance);

export const MAIL_TEMPLATES: MailTemplate[] = [
    {
        id: 'premiere-how-it-works',
        label: 'Premiere: how it works + booking link',
        subject: 'Premiering {film} on Crate TV',
        body: `Hi {name},

Thank you for your interest in premiering {film} on Crate TV. Here is how it works.

1. Hold your date. Every premiere starts with a ${booking} booking fee. You pay it securely by card here and get a receipt by email:
{link}

2. Choose how your audience watches.
   • Ticketed premiere: your audience buys tickets. There is nothing more to pay up front. Crate TV keeps 30% of ticket sales after the premiere, and your ${booking} booking fee is taken off that amount.
   • Free premiere: your audience watches for free. The hosting fee is ${hostingTotal} in total, which is the ${booking} booking fee plus a ${balance} balance, paid once your date is set (same link).

3. We set everything up. After your booking we will be in touch to set up your premiere page, countdown and tickets, and we will agree on your date.

If you have any questions, just reply to this email.`,
    },
    {
        id: 'premiere-date-held',
        label: 'Premiere: payment received, date held',
        subject: 'Your premiere date for {film} is held',
        body: `Hi {name},

Thank you. We have received your booking fee and your premiere date for {film} is held.

Next, we will set up your premiere page, countdown and tickets. To get that moving, please send us:
   • the final film file (or the link to it),
   • a poster or still image,
   • a short description of the film.

If you chose a free premiere, the ${balance} balance can be paid at any time before the premiere here:
{link}

We will be in touch soon with the details.`,
    },
    {
        id: 'festival-how-it-works',
        label: 'Festival hosting: how it works',
        subject: 'Hosting {film} on Crate TV',
        body: `Hi {name},

Thank you for your interest in hosting your festival on Crate TV. Here is how it works.

1. We talk it through. Reply with your dates and the number of films, and we will confirm what works.
2. We set it up. Crate TV builds your festival's page, schedule and watch parties, and handles ticketing and payments electronically so your audience can join from anywhere.
3. Terms are set for your festival. We agree the share of ticket sales before anything goes live. Square's card processing fees come off ticket sales first, before we split the rest, so both of us share them. When the festival ends we send you a full sales and payout report that shows every line, including the card fees.

If you would like, we can arrange a short call, or you can answer any questions here by email.`,
    },
];

MAIL_TEMPLATES.push({
    id: 'invite-code',
    label: 'Invite request: here is your code',
    subject: 'Your invite to {film}',
    body: `Hi {name},

Thank you for asking to join us. Your invite code is:

   PASTE-CODE-HERE

To use it, open the screening page on Crate TV, press "Enter Invite Code" and type it in. The code is just for you, so please don't share it.

If anything doesn't work, reply to this email and we'll sort it out.`,
});

export function fillTemplate(t: MailTemplate, values: { name?: string; film?: string; link?: string }) {
    const first = (values.name || '').trim().split(/\s+/)[0] || 'there';
    const film = (values.film || '').trim() || 'your film';
    const link = values.link || 'https://cratetv.net/book-premiere';
    const sub = (s: string) => s.replace(/\{name\}/g, first).replace(/\{film\}/g, film).replace(/\{link\}/g, link);
    return { subject: sub(t.subject), body: sub(t.body) };
}

export const bookingLink = (film?: string) => `https://cratetv.net/book-premiere${film && film.trim() ? `?film=${encodeURIComponent(film.trim())}` : ''}`;
