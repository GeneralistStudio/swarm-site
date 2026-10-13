// ---------------------------------------------------------------------------
// SOFT RIPPLE — what a click ("bug spray") looks like
// ---------------------------------------------------------------------------
// A click sends out one soft ring that blurs and bends whatever is behind it
// (the sky, the grass), the way a stone dropped in water bends the pond
// bottom. Idea borrowed from the globe on afterdarktour.nike.com, where the
// pointer warps the picture around it. (The grass reacting as you MOVE through
// it is a different effect — see grassWake.js.)
//
// How it's made (every layer sits UNDER the bugs, so they stay crisp):
//   • blur   — a CSS backdrop-filter, shown only inside the ring
//   • warp   — an SVG displacement filter pushing pixels in and out along the
//              ring. Chromium browsers only (Chrome, Edge…); elsewhere you get
//              blur + shading
//   • shine  — soft light/dark shading on the ring. Plain CSS gradients, so it
//              shows up in every browser (Safari included)
//
// To go back to the old thin red line, set RIPPLE_STYLE to 'line'.
// ---------------------------------------------------------------------------

// ---- DESIGN KNOBS ---------------------------------------------------------
// 'soft' = a blurred, bending ring (this file) · 'line' = the original thin red circle.
// To compare them without editing code, add ?ripple=line (or soft) to the page address,
// e.g. http://localhost:5173/swarm-site/?ripple=line
const RIPPLE_STYLES = ['soft', 'line'];
const fromAddress = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('ripple');
export const RIPPLE_STYLE = RIPPLE_STYLES.includes(fromAddress) ? fromAddress : 'soft';
const RIPPLE_DURATION = 1500; // ms from click to gone
const RIPPLE_SIZE = 1.15; // how far it spreads, as a multiple of the spray radius
const RIPPLE_RING_WIDTH = 0.16; // how thick the ring is, as a share of its radius (0.08 = thin line … 0.25 = wide band)
const RIPPLE_BLUR = 5; // px — how much it blurs what's behind (0 = none)
const RIPPLE_WARP = 90; // px — how far it shoves what's behind at most (0 = no bending)
const RIPPLE_SHINE = 0.5; // 0 – 1 — strength of the soft light/dark shading
const RIPPLE_SHINE_BLUR = 4; // px — how much the shading itself is softened
const RIPPLE_SLOTS = 4; // most rings on screen at once (rapid clicks reuse the oldest)
// ---------------------------------------------------------------------------

// Can this browser bend what's behind an element with an SVG filter
// (backdrop-filter: url(#…))? Only Chromium-based ones (Chrome, Edge, Brave,
// Opera). Don't ask the browser: Safari accepts that CSS as valid and then
// quietly draws nothing, so "did the style stick?" says yes when the answer is
// no. Everyone else gets the blur + shading, which is plain CSS.
export const CAN_BEND_BACKDROP = typeof navigator !== 'undefined' && /\bChrome\//.test(navigator.userAgent);

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAP_SIZE = 192; // resolution of the bend map (it gets stretched to fit)
const GRADIENT_STOPS = 48;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// The ring. In the ripple's own coordinates d = 0 is the centre and d = 1 the
// edge of its box; the one ring sits RING_AT of the way out, soft on both sides.
const RING_AT = 0.7;
const ringPos = (d) => (d - RING_AT) / RIPPLE_RING_WIDTH;
// nothing at the very edge, so the ring never ends in a hard cut
const envelope = (d) => 1 - smoothstep(0.88, 1, d);
// the wave itself: slope of the water surface (what bends the light) — one way
// on the inside of the ring, the other way on the outside, flat on the crest
const slope = (d) => {
  const u = ringPos(d);
  return -2.33 * u * Math.exp(-u * u);
};
// 0–1 height of the wave (1 on the crest) — where the blur is strongest
const crest = (d) => Math.exp(-(ringPos(d) ** 2));

