# Crate TV Roku channel: plain-English guide

Last big update: October 2026 (version 2.2, the Netflix-style redesign).

This guide is for when you need to change or fix the Roku channel yourself.
Every file named here also has notes at the top explaining what it does.

---

## 1. Where everything lives

All of the channel's files are in the `roku/` folder of the website project.

| Folder / file | What it is |
|---|---|
| `roku/manifest` | Channel name, version number, icons, splash screen |
| `roku/source/main.brs` | Starts the channel, handles deep links (opening a film straight from Roku search or an ad) |
| `roku/source/Config.brs` | The web address the channel talks to (`https://cratetv.net/api`) |
| `roku/source/Theme.brs` | **Colours, sizes and fonts for the whole channel.** Start here for any look changes |
| `roku/source/utils.brs` | Shared helpers (saved watch position, account link, and so on) |
| `roku/components/` | Every screen. Each screen is two files: `Name.xml` (what's on screen and where) and `Name.brs` (what happens when buttons are pressed) |
| `roku/fonts/` | The Inter font (free, open licence, see `Inter-LICENSE.txt`) |
| `roku/images/ui/` | The fades, focus outline, buttons and progress bar pieces |
| `roku-archive/` | Old screens nobody uses any more. **Not** sent to Roku. Kept only for reference; see its README |

### The screens

| Screen | Files | What it is |
|---|---|---|
| Main | `MainScene.xml/.brs` | The "traffic controller": switches screens, handles Back, deep links and watch parties |
| Top menu | `Header.xml/.brs` | Logo, Home / Now Streaming / Public Square / Search / Account, the clock and the "Live" pill |
| Home | `HomeScene.xml/.brs` | The big billboard at the top and the rows of posters |
| Poster tile | `MoviePosterItem.xml/.brs` | One poster in a row: rounded corners, white focus outline, price pill, progress bar, Top 10 number |
| Film page | `TitleScene.xml/.brs` | Opens when you press OK on a poster: details, Play / Resume / Start over / Trailer, unlock QR code |
| Trailer preview | `TrailerPreview.xml/.brs` | The trailer that fades in behind the text on Home and the film page. Sound on/off: `mute` in the .xml |
| Screensaver | `CrateScreensaver.xml/.brs`, `source/ScreenSaver.brs` | Artwork slideshow when the TV is idle in Crate TV. Seconds per slide: `slideTimer` in the .xml |
| Actor page | `ActorDetailScene.xml/.brs` | Opened from Search: photo, bio and their films |
| Button | `CrateButton.xml/.brs` | The white/grey buttons on the film page |
| Player | `CrateVideoPlayer.xml/.brs` | Plays films; our own progress bar and pause screen; watch party sync |
| Other tabs | `SearchScene`, `NowStreamingScene`, `SquareScene`, `AccountScene`, `AccountLinkScene`, `WatchPartyScene` | All restyled in Oct 2026 to match Home. Each .xml starts with notes on its layout. (`ChatOverlay`, the watch-party chat, only got the new font.) |
| Behind the scenes | `ContentTask` (downloads the catalogue), `ChatTask`, `WatchPartyTask` | No visuals |

---

## 2. Common changes

**Change the red accent colour.** It appears in a few places as `#EF4444`.
Search the `roku/` folder for `EF4444` and replace it everywhere. The red
progress bar and price pills are images (`images/ui/bar_fill.9.png`,
`pill_red.9.png`), so those would need re-colouring too.

**Change a text size.** Find the label in the screen's `.xml` file. The size
is on the line below it, e.g. `<Font role="font" uri="pkg:/fonts/Inter-Bold.ttf" size="26" />`.
Change the number. Sizes are in pixels on a 1920×1080 screen.

**Change the poster size.** `TILE_W` / `TILE_H` near the top of
`HomeScene.brs`, plus `tileWidth` / `tileHeight` in `Theme.brs`. If you
change these, the focus outline image (`focus_ring_tile.png`, 228×335) and
corner mask (`tile_corner_mask.png`, 214×321) should be remade at the new size.

**Hide a row on Home.** In `HomeScene.brs`, inside `OnFeedLoaded`, find the
lines that skip `"__hero__"` and `"Public Domain Classics"`, and add your
row's exact title the same way.

**Change the "Unlock" card wording.** `TitleScene.xml`, the `unlockCard` group.

**Change how long before a trailer preview starts.** `previewTimer` in
`HomeScene.xml` (3 seconds) and `TitleScene.xml` (2.5 seconds).

**Series and episodes.** A film marked as a series in the admin, with
episodes added, shows an episode list on its Roku page automatically. Only
episodes uploaded as video files appear: YouTube/Vimeo links can't play on a
Roku (they still work on the website). The rule is `isRokuPlayable` in
`api/roku-feed.ts`.

**Show the logo in the top menu again.** `Header.brs`: `m.SHOW_LOGO = true`.

**Change the channel artwork (logo).** All in `roku/images/`, named in `roku/manifest`:
`channel_logo_fhd.png` 540×405 (the tile on the Roku home screen), `channel_logo_hd.png` 290×218,
`channel_logo_sd.png` 246×140, `channel_logo_side_fhd.png` 240×180, `splash_fhd.png` 1920×1080,
`splash_hd.png` 1280×720, `splash_sd.png` 720×480, and `crate_logo_small.png` (shown 150×51 on the
link and watch party screens). Keep the exact sizes. `splash_color` in the manifest is the colour
behind the splash.

**Send to TV / reactions / voting / end card (Oct 2026).** Each is explained at
the top of its file: `MainScene.brs` (end of file, Send to TV),
`ChatOverlay.xml` (reactions), `WatchPartyScene.brs` (voting),
`CrateVideoPlayer.xml` (end card). Website side: `api/send-to-tv.ts`,
`api/get-chat-messages.ts`, `api/audience.ts` (tally), `components/SendToTvButton.tsx`.

**Films without a trailer.** Free or owned films preview a 1-minute clip from
the middle of the film automatically. To start earlier (fewer spoilers) or
change the length, edit the two numbers at the top of `source/Preview.brs`.

**Turn trailer sound off.** `TrailerPreview.xml`: change `mute` `value="false"` to `value="true"`.

**Change how long the player controls stay on screen.** `CrateVideoPlayer.xml`,
`<Timer id="controlsTimer" duration="4">` (seconds).

**Change how far Left/Right skips.** `SKIP_SECONDS` at the top of `CrateVideoPlayer.brs`.

---

## 3. How it fits together

1. `main.brs` starts the channel and opens `MainScene`.
2. `MainScene` shows the launch screen and asks `ContentTask` to download the
   catalogue from `cratetv.net/api/roku-feed`.
3. When it arrives, `MainScene` opens `HomeScene` and shows the top menu.
4. Pressing OK on a poster opens `TitleScene` (the film page).
5. Pressing Play there tells `MainScene`, which opens `CrateVideoPlayer`
   (or the watch party lobby, if the film has a live watch party).
6. **Back** always goes back one screen. `MainScene` keeps a list
   (`sceneStack`) of where you've been.

**Deep links** (Roku search, ads) skip the film page and start playing
straight away. Roku requires that.

**Films you haven't bought** never play. The film page shows the trailer
button and a QR code that opens the film's page on cratetv.net. The viewer
must buy with the same Crate account their Roku is linked to (Account tab).
While the film page is open, the Roku re-checks every 15 seconds and
switches to Play as soon as the purchase goes through. Otherwise it's
unlocked the next time the channel opens. (The catalogue, `api/roku-feed`,
tells the channel what each linked account owns.)

---

## 4. Trying a change on your own TV (sideloading)

You only need to do the first part once.

**One-time setup: turn on Developer Mode on your Roku**
1. On the Roku remote press: **Home ×3, Up ×2, Right, Left, Right, Left, Right**.
2. Write down the IP address it shows (something like `192.168.1.23`).
3. Accept the agreement, choose a password, and let the Roku restart.

**Install the channel on your TV**
1. Get the channel zip. Either:
   - use the zip I send with an update, or
   - in the Crate admin, open the Roku tab and click **Download Roku Source**.
2. On a computer on the same Wi-Fi, open a browser and go to `http://<the Roku's IP address>`.
3. Sign in with username `rokudev` and the password you chose.
4. Click **Upload**, pick the zip, click **Install with zip**.
5. The channel opens on the TV. This "dev" copy replaces itself each time you upload.

If something's wrong, the page shows an error. You can also see the
channel's messages live: on a Mac, open Terminal and type
`nc <Roku IP> 8085`.

---

## 5. Updating the public channel (what everyone sees)

Uploading to your own TV does **not** change it for viewers. To publish:

Artwork for the store listing is in the `roku-store/` folder:
- `roku-store-channel-poster-540x405.png` (or the `.jpg`): the **Channel poster** Roku asks for.
- HD/SD posters and a 1920×1080 splash, in case the form asks for them.
- **Screenshots** (up to 6, 1920×1080) must be real screens of the channel. Take them from your dev
  Roku: `http://<IP>` → **Utilities** → **Screenshot**, with the channel open on the screen you want.

1. Go to developer.roku.com → **Manage my channels** → Crate TV.
2. **Package Upload**: upload the same zip. Roku may ask for a "signed"
   package. That is made on your dev Roku at `http://<IP>` → **Packager**,
   using the same developer key as the existing channel. If you've never
   done this or lost the key, contact Roku developer support before
   uploading; a new key would make a separate channel.
3. Bump the version first: `roku/manifest`, `minor_version` (2.2 → 2.3 and so on).
4. Submit for certification. Roku reviews it, usually within a few days.

---

## 6. Checking the code before uploading (optional)

From the project folder in Terminal:

```
npx -y brighterscript@0.73.7 --rootDir roku --createPackage false --stagingDir /tmp/roku-check
```

If no red "error" lines appear, Roku will be able to read every file.

---

## 7. October 2026 redesign: what changed

- New Netflix-style Home: big billboard with the focused film's art, title,
  details and award; poster rows below; Top 10 row with large numbers.
- New film page (`TitleScene`) instead of playing straight away.
- Player has its own clean progress bar, pause screen and time remaining.
- Inter font everywhere.
- Fixed:
  - the logo image was missing;
  - the clock never updated;
  - videos were drawn 60 px too low;
  - Back after a film ended could skip a screen;
  - films you hadn't bought silently played the trailer;
  - Top 10 could remove films from their other rows;
  - the chat helper was missing its settings file.
- 19 screens no one used moved to `roku-archive/`.
- Trailer previews on Home and the film page; locked films unlock on the page once paid; Public Square crash fixed.
