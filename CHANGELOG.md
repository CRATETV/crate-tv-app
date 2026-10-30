# Changelog

## 2026-10 — Cast & crew codes, tighter festival pass, director's note on any film

- **Storage clean-up can now delete unused posters and photos.** New "Posters & photos" button at the top of Admin → Storage clean-up. It lists pictures nothing on CRATE points at, with a preview, and you mark each Keep or Delete (type DELETE to confirm). It checks the site data (including hidden films) and the actor, submission, story and festival records; it never lists pictures uploaded in the last 14 days or files in folders other tools manage (submissions, partners, originals, backups); and if any record can't be read it lists nothing. The server re-checks before it deletes. `api/_lib/imageCleanup.ts`, `api/admin-storage-cleanup.ts` (`scanImages` / `deleteImages`), `components/admin/ImageCleanupSection.tsx`; tests in `tests/imageCleanup.test.ts`.
- **Watch party waiting room: a way home, and the Share button is reachable.** On phones the waiting room had no exit and the round "Help" button sat on top of Share. There is now a "← Home" button, the header fits on one row, and Help sits below the header. `components/WatchPartyLobby.tsx`, `components/FestivalHelpButton.tsx`.
- **Private screenings show only an invite-code box.** No price and no card form: the ticket button says "Enter Invite Code", the checkout window asks for the code only, and the home-page list says "Invite only". The switch is also published with the watch party settings so the website sees it (`api/publish-data.ts`). `components/SquarePaymentModal.tsx`, `components/WatchPartyLobby.tsx`, `components/WatchPartyPage.tsx`, `components/UpcomingWatchParties.tsx`.
- **iPhone: the close (X) button on a film's detail screen could not be tapped.** It sat under the status bar / Dynamic Island. On phones it now sits below it, bigger, outside the scrolling box. `components/MovieDetailsModal.tsx`.
- **Featured Cast photos load fast.** They loaded full-size originals; now they use the shrunk copies from the image proxy (and never show a broken icon). Same for the Actors directory. `components/MovieDetailsModal.tsx`, `components/ActorsDirectoryPage.tsx`.
- **Copy, text selection, right-click / long-press menus and picture dragging are blocked** on the public site (typing boxes, anything marked `data-allow-copy`, and signed-in admins are left alone). This does NOT stop screenshots or screen recording; only DRM can (see security plan). `services/contentProtection.ts`, `index.tsx`; tests in `tests/contentProtection.test.ts`.
- **Private screenings (invite code only).** New switch in Watch Party Manager → "Private screening (invite code only)" (movies). Nobody gets in without a ticket, even at $0; card sales are refused; the only way in is a free code made for that film (Admin → Promo codes), which grants the ticket. `api/_lib/entitlements.ts`, `api/process-square-payment.ts`, `api/unlock-watch-party.ts`, `components/WatchPartyManager.tsx`; tests in `tests/privateScreening.test.ts`.
- **Free cast & crew codes now work on pay-what-you-want watch parties.** Before, any promo code was refused there. Now a code that makes the ticket free (a "one-time access" code or 100% off) is accepted; the amount picker and card box disappear and the ticket is granted like any other. A part-discount code is still refused there, because the viewer picks the amount. `api/process-square-payment.ts`, `components/SquarePaymentModal.tsx`, `promoMakesFree` in `api/_lib/paymentRules.ts`.
- **A free code must name its film or screening.** A free code with no film used to open everything it was tried on (every paid party and block). The admin form now refuses to make one, checkout refuses any that already exist, and "Apply" uses the same rules as checkout. `api/manage-promo-codes.ts`, `api/validate-promo-code.ts`. **Check Admin → Promo codes**: any existing free code shown as "Full Platform Access" stops working until it is re-made for one film.
- **The PWFF pass opens the PWFF schedule only.** Old days left in the schedule (last year's, or days entered before the committee lineup was published) and partner festivals are no longer opened by a PWFF pass, on the website or the Roku. `api/_lib/entitlements.ts`, `api/roku-feed.ts` (tests added in `tests/watchPartyAccess.test.ts`).
- **A watch party ticket now stays on your account.** The page never read watch party tickets (or the Crate Fest and jury passes) from your account when it loaded. It only remembered a ticket for the visit in which it was bought, so after a refresh, or when signing in on a phone, a paid ticket looked missing. The profile is now read through one tested file (`services/userProfileMap.ts`), and a test fails if an access field is ever dropped again. Found when a ticket showed on the computer but not on the phone.
- **The CRATE logo no longer disappears in emails.** Some phone mail apps (Gmail on iPhone in dark mode) flip the dark email to light colors, and the see-through white logo vanished. The logo now sits on its own near-black box (`public/email-wordmark-boxed.png`), so it shows whatever color the app makes the card.
- **Premieres can't leak through side doors.** One shared rule, `filmHoldReason` in `api/_lib/filmAvailability.ts`, now holds a film that has a future release date or a watch party that hasn't started. It is used by: the film page's video request (the release date was only checked in the browser before), the Roku channel and Roku movie details (a *free* film was signed with no check at all), and the two public Roku feeds (`instant-tv-feed`, `roku-direct-publisher-feed`), which also no longer list hidden films or films past "hide automatically after". Early arrivals on the film page see "This film opens …". Tests: `tests/filmHold.test.ts`.
- **Ticket holders can't watch early on the film page or Roku either.** The start-time rule only covered the watch party page. Someone with a ticket could open the regular film page (or the Roku channel) before the screening and play it. Now every watch party film, ticketed, free, or in a festival block, is held until its start time on the website and the Roku channel. An early arrival sees "Your ticket is confirmed. This screening starts …" and the film begins by itself once it's time. New `onDemandStartGate` in `api/_lib/streamTiming.ts`, used by `api/_lib/entitlements.ts`; tests in `tests/onDemandStart.test.ts`.
- **A watch party's film is only handed out at the start time.** The server now says "not yet" to the video request until the scheduled start (15 seconds early so the picture is ready at 0:00), or until an admin starts the party by hand. Before, a ticket holder could ask for the video link any time. The page waits and asks again just before the start. `api/_lib/streamTiming.ts`, `api/get-stream-url.ts`, `components/WatchPartyPage.tsx`, tests in `tests/streamTiming.test.ts`.
- **No more broken picture on "Access Locked"** (and on the PWFF, festival program and Top Ten pages): a bad poster link falls back to the original file, then to a tile with the film's title. New `components/SafePoster.tsx`.
- **My List row now sits below Top Ten Today** on the home page.
- **Director's note on any film** (Films → edit → "Director's Note (any film)"): shows on the film's own page and details window. The PWFF page keeps using only the Festival / PWFF Profile fields, so these never appear there. New fields `directorNote`, `filmmakerBio`.
- **Filmmaker outreach tab removed** (tab, screen and `api/filmmaker-outreach.ts`).
- **Emails are darker**: near-black card on black, so the CRATE wordmark and red buttons stand out. `api/_lib/emailBranding.ts`.

## 2026-10 — Premiere reminder emails, My List row, film viewing numbers, weekly backup

- **New email look (all emails made with the shared template).** One dark card with the CRATE wordmark sitting at the top-left and a thin line under it, like Pavilion+: no coloured banner. Dark mode in phone mail apps can no longer wash the logo out. Older emails written for a white card are flipped to dark colors automatically (`darkenEmailBody`), so none had to be rewritten. `api/_lib/emailBranding.ts`, new logo file `public/email-wordmark.png`. A few older one-off emails that don't use the shared template (e.g. promo email) keep their old look.

- **Premiere reminder emails.** A film with a watch party now emails ticket holders (and pass holders) **about a day before** and **15 minutes before**; festival blocks get the day-before email too (they already had the 30-minute one). Each goes out once, only inside a short window, so a premiere scheduled an hour out never gets a "tomorrow" email. Rules and tests: `api/_lib/premiereReminders.ts`; sending: `api/_lib/sendPremiereReminders.ts`; runs inside the existing every-minute `api/update-watch-parties.ts` cron.
- **"Remind me by email"** button under each upcoming watch party on the home page (signed-in viewers; the email goes to their own account address). Those emails carry a one-click "Stop reminders for this film" link (signed link, `api/premiere-remind.ts`). New collection `premiere_reminders` (server only).
- **My List row on the home page** (the films a viewer saved, newest first, "See all" opens the My List page). The button on every film, the My List page and the Roku row already existed.
- **Film viewing numbers.** Film page reports which tenth of the film is being watched (counts only, no personal data). Admin → film deep dive and the filmmaker/partner dashboard show **plays, finish rate and where most people stop**; series show one chart per episode. Counted from this update on, website viewers only (Roku does not report this yet). `api/track-watch.ts`, `api/_lib/watchStats.ts`, `components/useWatchReporter.ts`, `components/admin/WatchFunnel.tsx`. New collection `film_watch` (server only).
- **Weekly database backup.** Sundays ~3:40 am New York, `api/backup-firestore.ts` saves the whole database plus the catalog file to a PRIVATE bucket (one folder per week, newest 8 kept) in the same file format as `npm run backup`, so `npm run restore` reads it. Overview has a **Backups** card (status + "Back up now", main admin only). **It stays off until you add a private bucket**: create a NEW S3 bucket (Block all public access ON) and set in Vercel `AWS_BACKUP_BUCKET_NAME` (and, once the small AWS key exists, `AWS_BACKUP_ACCESS_KEY_ID` / `AWS_BACKUP_SECRET_ACCESS_KEY`; optional `AWS_BACKUP_REGION`). It refuses to write into the film bucket. `api/_lib/backup.ts`, `api/_lib/runBackup.ts`, `api/admin-backup.ts`.

## 2026-10 — Films show where they are and why; episodes play one after another (Roku channel 2.3.7)

- **Films page: a status on every film.** Each film says in plain words whether it is *Live on CRATE*, *Hidden* (and which thing hides it: the Unlisted switch, a "hide automatically" date, a festival block that keeps films out of the catalog, a premiere not yet held), *Coming soon*, or *Live but not in any row*, plus chips for its premiere, festival block, and series episodes. Filter chips along the top (Live, Hidden, Coming soon, Premieres, In a festival, Not in any row, Series). Rules in `api/_lib/filmStatus.ts` (tested). Why a film put in a PWFF block + premiere doesn't reach the catalog: the block's "Release films to the regular catalog once this block's watch party ends" is off by default, and the film itself is usually Unlisted.
- **Overview: "Your films at a glance"** tiles (Live, Hidden, Coming soon, Premieres, In a festival, Not in any row); each opens the Films list on that filter.
- **Series on the website.** Play on a series now starts episode 1 (or "Continue episode N" in this browser) and the next episode starts after an 8-second "Up next" countdown, from the first episode on. Before, Play on the series itself played one file and stopped. New episode list (number, title, description, length, Now playing / Up next / Continue).
- **Paid series episodes now play on the website.** Episode links of paid series were never sent to the browser, so clicking an episode could not work. Episodes are now opened by number (`?ep=3`) and `api/get-stream-url.ts` signs that episode after the usual access check (`api/_lib/streamSource.ts`, tested). Old `?stream=` links still work.
- **Premiere checklist.** The Overview has a **Next premiere** card (countdown + checklist) and any film with a watch party has a "Premiere checklist" link on the Films page. It says what is ready and what needs you: premiere scheduled, film converted for streaming, poster, Roku poster, runtime, synopsis/director, ticket price, on sale after the premiere, "Hide automatically after" set. `api/_lib/premiereChecklist.ts` (tested), `components/admin/PremiereChecklist.tsx`.
- **Episode cards in the player.** Series get an **Episodes** button at the bottom-right of the player; it opens a row of episode cards along the bottom (number, title, length, description, Now playing / Up next) without pausing the film. Swipe, arrow buttons, or Tab + Enter; Esc closes. `components/EpisodeCards.tsx`.
- **Roku 2.3.6: Up next.** When a series episode ends, an "Up next" card counts down 8 seconds and the next episode starts by itself (OK plays it now, Back stops). `roku/components/CrateVideoPlayer.*`, `TitleScene.*`.
- **Skip intro (website + Roku 2.3.7).** In the Films editor, a series has **Skip intro (every episode)** start/end seconds, and each episode can set its own (its own overrides the series). While the intro plays, a **Skip intro** button shows at the bottom-right of the player and jumps to the end of the intro (Roku: press OK). Nothing set = no button. Rule `api/_lib/introSkip.ts` (tested); `api/roku-feed.ts` sends `introStart`/`introEnd` per episode.

## 2026-10 — Films start right away on phones

- Opening a film from its poster on a phone used to stop on a play button: phones (iPhone especially) only allow a film to start WITH sound straight from a tap, and the film page loads the video address first. Now, when the phone blocks sound, the film starts muted with a big **🔊 Tap for sound** button; the first tap anywhere on the film turns the sound on (it doesn't pause). Computers and most Android phones still start with sound. `components/MoviePage.tsx` (playContent).

## 2026-10 — Films → "Remove selected"; clean-up never touches files the site code uses

- **Films page → "Select to remove".** Tick films (or "Select all shown"), press **Remove selected**: CRATE checks them first and shows which can go (with how many files and how much space) and which stay and why. Type REMOVE to go ahead. Each removed film loses its catalog entry, its place in rows, and the bucket files only it uses: video, the whole streaming folder, poster, trailer, photos. Files another film or the site uses are kept. Never removed: films that earned money (they stay on Earnings & payouts), festival or partner films, films with a watch party coming up or held in the last week. Main admin only. `api/admin-remove-films.ts`, `components/admin/RemoveFilmsModal.tsx`; rules `filmRemovalCheck` / `filmOnlyFiles` in `api/_lib/storageCleanup.ts` (tested); shared server steps in `api/_lib/filmRemoval.ts` (also used by Storage clean-up).
- **Safety fix:** Storage clean-up (and film removal) now always keeps the bucket files the site's own code links to: the website intro video, the Roku channel's built-in videos, built-in posters and backgrounds (`api/_lib/codeLinkedFiles.ts`). A test fails if code ever links a new bucket file that isn't on that list.

## 2026-10 — Storage clean-up can remove hidden films from the catalog too

- When the rows you delete include **hidden film: …** files, the confirm box offers **"Also remove these hidden films from CRATE"** (off unless you tick it). Removed films disappear from the catalog and from any rows, and the site data is republished.
- Only films that are safe to remove are removed: hidden, never earned money, not in any festival schedule (past or future), not a partner film, and only if their video files really were deleted. A film that earned money stays (hidden): Earnings & payouts works out what each filmmaker earned and is owed from the films in the catalog, so removing it would hide that money and make it look like the filmmaker was overpaid. If Square can't be checked, nothing is removed. Rule: `catalogRemoval` in `api/_lib/storageCleanup.ts`, tested in `tests/catalogRemoval.test.ts`.
- Fix: the "Deleted …" message after a clean-up was wiped by the automatic re-check; it now stays.
- **Films in use** and **Hidden / past films** tiles can now be tapped: they open the list of films, and each film in use says why (showing on CRATE, watch party coming up, "Hide automatically after" date still to come, premiered in the last week, festival block, partner film). `whyInUse` in `api/_lib/storageCleanup.ts`.

## 2026-10 — Bulk upload films (no Terminal needed)

- New admin tab **Bulk upload films** (Films & content group). Drop many film files at once (a whole festival); CRATE guesses which film each file is from its name (`api/_lib/filmFileMatch.ts`, tested: ignores words like FINAL / ProRes / v2, a missing "The", and picks the longer title when one sits inside another; no guess when unsure). Check each guess, then **Upload & convert**: files upload one after the other, each starts its conversion as soon as it's up, and the server fills in each film's video and runtime when AWS is done (the page can be closed once uploads finish; conversions in progress come back after a refresh). Warns when two files point at the same film or a film already has a streaming version. Staff who can edit Films get this tab too.
- The upload code is now shared by the single-film box and the bulk tab (`services/videoUpload.ts`); `api/admin-video.ts` has a `statuses` action that checks many conversions in one call.
- `ops/video/setup-dashboard-converting.sh`: works when Vercel uses the main (root) account key (nothing to add), finds the key's user another way, and shows AWS's own error if it still can't.

## 2026-10 — Upload & convert films from the admin panel; clearer storage clean-up

- **Film editor → "Upload & convert film".** Choose the film file (any size): it uploads straight to S3 in 64 MB pieces (`originals/`), then AWS MediaConvert makes the streaming version (HLS 1080p / 720p / 360p, same settings as `ops/video/convert-film.sh`) in `hsl/<name>/`. When it's done, the film's video address and runtime fill in by themselves (saved films are updated and republished on the server; the open editor fills in too). The conversion carries on if you close the page; the upload needs the page open. `api/admin-video.ts`, `components/admin/FilmUploadConvert.tsx`, helpers in `api/_lib/videoPipeline.ts` (tested). New package: `@aws-sdk/client-mediaconvert` (run `npm install`).
- **Runs by itself:** `api/video-jobs-cron.ts` (every 10 minutes) finishes conversions nobody is watching (fills in the film's video and runtime), and **deletes the original upload 7 days after a successful conversion** (Salome's choice): only `originals/` files from the panel, never after a failed conversion, never while a film still plays it; logged in Logs & security.
- **One-time AWS setup:** `bash ops/video/setup-dashboard-converting.sh` (adds MediaConvert permission to the Vercel key's user, adds "ETag" to the bucket's CORS ExposeHeaders, prints the role for the new Vercel setting `MEDIACONVERT_ROLE_ARN`). "Check setup" in the editor says what's missing.
- **Storage clean-up explains itself.** A file whose name contains a visible film's title now says *extra copy of "Title": CRATE plays a different file (…)*, usually the original before converting, or an older upload. Extra safety: a file with the same name as one a visible film plays (or an HLS folder with the same name) is always kept.

## 2026-10 — Admin → Storage clean-up

- New admin tab **Storage clean-up** (Platform group, top admin only): "Check storage" lists the video files in the S3 bucket that CRATE doesn't use, one row per film file (an HLS folder is one row), biggest first, with the reason (hidden film / not used by any film). Each row is **Keep** (default) or **Delete**; "Delete marked" asks you to type DELETE. The server works the list out again before deleting and only deletes rows still unused (`api/admin-storage-cleanup.ts`, audit-logged). Same rules as the Terminal tool, now shared in `api/_lib/storageCleanup.ts`.

## 2026-10 — Bucket clean-up tool

- `ops/storage/clean-bucket.ts`: deletes video files in the S3 bucket that CRATE no longer uses, in two steps. Plan first (`npx tsx ops/storage/clean-bucket.ts`, deletes nothing, list on the Desktop), then `--delete` (type DELETE to confirm; only files on that list that are still unused). Counts hidden films and unused submission uploads as not in use (Salome's choice). Always keeps: non-video files, visible films, hidden films with an upcoming/live party or a future "hide after" date or premiered in the last week, festival blocks still in their rewatch week, partner films, anything else the site data points to, and whole HLS folders in use. Rules in `api/_lib/storageCleanup.ts`, tested in `tests/bucketCleanup.test.ts`. Admin password is typed in and never saved.

## 2026-10 — One set of controls, blocks play film after film, sign in before paying

- **Control Room player is a preview only.** Its play / pause / seek used to be sent to every viewer, so it fought the real controls (the party clock, and a second admin window). Viewers now always follow the party clock; control the party with Start, Next Film and End Party.
- **One schedule.** The home page also read a second copy of the schedule (`watch_party_schedule`) that only the Film editor updated, so scheduling from Watch parties could be overridden by an old time. It now reads only the film's own fields.
- **Festival blocks play their films one after the other by themselves.** A block moves on when the current film's runtime has passed; a film with no runtime used to hold the block up for 3 hours. Opening Admin → Watch parties now measures any block film that's missing its runtime from its video (MP4 or HLS from MediaConvert) and saves it (`services/measureRuntime.ts`, tested). A note says which ones were filled in, or which couldn't be read.
- **"Just Premiered" keeps working after the party ends.** Ending a film party switches it off; the premiere time is now kept (`lastPremiereAt`) so the film still shows for its weekend.
- **Sign in before paying.** Opening checkout while signed out now shows "Sign in to continue" with a "Sign in or join free" button that brings people straight back, instead of a card form. (The server already refused to take payment without an account.)

## 2026-10 — Roku watch parties (channel 2.3.5)

- **Watch Parties row first on the Roku home screen** (above Top 10), and the big billboard opens on the party, so nobody scrolls to find it. Channel update needed (roku/, version 2.3.5).
- **No more "Checking the watch party..." forever.** If the TV can't reach CRATE it says "Still connecting..." and retries every 5 seconds. A live party is joined even if a pause was last recorded (the admin's preview player can record one), and even if the start time hasn't arrived yet from the server. Joining right at the start no longer bounces back to the waiting screen.
- **Server (works on any channel version):** `get-watch-party-status` and the Roku feed treat a leftover "live"/"ended" from an earlier run as waiting, same as the website.

## 2026-10 — No more endless spinner in a watch party

- A visitor who isn't signed in, at a **free** watch party, used to get a spinning wheel forever: the film's video link needs an account, and the page quietly gave up. They now see "Sign in or create a free CRATE account to join" with a **Join free** button that brings them straight back (and makes them a CRATE member).
- If the video link can't be loaded (a connection problem), viewers see "Try again" instead of spinning; a film past its hide date shows "has left CRATE".

## 2026-10 — Watch parties announce themselves; premiere payments

- **Watch party cards at the very top of the home page** (above the hero, for signed-in and signed-out visitors): every party in the next 30 days with its countdown, price and "Get ticket", and "Live now · Join now" once it starts. Nothing shows when there are none. The landing page now reads the live site data, so a party appears the moment it's saved.
- **Premiere films hidden from the catalog still get their party shown** (Upcoming cards, live notice, Just Premiered, Roku party row). Premieres are usually kept hidden until the night; that used to keep the party off the home page entirely. To take a party off the home page, switch its watch party off (or use "Hide automatically after"). `isWatchPartyListable` in `api/_lib/filmAvailability.ts`.
- **A test left "live" no longer blocks the real party.** A party that went live more than 3 hours before the scheduled start (e.g. a test never ended) counts as waiting: the lobby and countdown show, the cron and the lobby's auto-start start the real run on time, and saving a new time resets it (`isStaleLive`, `effectiveStatus`, tested). Viewers never get the "Rewatch" end screen from an old run's clock: only a live run can end by the clock.
- **Premiere payments: cratetv.net/book-premiere.** Film title + two cards: "Hold my date" $25 (every premiere) and "Free premiere balance" $50 (rest of the $75). Card payment through Square (sign-in required), prices fixed on the server (`PREMIERE_PRICES_CENTS`), no promo codes, receipt to the filmmaker, email to studio@cratetv.net, saved in `premiere_payments`, listed in Payments & refunds. Link it as cratetv.net/book-premiere?film=Title to pre-fill.
- /host and /premiere FAQs now say how money works (festivals pay nothing up front; premieres pay by link).
- Hardening: a payment type like "toString" can no longer match the price list.

## 2026-10 — Calmer home page, tidy Control Room, parties show without a restart

- **Parties show on the home page as soon as you schedule them.** Saving a new future start time (Watch Parties schedule or Movie Editor) used to leave the film's old "ended" status from a test or an earlier screening, so the home page treated the new party as over until you pressed Restart. Saving now puts it back to "waiting" (`resetForNewSchedule`, tested; never touches a party that's live), and the home page, header and context use `isEndedForThisRun` everywhere.
- **No more live-party takeover of the home page.** The big hero with the film's whole synopsis (and the "Live Watch Party Now Active" line clashing with the header) is gone, and so is the header's "Live Hub Active" chip.
- **Control Room layout fixed.** The new panels had landed inside the button row and were squashed side by side. Now: title and buttons, then Viewership full width, then Tickets + Pinned, then Stopped watching + Reactions (stacked on smaller screens). Schedule section restyled to match.

## 2026-10 — "Want this for your festival?" on festival pages

- A small box at the bottom of the PWFF page and every partner festival page: "Host your festival on CRATE" (→ /host) and "Premiere your film" (→ /premiere). People watching a festival include organizers and filmmakers, so each festival CRATE hosts advertises the next one. `components/HostWithCrateCta.tsx`.

## 2026-10 — "Hide automatically after" and a "Just Premiered" row

- **Hide automatically after** (Movie Editor → Access & Monetization): set a date and time and, from that moment, the film is hidden everywhere (home rows, library, search) and can't be bought (rentals or tickets refused by the server). The website hides it right away; the hourly job (`auto-unlist-expired-festival-films`, now every hour at :05) unlists it for good and updates Roku. To bring it back: clear the date and switch visibility back on.
- **After that time nobody can watch it, including people who paid before.** The server refuses the video link (`get-stream-url` answers 410), Roku gets no stream, and the film and watch party pages show "This film has left CRATE" (`components/FilmNoLongerAvailable.tsx`). Someone already mid-film at that moment can finish (their video link was issued before).
- **Just Premiered row** on the home page: a film whose watch party premiere ended in the last 7 days shows there by itself (until its hide date), so people who missed the premiere can still buy it. Sits right under "Upcoming watch parties".
- Rules in `api/_lib/filmAvailability.ts`, tested in `tests/filmAvailability.test.ts`.

## 2026-10 — "Host your festival" and "Premiere your film" pages

- **/host** (also /host-your-festival and /festivals): what CRATE does for a film festival, how it works, no setup fee / revenue share, and a request form.
- **/premiere**: a premiere night for one film (countdown, tickets your way, watching together, live Q&A) and a request form.
- Both forms go to `/api/send-inquiry`: emailed to the studio inbox (Reply answers the sender) and saved in `inquiries`. Rate limited, hidden bot trap, everything cleaned (`api/_lib/inquiry.ts`, tested in `tests/inquiry.test.ts`). Linked from both footers and added to the sitemap.
- The pages only promise what CRATE does today: ticket-checked, expiring links, no download button, one device per ticket. They don't claim DRM or a location lock.

## 2026-10 — Control Room: tickets, drop-offs, pinned announcement

- **Tickets for this party:** how many sold, money made (before Square fees), average paid, sales in the last 15 minutes and the latest buyers, refreshed every 30s. Main admin password only (staff keys don't see money). Free seats and festival all-access passes aren't counted.
- **Stopped watching (last 15 min):** who stopped and whether they closed the page ("left") or stopped checking in ("went quiet": switched away, lost connection, or the video got stuck). If 3 or more go quiet together it warns you to check playback. Names only, no emails.
- **Pinned announcement:** type a message in the Control Room and it stays at the top of everyone's chat and in the waiting room, marked CRATE, until you remove it (or 12 hours pass, so an old pin never shows at the next party). Not on Roku yet (needs a channel update).
- All three go through `/api/admin-watch-party-stats` (new `action` field) with the admin sign-in; logic in `api/_lib/controlRoom.ts`, tested in `tests/controlRoom.test.ts`. No rules change.

## 2026-10 — Watch party fixes: start on time, quieter home page, reactions, Roku

- **Film starts at the countdown.** A party that had run before (or been tested) kept the status "ended" until the new run began, so viewers arriving for the new time saw the "ended / rewatch" screen instead of the lobby and countdown, and had to click "Rewatch party". A party rescheduled for after it last ended is now treated as not started (`isEndedForThisRun`, tested). Same rule in the Upcoming row.
- **Lobby shows the film's synopsis**, so people can decide and buy before it starts.
- **Fewer alerts on the home page:** the watch party ribbon is off and the header "Featured Stream" chip only shows while a party is live. Upcoming parties live in the "Upcoming watch parties" row; a live party also gets the big hero slide.
- **Reactions in the Control Room:** every emoji with who sent it and a tally. New reactions carry the viewer's name and account id (`firestore.rules` updated: deploy the rules).
- **Switching away goes silent:** when a viewer leaves the page (another tab or app, or a call on their phone) the film pauses and mutes; when they come back it jumps to the live point with sound.
- **Control Room chat works again:** sending needed a signed-in viewer account, which the admin panel doesn't have, so the box was greyed out. It now only needs your admin sign-in; messages show as **CRATE Admin** with a gold CRATE badge for viewers. Errors are shown instead of failing silently.
- **Roku:** a "Watch Parties" row (upcoming and live film parties, with date/time) so the TV app can find the party; `get-watch-party-status` with no film now answers "is anything live?" instead of an error; `check-roku-link-status?movieKey=` now tells the TV whether the linked account has a ticket (ticket holders used to see "buy a ticket").


## 2026-10 — Watch parties: upcoming list, real viewer count

- **Upcoming watch parties** on the home page and the landing page: every film watch party and festival block in the next 30 days, with a live countdown, date/time (Philadelphia), price and a ticket button (`components/UpcomingWatchParties.tsx`). People can buy early and go straight into the film at start time instead of finding out once it's live.
- **"Watching now" counts real viewers.** The heartbeat that records viewing only looked for the video player once, when the page opened, so everyone who arrived early (in the lobby) was never counted. It now checks every few seconds and only counts people whose video is actually playing (`hooks/useWatchHeartbeat.ts`). Viewers see "N watching now" above the chat (`/api/watching-now`, cached 15s); the end screen shows how many watched together.
- **Festival schedule editor** now warns before deleting a block or a day: tickets are tied to a block, so deleting and re-adding one locks out everyone who already bought it.


## 2026-10 — Pay what you want for watch parties

- Admin → Watch parties: a paid film watch party can be switched to **Pay what you want (from $3)** (checkbox under the price). Viewers see "Pay what you want" on the ticket button and pick $3, $5, $10 or their own amount at checkout.
- The server checks the amount (`payWhatYouWantCents`, tested): a real number from $3 to $500, never below the minimum, no promo codes on top. Festival blocks keep their fixed prices.


## 2026-10 — Security audit: loopholes closed

**Getting in free / paying less**
- Full festival pass: only sold (or given by code or invite) while a festival with screening times is coming up or running (`festivalPassOnSale`). No more "pass bought early lasts 4 months".
- Full pass could be unlocked by ANY payment carrying `itemId: full-festival-pass` (a $1 donation, a $4.99 subscription). Now only a real pass purchase grants it; `paymentType: 'pass'` is priced like the pass.
- A donation amount that wasn't a number skipped the charge. Amounts must be $1–$10,000.
- Promo codes: every rule (exists, uses left, expiry, item) is checked at checkout, a use is claimed atomically before charging and given back if the charge fails, and discounts are capped at 0–100% (`api/_lib/paymentRules.ts`, tested). An unknown code no longer charges full price and then fails.
- Block tickets end with the screening + rewatch week (the 14-day minimum now only applies when a block has no time). Ended screenings can't be bought, and festival films whose window is over can't be rented.
- A "watch party ticket" for a block is now a normal (expiring) block ticket, and `unlock-watch-party` only saves permanent tickets for free parties.
- Ticket codes: 10 characters from a secure random source, and redeeming is rate-limited.

**Someone else's money or account**
- Filmmaker dashboards: knowing a credited name is no longer enough. Auto-approved only when a confirmed email matches one CRATE has on file (agreement sent, film submitted, admin-entered payout email); otherwise it waits in Admin → Earnings & payouts → Filmmaker dashboards, which also lists every existing account so old ones can be checked and switched off. Payout-detail changes email the admin.
- Email-based grants (festival invites, help-desk ticket matching, filmmaker on-file emails) require a confirmed email; a confirmation link is emailed (`api/_lib/emailVerify.ts`).
- Actor profiles: only approved actors can edit, and the name is locked (anyone could rename themselves and replace an actor's photo and bio on every film).
- `update-playback-progress` took the account from the request; now from the sign-in.

**Abuse and data exposure**
- `filmmaker-outreach` had no login check: anyone could email anyone from studio@cratetv.net. Master admin only now.
- Image proxy: only CRATE's own S3 bucket/CDN over https, no redirects, and a sandbox CSP (an attacker's SVG could run script on cratetv.net).
- Public photo uploads: photos only (no SVG/video), max 15 MB, size signed into the upload link.
- Actors' email addresses removed from the public actor directory, search and profile.
- Firestore rules: chat messages server-only (fake "director/admin" messages), view counts server-only, old jury collection closed, lobby presence keyed by account id instead of email (emails were readable by every viewer); `verifiedActorName` protected.
- Chat names and messages capped, reserved names (CRATE, Admin…) blocked; laurel SVG text escaped; public email forms escaped and rate-limited; rate limits on likes, view tracking, promo checks, newsletter (no repeat welcome emails).
- Removed unused endpoints that were still live: `actor-post`, `toggle-post-like`, `get-actor-feed` (hard-coded password), `submit-film` (unlimited upload links), `vote-poll`.


## 2026-10 — Festival passes are good for one festival

- **Full festival pass now ends.** It used to be a forever `hasFestivalAllAccess: true`, so a 2026 pass would have opened every future festival free. A pass now carries `festivalPassExpiry` = the last PWFF block + the rewatch week + 1 day (`api/_lib/festivalPass.ts`, tested), and only that date is checked: website, watch parties, Roku, help button, reminder emails. Purchases, full-pass codes, PWFF invites and help-button repairs all set it. Old passes with no end date (all from the 2026 festival) count as ended; nothing to migrate.
- **Day passes:** the old day-NUMBER fallback ("day 1") is gone — it would have opened day 1 of every future festival. Day passes still work through their dated block unlocks.
- **Partner festivals:** a partner pass only carries over to blocks of the same year. Passes bought before that partner's last cleanup aren't extended to, or restored for, the next edition.
- **Invite block tickets** last the normal block window, not a whole year.
- **Roku:** same one-festival rule, and the old day-number fallback is gone there too.
- Admin → Audience lookup shows when someone's full pass ends and which festival it's for.

## 2026-10 — Payments & refunds, email header

- **Payments & refunds** (Admin → Money & legal; master login only): every Square payment for the last 30 days to a year, matched to the customer's email where CRATE has a ticket record; **possible double charges** flagged (same buyer, item and amount within 15 minutes — `api/_lib/duplicateCharges.ts`, tested); full or partial **refund through Square** with a reason, optional customer email, and an option to mark a cancelled ticket as refunded so the help desk never restores it. The amount is re-checked against Square, a one-time key stops double-clicks refunding twice, and every refund is logged (`refunds` collection + audit log). Access isn't removed automatically.
- New ticket records now store the exact `squarePaymentId`, so refunds match customers exactly.
- **Email header:** phone mail apps in dark mode were turning the black header light grey and hiding the white logo. The header is now one picture (`public/email-header.png`, logo on "midnight glow"), and the four email logo files are now a logo badge with its own background, so the logo shows clearly everywhere, including emails already sent.

## 2026-10 — Filmmaker onboarding, quiet declines, database backups

- **Declining a submission is quiet and final.** "✕ Decline & delete" removes it from Submissions with no email; the filmmaker can't see submission statuses anywhere. For films that were never approved, the uploaded film file and poster are deleted from storage too (never if a catalog film uses them).
- **Automatic onboarding.** Approving a film (premium or catalog) now puts the Filmmaker Distribution Agreement (with the film's current split) and the Rights & Clearances Warranty in the same approval email, plus "Set up my dashboard". Approving twice never sends duplicates. After signing, the filmmaker's copy email and the signed page show the dashboard and payout-method step.
- **Films missing agreements** list in Contracts: every film with a credited filmmaker and no distribution agreement yet (public-domain classics excluded), with one button to send both agreements in one email (`admin-onboard`).
- **Fixed:** the approval email's "View Your Dashboard" button went to `/creator-dashboard`, which doesn't exist. It now goes to `/filmmaker-signup`.
- **Backups:** `npm run backup` saves the whole database to `~/crate-backups/crate-backup-<date>.ndjson.gz`; `npm run restore -- <file> --only <collection or doc> [--missing-only] [--confirm]` brings things back (preview unless `--confirm`). See the Operations Manual.

## 2026-10 — CRATE Studio: new admin panel, earnings & payouts, contracts, actor approvals

- **New admin look and navigation.** A sidebar with six groups (Home, Films & content, Live & festivals, People, Money & legal, Platform), plain names, a description on every page, and a search box (press `/` or ⌘K). Badges show what's waiting. Works on phones (menu button at the top). Tab IDs are unchanged, so staff permissions still work; staff who could open Submissions can also open the new Actor approvals.
- **Overview** replaces the Dashboard landing: what needs you (submissions, actors, payout requests, unsigned agreements, spotlight), a money snapshot, quick links, and the existing live dashboard below.
- **Earnings & payouts** (`components/admin/EarningsPayoutsTab.tsx`, `api/admin-earnings.ts`): total revenue and where it went (filmmakers, CRATE, festival, partner festivals), month-by-month chart, every film's revenue and split, who you owe, one-click Pay (opens PayPal / Cash App / Venmo with the amount filled in; Zelle and checks copy the details), record payout with optional receipt email, payout history. Money is never moved automatically.
- **Custom split per film.** Default stays 70/30. A film's own split and payees are stored in `film_deals/<movieKey>` (`api/_lib/revenueSplit.ts`, tested in `tests/revenueSplit.test.ts`).
- **Fixed: co-credited films were over-counted.** Each credited director/producer was given the full 70%, so a film with two credits showed 140% owed. The filmmaker share is now divided among them (equally, or by the shares set on the film). Balances for co-credited filmmakers will drop to the correct amount.
- **Filmmakers choose how they're paid** on their dashboard (`components/PayoutPreferenceCard.tsx`, `api/payee-preferences.ts`), saved to `payee_profiles`.
- **Contracts signed inside CRATE** (`api/contracts.ts`, `/sign` page, `components/admin/ContractsCenterTab.tsx`). Six templates in `api/_lib/contractTemplates.ts`: Filmmaker Distribution Agreement, Rights & Clearances Warranty, Festival Submission Terms, Actor Portal Agreement, Appearance & Likeness Release, Payee Information & Tax Acknowledgement. Each signature stores the exact text, version, SHA-256 fingerprint, typed name, email, time, IP and browser; signer and owner get an email. The upload vault stays for PDFs and W-9s. **Have a lawyer review the templates.**
- **Actor approvals tab** (the queue that was inside Submissions). Actors now accept the Actor Portal Agreement when they submit a profile.
- **Removed `api/actor-signup.ts`** — no page used it, and calling it directly could switch on the actor portal for someone else's account and change cast photos on films.
- Admin sign-in screen refreshed.

## 2026-10 — Cleanup: unused tools removed

- **Grand Jury removed.** The `/jury` page, the Jury and Academy Intelligence admin tab, the footer link, the $25 Jury Pass in the payment window, and the jury scoring endpoints (`get-jury-dashboard-data`, `save-jury-review`). Anyone who already bought a Jury Pass keeps full access (`hasJuryPass` is still honored on the website and Roku).
- **Security fix that came with it:** a guest Jury Pass was only remembered in the visitor's browser, and the film page trusted it. That shortcut is gone.
- **Grants & Research admin tab removed**, with its seven AI tools (Grant Writer, Fund Strategist, Partnership Finder, Strategic Command, Deep Horizon Scraper, Rights Auditor, Archive Scout) and their endpoints.
- **Pages removed:** `/edu`, `/pitchdeck`, `/filmfestivalmodule` (a demo), `/developer-guide` (replaced by the CRATE TV Operations Manual). These addresses now show the normal "not found" page.
- Kept on purpose: Crate Fest (for a future online festival), Contracts, Monthly Spotlight, Cratemas, Top 10, Red Carpet (PWFF opening night) and the actor portal.
- Wording: "Ingest Film into Jury Room" is now "Add Film to Pipeline"; the new-submission email no longer mentions the Grand Jury.

## 2026-10 — Roku certification fixes

- **Screensaver removed.** Roku's certification rule 4.5 doesn't allow a channel's own screensaver. When the TV is idle, the Roku's own screensaver runs instead (trailer previews still stop after 2 minutes so it can start). The old files are in `roku-archive/`.
- **`rsg_version=1.3`** added to the manifest, as Roku now requires. In the Developer Dashboard, set **minimum firmware to 15.1**.
- **Memory monitoring** (`source/main.brs`): the channel listens for Roku's low-memory warnings and turns off trailer previews when memory is tight.
- **Removed the unused Roku ads library line** from the manifest; Crate TV shows no ads, and the line made certification look for ad code.
- Channel version 2.3 build 4.

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
