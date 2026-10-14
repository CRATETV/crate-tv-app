# Changelog

## 2026-10 — Audience Choice voting and "Who's watching" map

- **Audience Choice.** In any festival block with 2 or more films, ticket holders vote for their favourite film. This works for PWFF, partner festivals and Crate Fest.
  - **Where viewers vote:** on the watch party's end screen, and with a 🏆 button on the festival page.
  - **When:** voting opens when the screening starts and closes when its rewatch week ends.
  - **Rules:** one vote per account per block, changeable until voting closes. Viewers never see the counts.
  - **Admin → PWFF → 🏆 Audience Choice** shows live tallies. **Award** puts "Audience Choice Award" on the winner's laurel.
- **Who's watching map.** Watch parties show "🌍 Watching from N cities". Tap it for a world map of where the audience is, and the end screen shows where it watched from.
  - Each viewer is counted once per party.
  - Location is city-level only, from Vercel's built-in location headers.
  - No names, accounts, device ids or IP addresses are stored, only a one-way fingerprint so nobody is counted twice.
- Free to run: Firestore and Vercel only. The map is a 57 KB image (`public/audience-world-map.svg`) and is cached for 30 seconds.
- 4 new tests.

## 2026-10 — Festival help button

- **"Need help?" button** on PWFF, partner festival pages, My Festival and watch parties. It's a compact "Help" pill at the top on the watch party.
- **Fixes on its own:**
  - Restores a ticket someone paid for but can't use, with the same expiry as the purchase. Also links tickets bought with their email but not attached to their account.
  - Spots tickets that are on a different account and tells the viewer which email to sign in with.
  - Re-sends the viewer's ticket list by email.
  - Shows screening times in the viewer's own time zone, with links.
  - Walks the viewer through playback fixes.
- **Never does on its own:** grants access without a ticket record, re-opens access that has ended, restores refunded tickets, handles film rentals, or gives refunds. A last year's PWFF pass is never restored for this year's festival.
- **Everything else:** "Send to Crate TV" saves a help request and emails you their message, device and ticket status. Reply to that email to answer them.
- Free to run: uses only Firestore and the existing Resend account. No AI service.
- 7 new tests.

## 2026-10 — PWFF on Festival in a box

- **Admin → Partner Festivals → Set up PWFF committee access.** Someone on the PWFF committee can now upload films and build the schedule in the partner portal.
- After approval, their lineup appears on **cratetv.net/pwff** with the PWFF design. `/festivals/pwff` redirects there.
- The committee's lineup is treated as PWFF everywhere:
  - The all-access pass covers it.
  - Day passes and ticket codes work for it.
  - It counts in the festival report, filmmaker payouts and post-festival catalog rows.
  - Pass holders get the reminders.
- Other partner festivals stay separate. Their card payments are now tagged in Square (`partner:<id>`), so the PWFF revenue dashboard leaves them out.
- **Overlap warning:** when a partner's lineup screens within 30 minutes of another festival (PWFF, Crate Fest or another partner), the admin shows a warning on their card, in Review lineup and when you press Approve. It never blocks approval.
- 4 new tests.

## 2026-10 — Festival in a box: automatic film cleanup

- Partner films are deleted automatically one week after the rewatch week ends: catalog entry, video and poster.
- Films the festival allows CRATE to keep (a "Keep this film on Crate TV after the festival" checkbox per film in the partner portal, like LUNA) are kept and released into the main catalog.
- The cleanup date and the kept count show in the partner portal and the admin Partners tab.
- Ticket and sales records are never deleted. Only files in that partner's own folder can be removed.
- New daily scheduled job: `/api/cleanup-partner-festivals`. 3 new tests.

## 2026-10 — Festival in a box

Partner festivals can now run their own lineup on CRATE TV. See `docs/FESTIVAL-IN-A-BOX.md`.

- **Partner portal (`/partner`).** A partner's team:
  - Uploads films (runtime read from the file automatically).
  - Builds the schedule and sets block and pass prices.
  - Brands their page with logo, banner and colour.
  - Submits the lineup for review and follows ticket sales live.
