# Deploying the October 2026 update

Allow about 45 minutes. Pick a time when **no watch party is live**. Do the steps in order.

---

## Step 1 — Make a new Firebase admin key (≈5 min)

The old key was inside the zip you shared, so replace it.

1. Go to **console.firebase.google.com** → project **cratetv-3b75d** → ⚙️ **Project settings** → **Service accounts** → **Generate new private key** → **Generate key**. A `.json` file downloads.
2. In Finder, make a folder called `keys` in your home folder (not on the Desktop, and not in the project). Move the downloaded file there and rename it `crate-firebase-admin.json`.
3. Open the file in TextEdit and copy **everything** in it.
4. Go to **vercel.com** → your CRATE TV project → **Settings** → **Environment Variables** → find `FIREBASE_SERVICE_ACCOUNT_KEY` → **Edit** → paste over the old value → **Save**.

Leave the old key alone for now. You'll delete it in Step 6, once the site is running on the new one.

## Step 2 — Install the update (≈5 min)

In Terminal:

```bash
cd ~/Desktop/crate-tv-app
git pull origin main
bash ~/Downloads/crate-tv-update-oct2026/apply-update.sh
```

(If you unzipped the update somewhere other than Downloads, change that path.)

- If it says **STOPPED**, nothing was changed. Send Claude the files it lists.
- If it finishes, it also moves your private files (customer CSVs, the old key) to a folder called `crate-private` in your home folder.

Then:

```bash
npm install
npm run check
```

The last lines should say **`pass 14`** and **`fail 0`**. If not, stop and send Claude the output.

## Step 3 — Commit and push (≈5 min)

First check whether the old key or customer files were ever uploaded to GitHub:

```bash
git log --all --oneline -- service-account.json '*.csv' square-report-raw.txt film-urls.txt
```

If anything prints, those files are in your GitHub history. The new key in Step 1 covers the key. Also check whether the repository is **public** (github.com/CRATETV/crate-tv-app → Settings). If it is, make it **private**.

Now commit:

```bash
git status
git add -A -- api components contexts roku tests docs ops firestore.rules package.json package-lock.json README.md CHANGELOG.md QA-CHECKLIST.md .gitignore .vercelignore
git ls-files --deleted | while read -r f; do git rm --cached --quiet "$f"; done
git status
git commit -m "Festival reliability + security update (Oct 2026 audit)"
git push origin main
```

`ops/archive` and `ops/diagnostics` stay on your computer only, because many of those scripts contain customer emails. The `.gitignore` handles that.

Vercel deploys from the push. Wait for **Ready** in the Vercel dashboard, then open cratetv.net and check that films play.

## Step 4 — Deploy the new database rules (≈5 min)

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project cratetv-3b75d
```

It should say **Deploy complete**. Do this **after** Step 3: the new site no longer needs what these rules close off.

## Step 5 — One-time clean-up of public data (≈2 min)

```bash
export GOOGLE_APPLICATION_CREDENTIALS=~/keys/crate-firebase-admin.json
node ops/sanitize-public-data.cjs
```

That's a dry run. It reports how many exposed video links it found. Then apply it:

```bash
node ops/sanitize-public-data.cjs --apply
```

## Step 6 — Delete the old admin key (≈3 min)

Only once the site has been working for a few minutes on the new key:

1. Go to **console.cloud.google.com** → project **cratetv-3b75d** → **IAM & Admin** → **Service accounts**.
2. Click the account ending in `firebase-adminsdk-…`, then open the **Keys** tab.
3. Find the key whose ID matches `private_key_id` in the OLD file (`~/crate-private/service-account.json`), then **Delete**.
4. Delete `~/crate-private/service-account.json`.

## Step 7 — Test (≈15 min)

Work through **QA-CHECKLIST.md**, sections 8–12. Then do the rehearsal in **docs/FESTIVAL-RUNBOOK.md** before your next festival goes on sale.

## Step 8 — Roku (when convenient)

The Roku fixes (live-party joining, paid-party unlock, the block screen) only reach viewers once the channel is updated:

1. Build the package: in the Admin panel's Roku tab, or with `npm run build:roku`.
2. Upload it in the Roku developer dashboard.

The website changes don't depend on this.

---

### If something goes wrong

- **Site broken after Step 3:** in Vercel → **Deployments**, find the previous deployment → **⋯** → **Promote to Production**. That's an instant rollback. Then send Claude the error.
- **"Firebase Admin SDK not configured" errors:** the `FIREBASE_SERVICE_ACCOUNT_KEY` paste in Step 1 was incomplete. Paste the whole file again, then **Redeploy**.
