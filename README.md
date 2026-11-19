[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Ktsumei/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Ktsumei/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Cover Coast — GTA-style cover maker

Turn any photo and a caption into GTA-style cover art: a multi-panel poster
with bold display lettering and a Vice City sunset or neon colour grade,
exported as a PNG to share. Everything runs offline in the browser — photos
never leave your machine.

## What it does

- **Multi-panel layouts** — hero + two, three columns, two panels, or a
  single hero photo. Switch layouts with one click.
- **Any photo** — load your own photos (file picker or drag & drop), or use
  the two bundled samples. Click a panel to select it, drag the photo to
  position it, use the zoom slider to crop it. One photo can fill every
  panel, or each panel can hold a different photo.
- **Caption lettering** — edit the bold display caption and the script
  subtitle, resize the caption. Lettering uses Anton and Pacifico, both
  shipped under the SIL Open Font License (see `app/fonts/`).
- **Colour grades** — Vice sunset, neon night, or clean, with a strength
  slider. Grades are painted as canvas gradients over each panel.
- **Export** — 1080 × 1080, 1080 × 1350, or 1920 × 1080 PNG, one click.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no network request.

## How it works

`app/src/cover.js` draws the whole poster on a 2D canvas — white poster
frame, panel tiles, cover-fit photos with pan and zoom, gradient grades,
caption lettering, vignette and grain. The same function paints the live
preview and the exported PNG, so what you see is what the file holds.
`app/src/layouts.js` defines the panel layouts, `app/src/grades.js` the
colour grades, `app/src/editor.js` wires the controls, and `app/src/shots.js`
provides reproducible `?shot=` scenes for screenshots.

## Screenshots

`?shot=cover` shows one exported cover alone; `?shot=editor` shows the
editor with a photo loaded. Both take `photo`, `caption`, `layout`,
`grade`, and `size` parameters.

## License

MIT — see `LICENSE`. Fonts under `app/fonts/` are licensed under the SIL
Open Font License, Version 1.1.
