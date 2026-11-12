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
