# Changelog

## 2026-10 — New CRATE logo everywhere

- **New logo across the website.** Browser tab icon, iPhone/Android home-screen icons, the link preview image when cratetv.net is shared (now a proper 1200×630 banner), Top 10 share image, zine page, pitch deck, About page and the install prompt. No logo, by choice (cleaner): the sign-in / join page, the top menu once signed in, error and maintenance screens, the payment window, and the screens inside the Roku channel. It stays in emails and on the Roku home-screen tile and splash.
  - The old logo was hosted on S3 and had colour filters applied in each place to make it visible. The new files live in `public/` and are used in their real colours (white letters for dark backgrounds, `-light` versions for white ones).
  - Which file to use where: `docs/BRAND.md`.
- **Emails** use the new logo: `email-logo-on-dark.png` and `email-logo-on-light.png`. The old file names (`logo-tagline.png`, `crate-logo-email.png`) now hold the new logo too, so emails already sent update as well.
- **Fixed: the phone home-screen app settings file (`manifest.json`) was never published** (it sat outside `public/`), so "Add to Home Screen" had no icons. Moved to `public/` with the new icons. Bar colour is now the logo's black (`#0B0B0D`) instead of red.
- **Roku:** new channel posters, splash screens and splash background colour. The spinner on the link screen pointed at an image that didn't exist; it now has one. Channel version 2.3 build 3.
- **Roku Channel Store artwork** for the developer dashboard: `roku-store/` (see `docs/ROKU-GUIDE.md`, section 5).
- Removed old logo copies that nothing used (duplicates in the project's top folder, which the site never served, and unused Roku images).

## 2026-10 — Phone ↔ TV features

- **Send to TV.** A new button on every film page on cratetv.net (signed-in viewers) opens that film on the Roku linked to their account within about 10 seconds, while Crate TV is open on the Roku. If they can watch it, it starts playing; if not, its page shows how to unlock it. "Sent from your phone" appears at the top of the TV.
  - `api/send-to-tv.ts`: you can only send to your own linked Roku, notes expire after 2 minutes, and nothing is unlocked by it.
  - The Roku checks only while it is open and linked (`StartSendToTvChecks` in `MainScene.brs`).
- **Live reactions on the TV.** The 😂 😲 ❤️ 👏 😢 buttons on the website's watch party page now float up the Roku screen too, released a few at a time like a crowd. They show even when the chat is hidden. The images are drawn from Noto Color Emoji (open licence).
- **Vote from the couch.** For festival blocks with Audience Choice, the Roku watch party screen shows a QR code to vote on a phone, with live results bars that refresh every 15 seconds, and the final results once voting closes. Public counts only (`api/audience?tally=`), never who voted.
- **End card after a film.** When a film finishes on Roku, a card shows QR codes to support the filmmaker (free films with support on; it opens the website's support form directly via `?action=support`), read the zine (if there is one), and share the film. It closes on OK/Back or after 30 seconds.
- **Fixed: the screensaver never appeared.** A Roku only starts its screensaver when no video is playing, and Home kept starting one trailer preview after another. Previews now stop after 2 minutes without a button press (`STOP_PREVIEWS_AFTER_IDLE_SECONDS` in `HomeScene.brs`), so the TV can go quiet.
- **Watch streak on the TV.** The Roku Account page shows the linked viewer's streak (🔥 "4 months in a row · best 6") and their latest badges.

## 2026-10 — Alert robot: check, fix, report

- **The health check now fixes what's safe and emails a plain-English report.** It runs every 15 minutes, free, on what Crate already has (Vercel cron, Firestore, Resend).
  - **Fixed automatically:**
    - watch parties stuck on "live" (6h+ with nothing happening for 4h+), ended exactly like admin "End Party";
    - ticket sales that charged the customer but didn't save to the ticket list, restored once and never duplicated.
  - **Reported with what it means and what to do:**
    - error spikes, grouped (normal viewer Wi-Fi noise is ignored);
    - "permission denied" errors;
    - the site or the Roku catalogue not loading (checked hourly);
    - long parties that are still active.
  - The same open problem is emailed at most every 6 hours. Silent when all is well.
- **Admin → Error Log → "Run health check now"** runs it on demand and always emails the report (an "all clear" if nothing's wrong).
- Payment errors now save the full sale details so a lost sale can be rebuilt.
- Rules in `api/_lib/healthRules.ts`, 7 new tests.

## 2026-10 — Roku channel redesign (version 2.2)

- **Netflix-style look.** Black background, the Inter font everywhere, and a large billboard at the top of Home that follows whichever poster is highlighted (art, title, details, award, synopsis, cast). Poster rows have rounded corners, a white focus outline, a small lift on focus, price pills on locked films and red progress bars. The Top 10 row has large rank numbers.
- **New film page.** OK on a poster now opens the film's page, with Play / Resume / Start over / Trailer. Locked films show a QR code and the web address to unlock on cratetv.net, instead of silently playing the trailer. Deep links from Roku search still start playing straight away (a Roku rule).
- **Player.** Crate's own controls: progress bar, time left, pause screen, and Left/Right to skip 10 seconds. These hide while the film plays. Watch parties show a "LIVE" badge and block skipping.
- **Fixed:**
  - the menu logo image was missing;
  - the clock never updated;
  - films were drawn 60 px too low;
  - Back after a film ended could skip a screen;
  - the Top 10 row removed films from their other rows;
  - the chat helper was missing its settings file;
  - screens imported `Utils.brs` while the file is `utils.brs` (now they match);
  - some XML comments weren't strictly valid.
- **Trailer previews.** Rest on a film for 3 seconds on Home (2.5 on a film page) and its trailer fades in behind the text, with sound. It stops as soon as you move. Switch to silent in `TrailerPreview.xml` (`mute`).
  - **No trailer?** For films the viewer can already watch (free or owned), it plays a 1-minute clip from a third of the way into the film. Nothing to set up; the rule is in `source/Preview.brs`. Locked films without a trailer show artwork only, because the full film is never sent to a Roku that hasn't paid.
- Previews are skipped on older low-power Rokus, when memory is low, or when the viewer has turned off autoplay in their Roku settings.
- **Works on 720p TVs.** The channel told Roku it had separate 720p layouts (`ui_resolutions=fhd,hd`) but didn't, so on 720p TVs screens came out the wrong size. It's now `fhd`, and Roku scales it down cleanly.
- **Linking a Roku is easier and safer.**
  - The TV shows a QR code: scan it and the link page opens with the code filled in.
  - cratetv.net/link now works; the TV had been sending people there, but the page was only at /link-roku.
  - The website checks the viewer's sign-in before linking. Before, the browser could name any account.
  - The Account tab says "Link your account" when the Roku isn't linked (it used to say "Sign Out").
  - If cratetv.net can't be reached, the TV says so. Before, it made up a code that could never work.
  - The code refreshes by itself instead of expiring with an error.
- **Every screen now has the new look.** Search, Account, Now Streaming, the watch party screen and the actor page were restyled to match Home: black, the Inter font, white rounded buttons and the same poster tiles.
  - Search: a cleaner keyboard; results use a white focus outline.
  - Account: a profile card, a details card, and a QR code for managing the account on a phone.
  - Now Streaming: a billboard like Home. The zine card is hidden when there's no zine.
- **Series show their episodes** (e.g. "Made in New Jersey"). The film page lists episodes with number, title, length and a line of description. Play starts episode 1, or "Continue episode N". After an episode ends, the next one is highlighted.
  - The website's Roku catalogue (`api/roku-feed`) now sends each series' episodes. Episode videos are only included when the viewer has access, and are signed like full films.
- **YouTube/Vimeo-hosted titles are left out on Roku.** A Roku can't play YouTube or Vimeo links. Those titles (e.g. the Caribbean Fix episodes) used to slip into the catalogue and fail to play, or empty the row. They still play on the website.
- **Search:** no more pop-out bio card covering the results; highlighting an actor shows a one-line caption instead.
- **Top menu:** the CRATE logo and the clock are removed (switches: `SHOW_LOGO` and `SHOW_CLOCK` in `Header.brs`).
- **Fixed (paid films):** on the Roku, a festival pass or Crate Fest pass unlocked *every* paid film on Crate, so a 48-hour rental kept playing for anyone holding a pass. The Roku now follows the website's rules: festival passes open their own festival's films, a jury pass opens everything, and rentals end after 48 hours. The same fix is in `api/roku-movie-details`, which now uses the website's shared access check and no longer caches per-viewer answers.
- **Live chat (watch parties) restyled** to match the channel: a dark card with the last 5 messages and the director's name in gold. **Down (or *) hides or shows it**, and the choice is remembered on that Roku. While hidden, the Roku stops fetching messages.
- **Fonts:** added ▼ ▲ ◀ ✕, which were missing from the trimmed fonts. The player hint "◀ ▶ Skip" was showing a blank box.
- **Launch screen:** just a thin moving bar, no logo or "Loading content" text. Roku's own splash already shows the logo.
- **Screensaver:** no logo, clock or "On Crate TV" text; only the artwork and the film's title.
- **Screensaver.** When the TV is idle while Crate TV is open, a slow slideshow of film artwork plays, cross-fading with a gentle zoom. It's in `CrateScreensaver.xml/.brs` and `source/ScreenSaver.brs`.
- **Fixed:** the actor page (from Search) was built in a way Roku doesn't allow, which could freeze or crash the channel, and it played films directly. It now loads in the background, uses Home's tiles and opens the film page.
- **Security:** the website's actor profile (`api/get-public-actor-profile`) returned every film's private full-video address, including paid films. It now hides them, like the main catalogue does.
- **Fixed:** the Account tab showed the Roku's software version as the channel version.
- **Fixed:** the "10" on the Top 10 row was cut off. It's drawn slightly smaller and tucked further behind the poster, and the Top 10 tiles are a little wider.
- **Unlocks without restarting.** On a locked film's page, a linked Roku re-checks every 15 seconds for up to 10 minutes. Once the purchase on cratetv.net goes through, the page switches to Play by itself.
- **Fixed:** Public Square crashed the channel. Its tiles borrowed the old Home tile's code; it now uses the same tiles as Home and opens the film page.
- 19 unused screens moved out of the package to `roku-archive/`.
- Detailed notes at the top of every Roku file, plus `docs/ROKU-GUIDE.md`.

## 2026-10 — Laurel finishes from the signature wreath

- **Every laurel finish now uses the signature painted wreath** (`public/laurel-wreath.png`), not the older drawn one: Signature, White, Black, Gold, Silver and Rose Gold. The solid finishes are the same wreath filled with one colour.
- **Fixed:** downloading the Signature laurel produced text with no leaves. Browsers block outside images when an SVG is turned into a PNG, so the artwork is now embedded before export.
- **Export Full Kit** now holds 7 transparent 3000 px PNGs:
  - Signature, plus Signature for light backgrounds (dark lettering);
  - White, Black, Gold, Silver and Rose Gold.
  - It also includes a guide to which finish suits which poster. Before, it held only gold, white and black, drawn as the old laurel.
- Laurels tab:
  - "Audience Choice Award" is now a quick award button.
  - A "Dark poster / Light poster" preview toggle; picking Black switches to light automatically.
  - The chosen finish is named under the preview.
- On-site laurels (film cards, hero) are unchanged.

## 2026-10 — Watch streaks

- **Watch streaks and badges.** These are just for fun and never unlock anything paid.
  - **Monthly streak:** "🔥 4 months in a row". It's counted in Philadelphia time, and it stays alive until a whole month is skipped. Badges at 3, 6, 12 and 24 months.
  - **Festival streak:** watch every block of a festival, live or on demand, to earn "🎟️ PWFF 2027: watched every block". This works for PWFF, partner festivals and Crate Fest.
  - "First film on Crate TV" badge.
  - Viewers get a nudge like "1 block left to complete your PWFF streak". A pop-up appears when a badge is earned.
  - Shown on the Account page and My Festival.
  - **What counts:** 5 minutes of real watching, either a live watch party or a film playing with the tab visible. The server re-checks that the viewer really has access, and that a watch party is live, before counting it. Stored server-side only (`user_streaks`).
- 5 new tests.

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
