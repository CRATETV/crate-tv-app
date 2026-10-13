# Changelog

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
