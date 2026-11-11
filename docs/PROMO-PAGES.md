# Promo Pages

A cinematic promo site for a film, run from **Admin → Promo pages**. No code to change a word, a photo or a colour.

## The two parts

| | What it is | Where it lives | Deleting a page… |
|---|---|---|---|
| **Template** (the look) | Fight Night: giant title over a picture circle, the two sides face to face, countdown → reveal, pick-a-side vote, partners, Instagram, private partners page | `components/promo/*` (code) | …never touches it |
| **Page** (one film) | Every word, photo, colour, date, partner logo | Firestore `promo_pages/{slug}` + `entries` (votes & emails) | …removes only this |

## Addresses

- `cratetv.net/p/<slug>` — the page
- `cratetv.net/p/<slug>/partners` — the private partners page (not linked anywhere, search engines told to skip it)
- `<slug>.cratetv.net` and `<slug>.cratetv.net/partners` — same pages on their own address, **after the one-time setup below**

### One-time setup for `<slug>.cratetv.net`

1. Vercel → the CRATE project → Settings → Domains → add `*.cratetv.net`.
2. Vercel tells you which DNS record it needs. Wildcard domains need the domain's nameservers pointed at Vercel; if cratetv.net's DNS is somewhere else, Vercel shows the steps.
3. Done. Every new promo page gets its own address automatically.

Until then, `cratetv.net/p/<slug>` works with no setup.

## Who can edit

- Owner keys: everything.
- Team members: in **Team & permissions**, switch on **Promo pages** for them. They can then edit and upload for promo pages, and nothing else.

## Files

- `api/_lib/promoRules.ts` — page shape, The Champ example, colour sets, fonts, cleaning, addresses, vote counting (shared by server and browser)
- `api/promo-pages.ts` — admin: list / get / create / duplicate / save / publish / delete / entries / upload
- `api/promo.ts` — public: read a published page; sign up / vote (one entry per email, rate-limited)
- `components/promo/FightNightTemplate.tsx`, `PromoPartnersView.tsx`, `promoStyles.ts` — the template
- `components/promo/PromoPage.tsx` — the route
- `components/admin/PromoPagesTab.tsx` — the dashboard tab (with live preview)
- `tests/promoRules.test.ts`

## Adding a new template later

Add a value to `PromoTemplate`, a component in `components/promo/`, and a picker in the Look section. Pages keep their content; switching template only changes the look.
