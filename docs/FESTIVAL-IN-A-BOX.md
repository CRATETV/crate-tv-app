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
6. **Overlap warning.** If any of their screenings fall within 30 minutes of another festival's (PWFF, Crate Fest or another partner), you see ⚠ on their card, in Review lineup and when you approve. It's a warning only, so you decide.
7. Before the first screening, run the rehearsal in `docs/FESTIVAL-RUNBOOK.md` with one of their blocks.

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

## PWFF run by its own committee

PWFF can be run through the portal by someone on the Playhouse West committee, while the page keeps the PWFF look at **cratetv.net/pwff**.

1. **Admin → Partner Festivals → Set up PWFF committee access.** This creates the PWFF portal (paid to *Playhouse West Arts Foundation, Inc.*, CRATE 30%).
2. **Team → Invite by email:** the committee member. Invite your own email too if you want to enter or fix things yourself.
3. They upload the films and build the schedule at cratetv.net/partner, then press **Submit for review**.
4. You **Approve & publish.** From that moment the PWFF page shows the committee's lineup instead of the schedule from the admin Festival editor. Old links (cratetv.net/pwff, /pwff-philly2027) keep working, and cratetv.net/festivals/pwff opens the same page.

What stays with you, in the admin **PWFF** tab and settings as now:
- The page title, festival dates and the **Live** switch.
- The all-access pass price.

The committee's lineup counts as PWFF everywhere:
- The PWFF all-access pass covers it.
- Ticket codes and day passes work for it.
- It's in the Festival revenue report and filmmaker payouts.
- Pass holders get the 30-minute reminders.

The committee's **Sales** tab shows its block tickets and the all-access passes sold since the committee was set up. Record the Playhouse West payout in **one** place, either the Festival revenue report or the partner Sales tab.

Automatic film cleanup applies to PWFF too. Films are deleted about 14 days after the last screening unless the committee ticks **Keep this film on Crate TV after the festival**, as with LUNA.

## Good to know

- **Test one film upload end-to-end** with your first partner before they upload a whole lineup. This confirms storage accepts uploads from the portal on your live site.
- Partner files are stored under `partners/<id>/…` in your video bucket. When you make video storage private later, keep `partners/*/posters/` and `partners/*/branding/` public and the films private, the same rule as your own posters and films.
- Roku shows partner blocks like any festival block: a QR code to watch on the web, until Roku block playback is added.
