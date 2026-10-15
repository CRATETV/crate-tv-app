# Roku archive (not part of the channel)

These Roku components were in `roku/components/` but nothing in the channel used them.
They were moved here in October 2026 so the live channel is easier to read and
maintain. Nothing here is packaged or shipped: `api/generate-roku-zip.ts` only
packs the `roku/` folder.

If you ever need one back, move its `.xml` and `.brs` files into `roku/components/`.

| File | What it was |
| --- | --- |
| DetailsScene | An older film details screen (replaced by `TitleScene`) |
| VideoScene, VideoPlayerScene, VideoPlayer | Older video players (replaced by `CrateVideoPlayer`) |
| FestivalScene, PublicSquareScene, ErrorScene | Older screens never opened by `MainScene` |
| HeroItem, PosterItem, MoviePoster, RankedMoviePoster, RankedPosterItem, CategoryRow, ActionItem | Older poster/row parts (replaced by `MoviePosterItem`) |
| StandardPoster (Oct 2026) | Public Square's old tile; it borrowed MoviePosterItem.brs and crashed after the redesign. Public Square now uses `MoviePosterItem` |
| Router, StoreTask, ActorSearchTask, tasks/ContentTask.brs | Unused helpers / an old copy of `ContentTask.brs` |

Several of these had syntax errors (StoreTask.xml, MoviePoster.xml) or called
functions that did not exist, which is another reason they were taken out.
