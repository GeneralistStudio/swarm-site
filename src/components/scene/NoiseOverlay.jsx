import { memo } from 'react';
import './NoiseOverlay.css';

// Film grain over the whole scene: a tile of colored noise (an SVG
// feTurbulence image — raw turbulence output, no color matrix collapsing it to
// grayscale, so it reads as multi-color static rather than plain film grain)
// that "flickers" ten times a second.
//
// The flicker used to be SIX separate full-screen layers, each with its own
// noise seed, hard-cutting between each other. Every one of those was a
// screen-sized texture on the graphics card (six screens' worth of memory,
// more on a big display) and six images to render. Now it's ONE layer, bigger
// than the screen by one tile on every side, that jumps between six different
// positions (see NoiseOverlay.css) — the same noise, shifted, which to the eye
// is the same shimmering grain. One texture, and moving it costs the graphics
// card almost nothing.
const SEED = 2;
const NOISE_TILE_PX = 150;

const noiseTile = (() => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${NOISE_TILE_PX}" height="${NOISE_TILE_PX}">` +
    `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${SEED}" stitchTiles="stitch"/></filter>` +
    `<rect width="100%" height="100%" filter="url(#n)"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

// memo: nothing in here ever changes, so don't rebuild it when the app does
export default memo(function NoiseOverlay() {
  return (
    <div className="noise-overlay" aria-hidden="true">
      <div className="noise-frame" style={{ backgroundImage: noiseTile }} />
    </div>
  );
});
