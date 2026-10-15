# CRATE logo: which file goes where

All logo files are in `public/` (served at `https://cratetv.net/<file>`). Colours: background `#0B0B0D`,
corner brackets in a gradient (orange `#FF9A3C` → pink `#FF3B5C` → magenta `#D63BD9` → violet `#7B4DFF` → green `#1FCB7A`).

| Need | File |
|---|---|
| Logo on a dark page, wide spot (header, sign-in, small) | `logo-mark.svg` (no tagline, cropped tight) |
| Same, on a white/light page | `logo-mark-light.svg` |
| Logo with "Television powered by creatives", dark page | `logo-wordmark-tight.svg` (cropped) or `logo-wordmark.svg` (with breathing room) |
| Same, light page | `logo-wordmark-tight-light.svg`, `logo-wordmark-light.svg` |
| Square "C" crest (app icon, avatars, small square spots) | `logo-crest.svg`, `logo-crest-512.png` |
| PNG versions (for things that can't use SVG) | `logo-wordmark.png`, `logo-wordmark-no-tagline.png` |
| Emails, dark header | `email-logo-on-dark.png` (`LOGO_URL_ON_DARK` in `api/_lib/emailBranding.ts`) |
| Emails, white background | `email-logo-on-light.png` (`LOGO_URL`) |
| Link preview when the site is shared | `og-image.png` (1200×630) |
| Browser tab, phone home screen | `favicon.*`, `favicon-*.png`, `apple-touch-icon.png`, `android-chrome-*.png`, listed in `index.html` and `public/manifest.json` |

Rules:
- Don't add CSS `invert` or `brightness-0` filters to the logo. Pick the dark or light file instead; the filters wipe out the gradient.
- When you replace an icon file, bump `?v=9` → `?v=10` in `index.html` and `public/manifest.json` so browsers fetch the new one.
- Roku artwork: `docs/ROKU-GUIDE.md` ("Change the channel artwork"). Roku store artwork: `roku-store/`.