// Picture whose red/green channels say "move this pixel left/right, up/down":
// grey = stay put, brighter red = push right, brighter green = push down.
// Pushes outward on one side of every wave and inward on the other.
function makeBendMap() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = MAP_SIZE;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(MAP_SIZE, MAP_SIZE);
  for (let py = 0; py < MAP_SIZE; py++) {
    for (let px = 0; px < MAP_SIZE; px++) {
      const x = ((px + 0.5) / MAP_SIZE) * 2 - 1;
      const y = ((py + 0.5) / MAP_SIZE) * 2 - 1;
      const d = Math.hypot(x, y);
      const push = d < 1e-4 ? 0 : envelope(d) * slope(d);
      const i = (py * MAP_SIZE + px) * 4;
      img.data[i] = 128 + 127 * (x / (d || 1)) * push;
      img.data[i + 1] = 128 + 127 * (y / (d || 1)) * push;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// A radial-gradient() whose color/alpha follow `colorAt(d)` from centre to edge.
function radialGradient(colorAt) {
  const stops = [];
  for (let i = 0; i <= GRADIENT_STOPS; i++) {
    const d = i / GRADIENT_STOPS;
    stops.push(`${colorAt(d)} ${(d * 100).toFixed(1)}%`);
  }
  return `radial-gradient(closest-side, ${stops.join(', ')})`;
}

const maskGradient = () => radialGradient((d) => `rgba(0,0,0,${(envelope(d) * crest(d)).toFixed(3)})`);
const shineGradient = () =>
  radialGradient((d) => {
    const s = envelope(d) * slope(d);
    return s >= 0
      ? `rgba(255,255,255,${(RIPPLE_SHINE * s).toFixed(3)})` // the lit side of a wave…
      : `rgba(40,36,52,${(RIPPLE_SHINE * 0.4 * -s).toFixed(3)})`; // …and a faint shadow on the other
  });

let nextId = 0;

// Makes the pool of rings inside `container` (an absolutely-positioned div that
// fills the scene, sits above the sky/grass and below the bug canvas).
// Returns { spawn(x, y, radius), update(now), dispose() }.
export function createRippleLayer(container) {
  const mask = maskGradient();
  const shine = shineGradient();

  const slots = [];
  let bendMapUrl = null;
  let disposed = false;
  makeBendMap().toBlob((blob) => {
    if (!blob || disposed) return;
    bendMapUrl = URL.createObjectURL(blob);
    for (const slot of slots) slot.map.setAttribute('href', bendMapUrl);
  });

  for (let i = 0; i < RIPPLE_SLOTS; i++) {
    const id = `swarm-ripple-bend-${nextId++}`;

    const root = document.createElement('div');
    root.className = 'swarm-ripple';
    root.style.display = 'none';

    // the SVG filter that does the bending (lives inside this ripple so each
    // one can fade its own strength)
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML =
      `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">` +
      '<feImage preserveAspectRatio="none" result="bend"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="bend" scale="0" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>';
    const map = svg.querySelector('feImage');
    const displace = svg.querySelector('feDisplacementMap');
    if (bendMapUrl) map.setAttribute('href', bendMapUrl);

    const warp = document.createElement('div');
    warp.className = 'swarm-ripple__warp';
    warp.style.maskImage = mask;
    warp.style.webkitMaskImage = mask;
    // bend + blur where the browser can bend; everywhere else blur only (Safari
    // still wants the -webkit- name for it)
    const canBend = RIPPLE_WARP > 0 && CAN_BEND_BACKDROP;
    warp.style.backdropFilter = canBend ? `url(#${id}) blur(${RIPPLE_BLUR}px)` : `blur(${RIPPLE_BLUR}px)`;
    if (!canBend) warp.style.webkitBackdropFilter = `blur(${RIPPLE_BLUR}px)`;

    const light = document.createElement('div');
    light.className = 'swarm-ripple__shine';
    light.style.background = shine;
    light.style.filter = `blur(${RIPPLE_SHINE_BLUR}px)`;

    root.append(svg, warp, light);
    container.append(root);
    slots.push({ root, warp, light, map, displace, canBend, active: false, x: 0, y: 0, radius: 0, start: 0 });
  }

  // a ring starting at (x, y); `radius` is the spray radius
  function spawn(x, y, radius) {
    // reuse a free slot, or take over the oldest one
    const slot = slots.find((s) => !s.active) ?? slots.reduce((a, b) => (a.start <= b.start ? a : b));
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.radius = radius * RIPPLE_SIZE;
    slot.start = performance.now();
    slot.root.style.display = '';
  }

  function update(now) {
    for (const s of slots) {
      if (!s.active) continue;
      const t = (now - s.start) / RIPPLE_DURATION;
      if (t >= 1) {
        s.active = false;
        s.root.style.display = 'none';
        continue;
      }
      const grow = 1 - Math.pow(1 - t, 3); // quick burst, then it drifts out
      const r = Math.max(2, s.radius * grow);
      const fade = smoothstep(0, 0.08, t) * Math.pow(1 - t, 1.1);

      const st = s.root.style;
      st.left = `${s.x - r}px`;
      st.top = `${s.y - r}px`;
      st.width = st.height = `${r * 2}px`;
      s.warp.style.opacity = fade.toFixed(3);
      s.light.style.opacity = fade.toFixed(3);
      if (s.canBend) s.displace.setAttribute('scale', (RIPPLE_WARP * grow * fade).toFixed(2));
    }
  }

  function dispose() {
    disposed = true;
    if (bendMapUrl) URL.revokeObjectURL(bendMapUrl);
    for (const s of slots) s.root.remove();
  }

  return { spawn, update, dispose };
}