- **Public festival pages (`/festivals/<address>`).** Branded, with block tickets, an optional festival pass, watch parties and the rewatch week. They run on the same engine as PWFF.
- **Admin → 🤝 Partner Festivals.**
  - Add partners and invite their team (14-day single-use links).
  - Review a lineup, then approve and publish it, or send it back with a note.
  - See live sales and download a CSV.
  - Set deductions and record payouts, using the same method as PWFF.
- **Safety:**
  - Partners only ever see their own festival.
  - Nothing goes live without your approval.
  - A republish can't remove a block that has tickets sold.
  - Republishing keeps seat counts.
  - The PWFF all-access pass doesn't cover partner festivals, and partner sales are kept out of the PWFF report and filmmaker payouts.
  - The PWFF editor can never overwrite partner schedules.
- 9 new automated tests (`tests/partnerRules.test.ts`).

## 2026-10 — Festival reliability & security update

From the October 2026 platform audit.

### Watch parties / festivals
- **Fixed:** ended festival blocks were restarted by the every-minute scheduler (it treated "not live" as "not started"). Ended parties are now never restarted for the same scheduled time. Rescheduling to a new time still works. Covered by tests.
- **Fixed:** a block could freeze between films. Three fixes:
  - Viewers' browsers retry every 30 seconds.
  - The server advances blocks itself about 90 seconds after a film's runtime.
  - The admin **Next Film** button now really forces the advance.
- **New:** the Watch Party Manager warns about films with no runtime set.
- **Fixed:** the scheduler's auto-end called the site over the network, which Vercel protection could block. It now runs directly.
- **Fixed:** anyone could start a festival block early through the public auto-start endpoint. Blocks now get the same start-time check as single films.
- **Fixed:** starting a party failed if its chat had more than 500 messages (a Firestore batch limit).
- **Refactor:** all lifecycle rules now live in `api/_lib/watchPartyRules.ts` (pure, tested) and `api/_lib/watchPartyLifecycle.ts` (database).

### Tickets & payments
- **Fixed:** block tickets expired 14 days after purchase. They now last through the screening plus the 7-day rewatch window (minimum 14 days). Applies to card purchases and ticket codes.
- **Fixed:** day-pass ticket codes granted nothing. They now unlock every block that day, and older redeemed day passes are honoured too.
- **Fixed:** a watch-party ticket for a $0 block was charged $10.

### Security
- **Fixed:** every visitor's browser downloaded the full `movies` collection, including raw video file links for paid films and unreleased drafts. The collection is now server-only. The public catalog withholds hosted file links for every title (YouTube/Vimeo embeds excepted), and `data/movies` holds only watch-party fields. Run `ops/sanitize-public-data.cjs` once after deploying.
- **Fixed:** the director backstage key sat on the public party record, readable by anyone. It now lives in a server-only store and is checked by the server (`/api/verify-backstage-key`). Admins fetch it with `/api/get-backstage-key`.
- **Fixed:** backstage hosts were given the raw permanent file link. They now get a signed link like everyone else.
- Admin start/end-party actions use the shared admin check, which honours revoked collaborator keys.
- Chat is rate-limited per account (20/min), not per internet address, so a venue on shared Wi-Fi isn't throttled.
- Live reactions can only carry a short emoji. Signed-in jurors can only write their own votes.
- Signed stream links last 8 hours (was 4), so a long lobby wait plus a feature can't outlast them.
- Dependency patches that don't break anything (64 → 56 known issues). The rest need major upgrades — see the audit.

### Roku
- **Fixed:** Roku never joined live parties. The API sends the start time as text, which the channel couldn't read, so it always saw "0". The API now also sends whole seconds.
- **Fixed:** paid Roku watch parties never checked whether the viewer had a ticket, so ticket holders always saw the paywall QR.
- **Fixed:** Roku's party status was cached for 5 minutes. It's now 10 seconds.
- **New:** festival blocks show a "watch on cratetv.net" QR screen on Roku instead of playing the wrong film.

### Project
- Added `npm test` / `npm run check`, a rewritten README, `docs/FESTIVAL-RUNBOOK.md`, `.gitignore` and `.vercelignore`.
- Moved 70 one-off scripts into `ops/`. They now read the admin key from `GOOGLE_APPLICATION_CREDENTIALS`, so the key can live outside the project.
