import { hexToRgb, SKY_STOPS } from '../../hooks/useTimeOfDay';

// ---------------------------------------------------------------------------
// BUG CONTRAST — which grey makes the mosquitoes stand out most, right now
// ---------------------------------------------------------------------------
// The bug canvas blends in "difference" mode, which paints a bug as
// |bug color − what's behind it|, channel by channel. For a grey bug of level g
// on a sky of level B that's |g − B|, so how far the bug stands out from the
// sky is | |g − B| − B |.
//
//   • White (g = 255) shows as 255 − B: bright on a dark sky, dark on a light
//     one. Excellent at night and in full day…
//   • …but at dawn and dusk the sky is mid-grey (B ≈ 127), 255 − B ≈ B, and the
//     bug all but disappears.
//   • A grey close to the sky's own level shows as nearly black (|g − B| ≈ 0):
//     the bug is a dark mark on the sky, however light the sky is.
//
// So this picks, for the sky as it looks right now, the grey whose WORST spot
// across the whole sky gradient stands out best. In practice: white at night,
// a dark-showing grey through dawn and dusk (sliding with the sky's
// brightness), and a pale grey by day that also shows near-black.
// ---------------------------------------------------------------------------

const lerp = (a, b, t) => a + (b - a) * t;

// the sky's colour at a height (0 = top, 1 = bottom) — same stops as the CSS gradient
function skyAt(colors, y) {
  for (let i = 1; i < SKY_STOPS.length; i++) {
    const stop = SKY_STOPS[i] / 100;
    if (y <= stop) {
      const from = SKY_STOPS[i - 1] / 100;
      const t = (y - from) / (stop - from);
      const a = hexToRgb(colors[i - 1]);
      const b = hexToRgb(colors[i]);
      return a.map((v, k) => lerp(v, b[k], t));
    }
  }
  return hexToRgb(colors[colors.length - 1]);
}

// how far a grey bug of level g stands out from a backdrop colour, averaged over its channels
const standout = (g, backdrop) => backdrop.reduce((sum, channel) => sum + Math.abs(Math.abs(g - channel) - channel), 0) / 3;

// Only the part of the sky that's actually visible above the grass (the grass
// covers roughly the bottom third) is considered.
const SKY_VISIBLE = 0.7;
const SAMPLES = 24;
const PREFER_WHITE_MARGIN = 2; // stay with plain white unless another grey beats it by this much

// `colors` = the sky's five colors for the hour (gradientForHour in useTimeOfDay.js).
// Returns a grey level, 0–255.
export function bestBugGrey(colors) {
  const samples = Array.from({ length: SAMPLES }, (_, i) => skyAt(colors, (i / (SAMPLES - 1)) * SKY_VISIBLE));
  const worstSpot = (g) => Math.min(...samples.map((backdrop) => standout(g, backdrop)));

  let best = { g: 255, worst: worstSpot(255) };
  for (let g = 0; g < 255; g += 5) {
    const worst = worstSpot(g);
    if (worst > best.worst + PREFER_WHITE_MARGIN) best = { g, worst };
  }
  return best.g;
}

// '#rrggbb' for a grey level
export function greyHex(g) {
  const v = Math.max(0, Math.min(255, Math.round(g))).toString(16).padStart(2, '0');
  return `#${v}${v}${v}`;
}

// How bright the visible sky is right now, 0 (black) – 255 (white): its average
// luminance. Used to decide when things drawn ON TOP of the sky (like the yellow
// highlight on diseased bugs) need the "pale sky" look rather than the "dark sky" one.
export function skyBrightness(colors) {
  let total = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const [r, g, b] = skyAt(colors, (i / (SAMPLES - 1)) * SKY_VISIBLE);
    total += 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return total / SAMPLES;
}
