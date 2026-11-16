# The Maker’s Last Echo

A standalone musical puzzle with a three-scene narrated prologue, four recorded stanzas, an interactive sampled piano, and a parchment answer dialog.

## Run locally

Requires Python 3 and Node.js. No dependency installation or build is needed.

```sh
npm start
```

Open http://127.0.0.1:8087/. Run `npm test` for the automated checks.

## Deployment

GitHub Pages serves the static files from the root of the `main` branch. `.nojekyll` disables Jekyll processing. All runtime imports and assets use relative URLs so the game works under its repository URL subdirectory.

## Configuration

`config.js` holds the scene settings, recording assignments, stanza endpoints, keyboard geometry, and project-specific storage keys. `assets/piano/samples.json` records the source and segment boundaries of the piano samples.

Saved progress is browser-local. The existing storage keys and save format are retained. Localhost progress does not automatically transfer to the public GitHub Pages origin.

Client-side answer validation is part of this puzzle, not a security boundary; someone inspecting the source can discover the solution.

## Pending features

Player-completion notifications and the entrance connection from Dragon Dungeon are not implemented. The game does not notify the owner on completion.

## Verification limits

Automated tests cover playback sequencing, retry handling, saved state, answer validation, piano sample mapping and mixing, atmosphere calculations, and prologue handoff. Physical phone audio, interruption behavior, and subjective musical matching should also be tested on the intended devices.

## Entrance-first loading

The supplied originals remain in `assets/`. Runtime image derivatives live in `assets/web/`; `image-assets.js` maps the original assignments to these smaller files. `scripts/optimize-images.py` regenerates them using macOS `sips` without changing the originals. No build step is required to deploy the committed files.

Arrival loads the cottage image first, activates its window lighting, decodes four 320-pixel knocker frames, then prepares the knock sound. Only then is the knocker enabled. The first workshop scene is prepared next. Later scenes and challenge images/audio load during narration; piano samples are deferred until the challenge is entered and download with two concurrent requests.

After knocking, the cottage fades to black. The first workshop is decoded before it is revealed; narration and the ten-second Skip Prologue window begin after that reveal. There is no loading message or skip control on the cottage. Actual failures expose a retry control.

A no-cache local test with a shared 4 Mbps limit completed the cottage image transfer in approximately 1.4 seconds and the entry assets in 2.3 seconds. These are controlled test observations, not a guarantee for every network or device. Test real mobile Safari and the final Dungeon portal separately.

The fourth prologue scene uses the supplied `prologue4.mp3` unchanged and a web derivative of `Finished Walnut Piano by the Fireside.png`, with restrained drifting dust. After its narration ends, the scene fades to black over two seconds; the first stanza screen fades in over two seconds, holds for one second, then starts playback. Reduced motion skips the fades.

A successful final-line submission keeps completion within the current visit, stops stanza/piano playback, and runs the two supplied epilogue recordings without changing the source files. The first plays while the completed parchment stays visible; its measured final audible decay at 11.34 seconds plus a 1.5-second pause triggers a two-second fade through black to the cottage doorway. The second starts after the image fades in. Its actual end fades to a black screen with white FauxAntique “The End” lettering. Interrupted or blocked narration offers a same-clip resume control. No notification service is connected. Completion is not saved: on a later visit, the final-line button is available again after entry/skip, while listening progress remains saved.
