# Crate TV — QA Checklist (post-fix verification)

Covers everything fixed in the last session. Test on the live deployed site, not localhost. Use a **non-admin test account** and, where noted, a **second real device or browser profile** (not just a second tab — some of these bugs only show up across real session boundaries).

## 1. Multi-device sign-in / session kick
- [ ] Sign into the same account on two devices (or two different browsers).
- [ ] Start playing any paid title on Device A.
- [ ] On Device B, start playing the same or another paid title.
- [ ] Confirm Device A gets kicked with the "Account Active Elsewhere" screen.
- [ ] On Device B, sign out.
- [ ] On Device A, tap "Sign In" on the kicked screen — confirm it actually shows a login form (not a bounce back to the same screen), and signing back in lets you resume watching.

## 2. Festival ticket payment modal
- [ ] Go to the PWFF programme page, open a block's lobby ("Enter Lobby").
- [ ] From inside the lobby, tap "Get Ticket."
- [ ] Confirm the checkout modal (sign-up/login, then Square payment) appears **on top** of everything — not hidden behind the lobby.

## 3. Rewatch after a block ends (no re-payment)
- [ ] Buy a ticket for a block (or use one already purchased).
- [ ] Once that block's watch party has ended, go to the film via the catalog/programme page.
- [ ] Confirm it plays immediately with no paywall and no "Session Ended" dead end.
- [ ] Separately: if you're actually on the `/watchparty/...` page when the host ends the party, confirm it hands off to playback smoothly instead of a dead-end screen or a crash.

## 4. Festival block timing gate (the big one)
For an **upcoming, not-yet-started** block you have a ticket for:
- [ ] Individual film rows on the schedule page should **not** show a "Watch" button.
- [ ] The block header button should say "Enter Lobby," not "Watch Now."
- [ ] Opening `/movie/{key}` directly for one of that block's films (e.g. a bookmarked or shared link) should **not** play it.

Once the block is **live**:
- [ ] Block header should say "Join Party" and go to the synced watch-party view.
- [ ] Film rows still should **not** show "Watch" / on-demand access yet.

Once the block has **ended**:
- [ ] Film rows now show "Watch," block header says "Watch Now," `/movie/{key}` plays directly.

## 5. Countdown → live transition / late join (crash check)
- [ ] Join a lobby before a party starts and stay until the countdown hits zero. Confirm it transitions into the live view — no "Sector Offline" error screen.
- [ ] Separately, open the watch-party link fresh *after* a party is already live (simulating a late join). Confirm the same — no crash.

## 6. Watch button reliability
- [ ] From the catalog, click "Watch" on several different titles in a row (not just one). Confirm playback reliably starts each time — no cases where the click does nothing and you're left on a black/frozen screen.

## 7. Responsive layout (quick pass)
- [ ] Load the landing page on a small/narrow phone (or a browser resized to ~280–320px wide). Confirm the hero headline and "Official Distribution Afterlife" label aren't clipped or overlapping the header.
- [ ] Open the login/signup modal on a short mobile screen (landscape or with keyboard open) — confirm it scrolls instead of overflowing off-screen.

---
**When something fails:** note the exact device/browser, account used, and steps — a screenshot of the actual broken state is the single most useful thing (that's what made every fix in this round possible).
