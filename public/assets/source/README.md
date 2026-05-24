# Source art pipeline

This folder contains the one-file-per-asset source PNGs for the game art.

The game still loads packed runtime sheets where Phaser benefits from them:

- `../terrain.png` is packed from `tiles/*.png`.
- `../crops.png` is packed from `crops/*.png`.
- `../icons.png` is packed from `icons/*.png`.
- Object sprites are mirrored from `objects/*.png` to `../*.png`.

To move toward a richer farming RPG pixel-art look, replace the PNGs in this
folder with hand-painted or generated assets that keep the same dimensions and
names, then run:

```bash
npm run gen
```

Current dimensions:

- tiles: 32x32
- crops: 16x16
- icons: 16x16
- character sheets: 48x96, frames are 16x24
- trees: 48x64

Style target:

- saturated warm paths and soil
- high-contrast leafy greens
- clean dark outlines
- layered tree canopies
- dense crop silhouettes
- bright water highlights
- crisp pixel edges with no blur
