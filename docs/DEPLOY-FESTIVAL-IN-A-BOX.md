# Installing Festival in a box

About 15 minutes, plus a 30-minute test whenever you're ready. Nothing changes for PWFF or your current viewers.

## 1. Install (Terminal)

Unzip the download on your Desktop first. Then:

```bash
cd ~/Desktop/crate-tv-app
git pull origin main
bash ~/Desktop/crate-festival-in-a-box/apply-update.sh
npm run check
```

`npm run check` should end with **pass 23** and **fail 0**. If the installer says **STOPPED**, nothing was changed; send Claude the list it prints.

## 2. Push it live

```bash
git add -A -- api components contexts services tests docs App.tsx index.tsx types.ts firestore.rules README.md CHANGELOG.md
git status --short
git commit -m "Festival in a box: partner portal, partner festival pages, admin partners tab"
git push origin main
```

Wait for **Ready** in Vercel → Deployments.

## 3. Publish the updated database rules

```bash
npx firebase-tools deploy --only firestore:rules --project cratetv-3b75d
```

If Terminal says the disk is full, free space first (`rm -rf ~/.npm/_npx ~/.npm/_cacache`, then empty the Trash) and try again.

## 4. Test it with a pretend festival (about 30 minutes)

1. **Admin → 🤝 Partner Festivals → Add partner:** "CRATE Test Fest", paid to "Test", CRATE 30%.
2. **Team → invite** your test account `cratetv118@gmail.com`.
3. Sign in as the test account in another browser (or a private window) and open the invite link from the email.
4. In the portal (cratetv.net/partner):
   - **Festival & branding:** a name, a colour and a logo.
   - **Films:** add **one short video** (1–2 minutes). Check that the upload finishes and the runtime fills in by itself. **This is the most important check:** it proves uploads from the portal work on your live site.
   - **Schedule:** one day, one block starting 40 minutes from now, price $1.
   - Press **Submit for review**.
5. Back in the admin: **Review lineup → Approve & publish**.
6. Open cratetv.net/festivals/crate-test-fest. Buy the block with a free promo code, join the watch party at start time, and check the **Sales** tab in both the portal and the admin.
7. When you're done, open **Settings → Archive** on the test partner.

If any step fails, note which step and what you saw, and send it to Claude.
