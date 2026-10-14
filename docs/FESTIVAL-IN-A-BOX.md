# Festival in a box

Partner festivals run their own lineup on CRATE TV. Their team uploads films, builds the schedule and sets prices. You approve the lineup before anything goes live, then settle sales when the festival ends.

Under the hood, a partner festival uses exactly the same machinery as PWFF: tickets, watch parties, 30-minute reminders, auto-advance, auto-end and the 7-day rewatch.

## Where things live

| Who | Where | What they do |
| --- | --- | --- |
| You | Admin → **🤝 Partner Festivals** | Add partners, invite their team, review and approve lineups, see sales, record the payout |
| Partner team | **cratetv.net/partner** | Festival details and branding, film uploads, schedule, submit for review, live sales |
| Audience | **cratetv.net/festivals/&lt;their-address&gt;** | Branded festival page: buy a block ticket or the festival pass, join watch parties, rewatch |

## Onboarding a partner (about 10 minutes)

1. **Admin → Partner Festivals → Add partner.** Fill in:
   - Name.
   - Who their share is paid to (e.g. *Playhouse West Arts Foundation, Inc.*).
   - Contact email.
   - CRATE % (default 30).
2. **Team → Invite by email.** They get an email with a link that is single-use and valid for 14 days. The link is also shown, so you can text it to them.
3. They **sign in, or create a free CRATE account, with that same email** and open the link. That connects them to the portal.
4. They build the lineup and press **Submit for review**. You get an email.
5. **Review lineup.** Check the films, preview the videos, check the schedule. Then either:
   - **Approve & publish:** the page and tickets go live immediately.
   - **Request changes:** your note is emailed to them, and the lineup goes back to them to fix.
6. Before the first screening, run the rehearsal in `docs/FESTIVAL-RUNBOOK.md` with one of their blocks.

## What partners can and can't do

- They can only see and change **their own** festival. They can't see CRATE's catalog, other partners, or buyers' emails.
- Nothing they change is public until you approve it. Editing after approval keeps the live version until they resubmit and you approve again.
- When they upload a film, its runtime is read from the file automatically. A film can't be submitted without a runtime, because the watch party uses it to know when to start the next film.
- Uploads:
  - Films: MP4 or MOV, under 5 GB each (1080p H.264 recommended).
  - Posters and banners: JPG, PNG or WebP.
- A republish can **never remove a block that already has tickets sold**. It's refused with a message, so no buyer loses a screening.

## Money

- Every ticket, festival pass and film rental is tagged with the partner, so the sales tab shows it live, refreshed every minute.
- Payout uses the same method as PWFF:
  1. Start from gross ticket sales.
  2. Subtract **deductions** (e.g. test purchases or refunds; you enter these, with a note the partner sees).
  3. CRATE takes its % of what's left.
  4. The partner gets the remainder.
- When you've paid them, click **Mark paid**. The partner sees the date and amount in their portal.
- **Download sales CSV** gives you every order (with buyer emails) for your own records.
- Partner sales are **not** counted in the PWFF festival report or in filmmaker payouts.

## After the festival: films are deleted automatically

- **One week after the rewatch week ends** (about 14 days after the last screening), every partner film is deleted from CRATE TV: the catalog entry, the video file and the poster.
- **The exception: films the festival lets you keep, as with LUNA.** The partner ticks **"Keep this film on Crate TV after the festival"** on that film in their portal. Only tick it once the filmmaker has agreed. They can tick it at any time before the cleanup date, without re-approval. Kept films move into the main CRATE catalog.
- **Where to see it.** The partner sees the cleanup date and how many films are kept on their Overview tab. You see it on the partner's card in the admin, and afterwards a summary of what was deleted and kept.
- **What is never touched:** ticket and sales records (the payout report keeps working), CRATE's own films, and other partners' files. Cleanup can only delete files inside that partner's own `partners/<id>/` folder.
- **It runs once a day** (the `cleanup-partner-festivals` scheduled job) and never runs twice for the same festival.

## Festival passes

- If the partner sets a pass price, their page sells an all-access pass. It unlocks every block in **their** festival only, including blocks they add later.
- **The PWFF all-access pass doesn't cover partner festivals.** Each festival keeps its own revenue.

## Moving PWFF onto Festival in a box

PWFF keeps working exactly as it does now. When you're ready, e.g. for PWFF 2027:

1. Add Playhouse West as a partner at your agreed % (30% today), paying *Playhouse West Arts Foundation, Inc.*
2. Invite the committee member who will enter the lineup.
3. Their festival page will be cratetv.net/festivals/&lt;address&gt;. You can change the address in the partner's **settings** before launch.
4. Point the homepage festival banner and your social links at that page.

## Good to know

- **Test one film upload end-to-end** with your first partner before they upload a whole lineup. This confirms storage accepts uploads from the portal on your live site.
- Partner files are stored under `partners/<id>/…` in your video bucket. When you make video storage private later, keep `partners/*/posters/` and `partners/*/branding/` public and the films private, the same rule as your own posters and films.
- Roku shows partner blocks like any festival block: a QR code to watch on the web, until Roku block playback is added.
