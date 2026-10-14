# Festival Runbook

Use this for every festival hosted on CRATE TV (PWFF, partner festivals, CrateFest).

## 2–4 weeks before

- [ ] **Runtimes.** Every film in every block has its runtime (minutes) set in the Movie Editor, matching the real video length. The Watch Party Manager shows a red **"Missing runtime"** warning on any block that's missing one. A missing runtime means the block waits on you to press **Next Film**.
- [ ] **Block times.** Each block has a Screening Start Time in the Festival Editor. Set times while your computer is on the festival's time zone.
- [ ] **Prices.** Each block's price is set. `$0` means free; a blank price is charged at $10.
- [ ] **Video files.** Each film plays from start to end in the admin preview. (HLS per block, when ready, makes late joins smoother.)
- [ ] **Ticket sales open.** Tickets now stay valid through the screening plus the 7-day rewatch week, however early they're bought.

## Rehearsal (the week before)

Create a test block with three 1–2 minute films, scheduled 15 minutes out. Use a non-admin test account on a phone and a laptop.

- [ ] Buy a ticket with a test card (sandbox) or a $0 promo code.
- [ ] The 30-minute reminder email arrives (schedule the test 35+ minutes out to see it).
- [ ] Both devices are in the lobby, then start together on time.
- [ ] A third device joining 1 minute late catches up.
- [ ] Films advance on their own, with the 30-second intermission countdown.
- [ ] **Next Film** in the Watch Party Manager skips immediately.
- [ ] Chat works from two devices on the same Wi-Fi.
- [ ] About 3 minutes after the last film, the party ends on its own. **Wait 5 more minutes: it must not come back.**
- [ ] The ticket holder can rewatch the films on demand afterwards.
- [ ] Vercel → Logs → `/api/update-watch-parties` runs every minute with no errors.

## Festival day

- Open the Watch Party Manager 30 minutes before the first block.
- Copy the director's **backstage key** from the block card once it's live, and send it privately. Each run gets a fresh key.
- **If a block stalls between films:** press **Next Film**. The server also advances on its own about 90 seconds after a film's recorded runtime.
- **If something goes wrong mid-block:** **End Party** is safe. Ticket holders can still watch on demand afterwards.
- **Roku:** festival blocks aren't supported on Roku yet. Roku viewers see a QR code sending them to the web player. Single-film watch parties do work on Roku.

## After

- [ ] Rewatch window: films stay available for 7 days after their block (or as agreed with the festival).
- [ ] Pull the festival report from the admin panel; send the partner their share.


## Help requests during a festival

Viewers have a **Need help?** button on every festival page, and a **Help** button at the top of the watch party.

- **Most ticket problems fix themselves.** "I bought a ticket but can't get in" checks their purchase and restores access they paid for. It also tells them when they're signed in to the wrong account.
- **Everything else comes to your email**, with the subject 🆘 Festival help, from the address in Settings → technical email. Each email shows:
  - Their message.
  - Their device.
  - Which tickets they have, and whether each one is working.

  **Reply to that email** to answer them directly.
- Requests are also saved in Firestore under `help_requests`. Automatic repairs are logged under `help_repairs`.
- **When you refund someone,** set `refunded: true` on their ticket in Firestore (`festival_tickets`). The help button will then never restore that ticket.


## Audience Choice and the audience map

- **Voting runs itself.** In every block with 2 or more films, ticket holders can vote from the moment the screening starts until the block's rewatch week ends.
- **After the festival:** go to **Admin → PWFF → 🏆 Audience Choice**, check the winner, and press **Award**. That puts "Audience Choice Award <year>" on the film's laurel, which replaces any other award the film shows.
  - On a tie, choose yourself, or announce joint winners and use the Laurels tab for the second film.
- **The "Who's watching" map** fills in on its own during each watch party. Screenshot it for social media after the screening.
