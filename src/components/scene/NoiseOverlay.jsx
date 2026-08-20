import './NoiseOverlay.css';

// Distinct feTurbulence seeds — each renders its own independent RGBA grain
// pattern (raw turbulence output, no color matrix collapsing it to
// grayscale, so it reads as multi-color static rather than plain film grain).
const SEEDS = [2, 37, 91, 14, 68, 53];

function noiseDataUri(seed) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">` +
    `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}" stitchTiles="stitch"/></filter>` +
    `<rect width="100%" height="100%" filter="url(#n)"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// Stepping through distinct background-image values in one @keyframes rule
// doesn't reliably discrete-animate in practice, so instead: N stacked,
// identically-positioned frames, each with its own seed and its own
// opacity-only keyframes. Only one is opacity:1 at any instant (round-robin);
// declaring both the "just turned on" and "about to turn off" values at the
// *same* percentage (a zero-width segment) forces a hard cut instead of a
// crossfade, with no need for step timing functions.
function buildKeyframes() {
  const n = SEEDS.length;
  return SEEDS.map((_, i) => {
    const start = (i / n) * 100;
    const end = ((i + 1) / n) * 100;
    const pts = [];
    if (start > 0) pts.push(`0% { opacity: 0; }`, `${start.toFixed(3)}% { opacity: 0; }`);
    pts.push(`${start.toFixed(3)}% { opacity: 1; }`);
    if (end < 100) {
      pts.push(`${end.toFixed(3)}% { opacity: 1; }`, `${end.toFixed(3)}% { opacity: 0; }`, `100% { opacity: 0; }`);
    } else {
      pts.push(`100% { opacity: 1; }`);
    }
    return `@keyframes noise-frame-${i} { ${pts.join(' ')} }`;
  }).join('\n');
}

const KEYFRAMES_CSS = buildKeyframes();
const DURATION_S = 0.6;

export default function NoiseOverlay() {
  return (
    <>
      <style>{KEYFRAMES_CSS}</style>
      <div className="noise-overlay" aria-hidden="true">
        {SEEDS.map((seed, i) => (
          <div
            key={seed}
            className="noise-frame"
            style={{
              backgroundImage: noiseDataUri(seed),
              animationName: `noise-frame-${i}`,
              animationDuration: `${DURATION_S}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}
