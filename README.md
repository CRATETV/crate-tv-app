# CRATE TV

Independent streaming platform for indie film, live watch parties and online film festivals — **cratetv.net**, plus a Roku channel.

Founder & operator: Salome Denoon.

---

## What's in this project

| Folder | What it is |
| --- | --- |
| `components/`, `contexts/`, `hooks/`, `services/`, `App.tsx` | The website (React + Vite + Tailwind) |
| `api/` | Server endpoints, run as Vercel serverless functions |
| `api/_lib/` | Shared server code (not public endpoints) |
| `api/_lib/watchPartyRules.ts` | Watch-party timing rules (start, advance, end, ticket expiry) — **tested** |
| `api/_lib/watchPartyLifecycle.ts` | Watch-party lifecycle against the database (advance, auto-end, clean-up) |
| `roku/` | Roku channel source (BrightScript) |
| `tests/` | Automated tests (`npm test`) |
| `ops/` | Maintenance scripts run by hand from Terminal (not deployed) |
| `docs/` | Festival runbook, Festival in a box guide, deploy notes |
| `api/_lib/partnerRules.ts`, `api/_lib/partners.ts` | Festival in a box: partner rules (tested) and database side |
| `api/partner-portal.ts`, `api/admin-partners.ts` | Partner team endpoint and admin endpoint |
| `firestore.rules`, `storage.rules` | Database / file-storage security rules (deployed with the Firebase CLI) |

## How the pieces fit

- **Hosting:** Vercel (site + `api/` functions + crons in `vercel.json`).
- **Database & sign-in:** Firebase (Firestore + Auth). Browsers can only read public data; everything that grants access or touches money is done server-side.
- **Video:** films live in AWS S3. Players never see a permanent file link — they get an 8-hour signed link from `/api/get-stream-url` after the server checks the viewer's access.
- **Payments:** Square, priced and verified on the server (`api/process-square-payment.ts`).
- **Email:** Resend.
- **Catalog:** the site reads a published snapshot (`/api/get-live-data`), regenerated whenever an admin saves.

## Watch parties in one paragraph

An admin schedules a party (a single film, or a festival **block** of several films). The `update-watch-parties` cron runs **every minute**: it starts parties on time, emails ticket holders 30 minutes before, moves blocks to the next film when the current one's runtime has passed, and ends parties 3 minutes after the last film. Viewers' browsers do the same things a little sooner when they can — every step is idempotent, so whoever arrives first wins and the rest are no-ops. Admins can **force "Next Film"** at any time. An ended party is never re-started for the same scheduled time.

## Everyday commands

```bash
npm install          # first time / after pulling changes
npm run dev          # local dev (or `vercel dev` to run the API too)
npm run check        # type-check + tests — run before every deploy
npm run build        # production build
vercel --prod        # deploy
```

Security rules (only when `firestore.rules` / `storage.rules` change):

```bash
firebase deploy --only firestore:rules,storage
```

## Environment variables (set in Vercel → Settings → Environment Variables)

Never put these in files inside the project.

- **Firebase:** `FIREBASE_SERVICE_ACCOUNT_KEY` (server admin key, JSON), `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`
- **Admin access:** `ADMIN_PASSWORD`, `ADMIN_MASTER_PASSWORD`, `FESTIVAL_ADMIN_PASSWORD`, `COLLABORATOR_PASSWORD`, `ADMIN_SESSION_SECRET`, `ADMIN_OWNER_EMAILS`
- **Crons:** `CRON_SECRET`
- **AWS:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_S3_REGION`, `CLOUDFRONT_VIDEO_DOMAIN`, `AWS_SUBMISSIONS_ACCESS_KEY_ID`, `AWS_SUBMISSIONS_SECRET_ACCESS_KEY`
- **Square:** `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_APPLICATION_ID`, `SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_WEBHOOK_NOTIFICATION_URL` (+ `SQUARE_SANDBOX_*` for testing)
- **Email:** `RESEND_API_KEY`, `FROM_EMAIL`
- **Other:** `VITE_APP_URL`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `FOURTHWALL_OPEN_API_USERNAME`, `FOURTHWALL_OPEN_API_PASSWORD`, `VITE_FOURTHWALL_SHOP_SUBDOMAIN`, `VITE_FOURTHWALL_STOREFRONT_TOKEN`, `APPLE_PAY_VERIFICATION_CONTENT`, `VIRUS_SCAN_ENABLED`

## Maintenance scripts (`ops/`)

Run from the project folder, with the admin key **outside** the project:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=~/keys/crate-firebase-admin.json
node ops/diagnostics/check-live-party.cjs
```

- `ops/diagnostics/` — read-only checks (live parties, access, capacity, errors).
- `ops/archive/` — one-off fixes that have already been applied. Kept for reference; don't re-run without reading them.
- `ops/video/` — film conversion helpers (MediaConvert).

## Partner festivals (Festival in a box)

Partner teams manage their own lineup at `/partner`. Audiences buy tickets at `/festivals/<address>`. You approve lineups and settle sales in **Admin → 🤝 Partner Festivals**. Full guide: **`docs/FESTIVAL-IN-A-BOX.md`**.

## Before a festival

Follow **`docs/FESTIVAL-RUNBOOK.md`**. Short version: every film needs a correct runtime, run a rehearsal block on the live site, and check the cron in Vercel logs.

## History

See **`CHANGELOG.md`**.
