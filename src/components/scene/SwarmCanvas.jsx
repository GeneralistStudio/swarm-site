import { useEffect, useRef, useState } from 'react';
import mosquito1Url from '../../assets/mosquito1.svg';
import mosquito2Url from '../../assets/mosquito2.svg';
import mosquito3Url from '../../assets/mosquito3.svg';
import tick1Url from '../../assets/tick1.svg';
import tick2Url from '../../assets/tick2.svg';
import tick3Url from '../../assets/tick3.svg';
import BugTooltip from './BugTooltip';
import { RIPPLE_STYLE, createRippleLayer } from './softRipple';
import { createGrassWake } from './grassWake';
import { getRegionalDiseases, rollCarriedDiseases, summarizeBugs } from '../../data/diseaseData';
import { brandYellow } from '../../theme';
import { gradientForHour, hexToRgb } from '../../hooks/useTimeOfDay';
import { bestBugGrey, greyHex, skyBrightness } from './bugContrast';
import './SwarmCanvas.css';

const MOSQUITO_URLS = [mosquito1Url, mosquito2Url, mosquito3Url];
const FLAP_FRAME_MS = 90; // how long each of the 3 wing frames holds

const TICK_URLS = [tick1Url, tick2Url, tick3Url];
const TICK_FRAME_MS = 220; // slower cycle — legs crawling, not wings flapping
const TICK_GRAVITY = 0.45; // per-frame downward accel while a fleeing tick is airborne

// Look of the circle around the cursor. It only shows while the Data panel is
// open. The canvas blends in "difference" mode (see SwarmCanvas.css), so white
// always contrasts with whatever sky is behind it.
const RING_COLOR = '#ffffff';
const RING_OPACITY = 0.9; // 0 = invisible, 1 = solid
const RING_WIDTH = 0.75; // px

// Diseased bugs inside the circle glow yellow while the Data panel is open.
// They're drawn on their own layer on top of the bugs (the second canvas — see
// SwarmCanvas.css), NOT on the bug canvas, whose "difference" blend would turn
// yellow into its inverse (a dark blue smudge on a pale sky). So the yellow stays
// yellow, day or night. On a pale sky the site's own yellow (--yellow in
// src/index.css) is too close to the sky to see, so the look shifts with the sky:
//   dark sky   the site's yellow, as a glow and a yellow bug
//   pale sky   a deeper yellow, plus a thin dark outline so the bug stays crisp
const HIGHLIGHT_GLOW_SIZE = 2.8; // halo diameter, as a multiple of the bug's size
const HIGHLIGHT_GLOW_OPACITY = 0.65; // 0 = no halo, 1 = solid (dark sky)
const HIGHLIGHT_GLOW_OPACITY_PALE = 0.9; // the same, on a pale sky
const HIGHLIGHT_COLOR_PALE = '#ffc400'; // the yellow used on a pale sky
const HIGHLIGHT_OUTLINE_COLOR = '#1b1c1a'; // the thin outline around the bug on a pale sky
const HIGHLIGHT_OUTLINE_OPACITY = 0.9; // 0 = no outline
// how bright the sky has to be (0–255) before the "pale sky" look takes over
// completely; the look slides between the two across this range
const PALE_SKY_FROM = 110;
const PALE_SKY_TO = 190;

// MOSQUITO COLOR. The bug canvas blends in "difference" mode (see
// SwarmCanvas.css), which paints each bug as the INVERSE of whatever is behind
// it — so a white mosquito shows up white against a dark night sky and
// near-black against a pale daytime one, always as far from the background as
// it can get. (Any other color gets inverted too: a blue sprite looks orange by
// day and an orange one blue at night — which is what the old colors did.)
//
//   'auto'     white in the dark, dark in the light — and through dawn and dusk,
//              when the sky is mid-grey and plain white would all but vanish, a
//              grey picked from the sky's actual colors so the bugs always stand
//              out. (How: bugContrast.js.)
//   '#ffffff'  or any fixed color: the same bug color all day. Remember it comes
//              out inverted — '#ffffff' shows white-on-dark, black-on-light.
const BUG_COLOR = 'auto';
// how fast the bugs change shade when the sky calls for a different one, in
// milliseconds (about a third of a second is quick but not a flash)
const BUG_SHADE_EASE_MS = 350;
// A bug has three states, told apart by how solid they are (0 = invisible, 1 = solid)
const BUG_ALPHA = { wander: 0.75, swarm: 0.95, flee: 0.95 };

// Ticks still have a few shades of their own (shared, built once each — rather
// than a set of sprite canvases per bug, which made the page stutter).
const TICK_HUE_FROM = 12;
const TICK_HUE_SPAN = 18;
const TICK_HUE_STEPS = 4;

// the most bugs a moving mouse can spawn in a single frame (a fast flick would
// otherwise spawn a whole crowd at once); the rest follow over the next frames
const MAX_SPAWNS_PER_FRAME = 3;

// run something when the browser has nothing better to do
const whenIdle = (fn) =>
  typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200);

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Shared across every SwarmCanvas mount (intro<->main can remount this
// several times per session) so the SVGs only ever get decoded once.
const baseImagesPromise = Promise.all(MOSQUITO_URLS.map(loadImage));
const tickImagesPromise = Promise.all(TICK_URLS.map(loadImage));

// The source SVGs are plain white silhouettes (one per wingbeat frame) —
// tinting happens once per color here (source-in composite against a solid
// fill), not per bug per frame, so the render loop just blits a cached
// bitmap. Each bug's own wander-state hue gets its own tinted set at
// creation time; swarm/flee share one set each since those colors are fixed.
function tintFrames(images, color, size, dpr) {
  return images.map((img) => {
    const off = document.createElement('canvas');
    off.width = Math.ceil(size * dpr);
    off.height = Math.ceil(size * dpr);
    const octx = off.getContext('2d');
    octx.scale(dpr, dpr);
    const ratio = img.naturalWidth / img.naturalHeight;
    const dw = ratio >= 1 ? size : size * ratio;
    const dh = ratio >= 1 ? size / ratio : size;
    octx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
    octx.globalCompositeOperation = 'source-in';
    octx.fillStyle = color;
    octx.fillRect(0, 0, size, size);
    return off;
  });
}

// Direct port of the physics/render loop from swarm-prototype.html.
// The tweak panel is gone (config now comes from useSwarmConfig, driven by
// location data) but the simulation itself — wander / capture / swarm /
// flee state machine — is unchanged so the feel stays identical.
export default function SwarmCanvas({ config, location, infoOpen, hour }) {
  const canvasRef = useRef(null);
  const highlightRef = useRef(null); // the second canvas: yellow highlights, drawn without inverting
  const rippleLayerRef = useRef(null);
  const wakeLayerRef = useRef(null);
  const configRef = useRef(config);
  configRef.current = config;

  // Data panel open? -> show the circle + the info tooltip
  const infoRef = useRef(infoOpen);
  infoRef.current = infoOpen;

  // what time it is at this place — decides which shade the bugs are drawn in
  const hourRef = useRef(hour);
  hourRef.current = hour;

  // which diseases are circulating at this location (see data/diseaseData.js)
  const regionalRef = useRef(null);
  if (regionalRef.current === null) regionalRef.current = getRegionalDiseases(location);

  const tooltipRef = useRef(null);
  const tipMetricsRef = useRef({ w: 230, h: 150, gap: 28, offsetY: -40 });
  const simRef = useRef(null); // lets the effects below reach into the simulation
  const [summary, setSummary] = useState(null); // what the tooltip is showing

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const highlightCanvas = highlightRef.current;
    const hctx = highlightCanvas.getContext('2d');
    let W, H, DPR;
    let raf;
    let running = true;
    let highlightOn = false; // is the highlight canvas showing (is anything lit)?
    // where the canvas sits on the page. Read once here (and on resize) —
    // asking the browser on every mouse event forces it to re-measure the whole
    // page each time, which is a classic cause of stutter
    let canvasLeft = 0;
    let canvasTop = 0;
    // where the strip of grass that reacts to the pointer sits, in this canvas's
    // pixels (the strip is a CSS box — see .swarm-wake in SwarmCanvas.css — so
    // measure it, rather than keeping a second copy of its height here)
    let wakeLeft = 0;
    let wakeTop = Infinity;

    // The highlight canvas is only as big as the screen while a bug is actually
    // lit; the rest of the time it's 1×1 pixel, so it isn't holding a screen-sized
    // picture in memory for nothing.
    function sizeHighlightCanvas() {
      const w = highlightOn ? Math.ceil(W * DPR) : 1;
      const h = highlightOn ? Math.ceil(H * DPR) : 1;
      if (highlightCanvas.width !== w || highlightCanvas.height !== h) {
        highlightCanvas.width = w;
        highlightCanvas.height = h;
      }
      highlightCanvas.style.width = W + 'px';
      highlightCanvas.style.height = H + 'px';
      hctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.parentElement.clientWidth;
      H = canvas.parentElement.clientHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      sizeHighlightCanvas();
      const rect = canvas.getBoundingClientRect();
      canvasLeft = rect.left;
      canvasTop = rect.top;
      const zone = wakeLayerRef.current.getBoundingClientRect();
      wakeLeft = zone.left - rect.left;
      wakeTop = zone.top - rect.top;
    }
    window.addEventListener('resize', resize);
    resize();

    // tinted lazily and cached: one set of frames per COLOR (so with the
    // default all-white colors, every mosquito shares a single set)
    let baseImages = null;
    const bugFrameSets = new Map();
    const FRAME_SIZE = configRef.current.bugSize * 3.4;
    baseImagesPromise.then((imgs) => {
      if (running) {
        baseImages = imgs;
        whenIdle(prebuildSprites);
      }
    });
    function bugFramesFor(color) {
      let set = bugFrameSets.get(color);
      if (!set) {
        set = tintFrames(baseImages, color, FRAME_SIZE, DPR);
        bugFrameSets.set(color, set);
      }
      return set;
    }
    // The shade the mosquitoes are drawn in right now. With BUG_COLOR = 'auto'
    // it follows the sky (see bugContrast.js): `targetGrey` is where it should
    // be, `shownGrey` eases there, and the shade used is snapped to steps of 10
    // so there's a small fixed set of sprite sets to build (once each).
    let targetGrey = 255;
    let shownGrey = 255;
    let targetPale = 0; // how pale the sky is, 0 (dark) – 1 (pale): which highlight look to use
    let shownPale = 0;
    let hourSeen = null;
    let bugColor = BUG_COLOR === 'auto' ? greyHex(255) : BUG_COLOR;
    function updateBugColor(dtMs) {
      const hourNow = hourRef.current;
      if (hourNow !== hourSeen) {
        const first = hourSeen === null;
        hourSeen = hourNow;
        const sky = gradientForHour(hourNow);
        targetGrey = bestBugGrey(sky);
        const brightness = skyBrightness(sky);
        const t = Math.min(1, Math.max(0, (brightness - PALE_SKY_FROM) / (PALE_SKY_TO - PALE_SKY_FROM)));
        targetPale = t * t * (3 - 2 * t);
        if (first) {
          // starting up: no sliding in from the defaults
          shownGrey = targetGrey;
          shownPale = targetPale;
        }
      }
      const ease = 1 - Math.exp(-dtMs / BUG_SHADE_EASE_MS);
      if (shownGrey !== targetGrey) {
        shownGrey += (targetGrey - shownGrey) * ease;
        if (Math.abs(targetGrey - shownGrey) < 1) shownGrey = targetGrey;
      }
      if (shownPale !== targetPale) {
        shownPale += (targetPale - shownPale) * ease;
        if (Math.abs(targetPale - shownPale) < 0.01) shownPale = targetPale;
      }
      if (BUG_COLOR === 'auto') bugColor = greyHex(shownGrey >= 250 ? 255 : Math.round(shownGrey / 10) * 10);
    }
    function ensureBugFrames() {
      if (!baseImages) return null;
      return bugFramesFor(bugColor);
    }

    // ticks: wander color varies per-tick (a narrow brown/red hue range,
    // like mosquitoes' wander hue); attached is one shared, fixed color.
    let tickBaseImages = null;
    let tickAttachedFrames = null;
    const TICK_SIZE = configRef.current.tickSize * 3.4;
    const tickWanderFrames = []; // one shared set per shade — see TICK_HUE_STEPS
    tickImagesPromise.then((imgs) => {
      if (running) {
        tickBaseImages = imgs;
        whenIdle(prebuildSprites);
      }
    });
    function ensureTickFrames(t) {
      if (!tickBaseImages) return null;
      if (t.state === 'attached') {
        if (!tickAttachedFrames) tickAttachedFrames = tintFrames(tickBaseImages, '#8b1a1a', TICK_SIZE, DPR);
        return tickAttachedFrames;
      }
      if (!tickWanderFrames[t.hueStep]) {
        const hue = TICK_HUE_FROM + ((t.hueStep + 0.5) / TICK_HUE_STEPS) * TICK_HUE_SPAN;
        tickWanderFrames[t.hueStep] = tintFrames(tickBaseImages, `hsl(${hue}, 45%, 32%)`, TICK_SIZE, DPR);
      }
      return tickWanderFrames[t.hueStep];
    }
    // The highlighted (diseased) look, built once and then just blitted. Two
    // "kits" — one for a dark sky, one for a pale one — each a tinted sprite set
    // per kind of bug plus a soft round halo; and a dark outline set for the
    // pale-sky look.
    let kits = null; // { dark, pale, outline } — see makeKit / below
    function haloSprite(rgbString) {
      const size = 64;
      const halo = document.createElement('canvas');
      halo.width = halo.height = Math.ceil(size * DPR);
      const g = halo.getContext('2d');
      g.scale(DPR, DPR);
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, `rgba(${rgbString}, 1)`);
      grad.addColorStop(0.4, `rgba(${rgbString}, 0.45)`);
      grad.addColorStop(1, `rgba(${rgbString}, 0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      return halo;
    }
    function ensureHighlight() {
      if (!baseImages || !tickBaseImages) return false;
      if (kits) return true;
      const brand = brandYellow();
      const pale = hexToRgb(HIGHLIGHT_COLOR_PALE).join(', ');
      kits = {
        dark: {
          bug: tintFrames(baseImages, brand.hex, FRAME_SIZE, DPR),
          tick: tintFrames(tickBaseImages, brand.hex, TICK_SIZE, DPR),
          halo: haloSprite(brand.rgbString),
        },
        pale: {
          bug: tintFrames(baseImages, HIGHLIGHT_COLOR_PALE, FRAME_SIZE, DPR),
          tick: tintFrames(tickBaseImages, HIGHLIGHT_COLOR_PALE, TICK_SIZE, DPR),
          halo: haloSprite(pale),
        },
        outline: {
          bug: tintFrames(baseImages, HIGHLIGHT_OUTLINE_COLOR, FRAME_SIZE, DPR),
          tick: tintFrames(tickBaseImages, HIGHLIGHT_OUTLINE_COLOR, TICK_SIZE, DPR),
        },
      };
      return true;
    }
    // Build every sprite set up front, in idle time, so nothing is created
    // later while the mouse is moving (the sets are small and shared)
    function prebuildSprites() {
      if (!running) return;
      if (baseImages) {
        if (BUG_COLOR === 'auto') for (let g = 0; g < 255; g += 10) bugFramesFor(greyHex(g));
        bugFramesFor(BUG_COLOR === 'auto' ? greyHex(255) : BUG_COLOR);
      }
      if (tickBaseImages) {
        for (let i = 0; i < TICK_HUE_STEPS; i++) ensureTickFrames({ state: 'wander', hueStep: i });
        ensureTickFrames({ state: 'attached' });
      }
      ensureHighlight();
    }
    function grassBandTop() {
      return H * (1 - configRef.current.grassBandFraction);
    }

    const cursor = { x: W / 2, y: H / 2, active: false, overUI: false };
    let distSinceSpawn = 0;
    let prevCursorX = cursor.x, prevCursorY = cursor.y;
    let cursorSpeed = 0;

    // overUI: the pointer is over the menu / Data panel — the circle and
    // tooltip hide there so they don't float under the glass panels
    function onMove(x, y, overUI = false) {
      const dx = x - cursor.x, dy = y - cursor.y;
      distSinceSpawn += Math.hypot(dx, dy);
      cursor.x = x;
      cursor.y = y;
      cursor.active = true;
      cursor.overUI = overUI;
      stirGrass(x, y, overUI);
    }

    // Moving over the grass stirs it (see grassWake.js). Not over the menu / Data
    // panel, and not over the sky: the grass strip is the only place it exists.
    let overGrass = false;
    function stirGrass(x, y, overUI) {
      if (!wake) return;
      if (overUI || y < wakeTop) {
        if (overGrass) wake.release();
        overGrass = false;
        return;
      }
      overGrass = true;
      wake.stir(x - wakeLeft, y - wakeTop); // (in the strip's own pixels)
    }
    function toLocal(clientX, clientY) {
      return { x: clientX - canvasLeft, y: clientY - canvasTop };
    }
    const handleMouseMove = (e) => {
      const p = toLocal(e.clientX, e.clientY);
      onMove(p.x, p.y, !!e.target?.closest?.('[data-swarm-ignore]'));
    };
    const handleTouchMove = (e) => {
      if (e.touches[0]) {
        const p = toLocal(e.touches[0].clientX, e.touches[0].clientY);
        onMove(p.x, p.y, !!e.touches[0].target?.closest?.('[data-swarm-ignore]'));
      }
    };
    const handleMouseLeave = () => {
      cursor.active = false;
      if (overGrass) wake?.release();
      overGrass = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    let repelActive = false;
    let repelStartTime = 0;
    let repelRadius = 0;
    const ripples = []; // the thin-line style (RIPPLE_STYLE = 'line'): rings waiting to be drawn
    // the click ripple: 'soft' = a blurred, bending ring, 'line' = a thin red circle
    const softRipples = RIPPLE_STYLE === 'line' ? null : createRippleLayer(rippleLayerRef.current);
    // the grass reacting as you move through it
    const wake = createGrassWake(wakeLayerRef.current);

    function fleeFrom(b, x, y, strength) {
      const cfg = configRef.current;
      const dx = b.x - x, dy = b.y - y;
      const d = Math.hypot(dx, dy) || 0.001;
      const nx = dx / d, ny = dy / d;
      b.vx += nx * strength;
      b.vy += ny * strength;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > cfg.maxSpeedFlee) {
        b.vx = (b.vx / sp) * cfg.maxSpeedFlee;
        b.vy = (b.vy / sp) * cfg.maxSpeedFlee;
      }
      b.state = 'flee';
      b.fleeUntil = performance.now() + cfg.fleeRecoveryMs;
    }

    function tickFleeFrom(t, x, y, strength) {
      const cfg = configRef.current;
      const dx = t.x - x, dy = t.y - y;
      const d = Math.hypot(dx, dy) || 0.001;
      const nx = dx / d, ny = dy / d;
      t.vx += nx * strength;
      t.vy += ny * strength;
      const sp = Math.hypot(t.vx, t.vy);
      if (sp > cfg.maxSpeedFlee) {
        t.vx = (t.vx / sp) * cfg.maxSpeedFlee;
        t.vy = (t.vy / sp) * cfg.maxSpeedFlee;
      }
      t.state = 'flee';
      t.fleeUntil = performance.now() + cfg.fleeRecoveryMs;
    }

    function triggerRepel(x, y) {
      const cfg = configRef.current;
      repelActive = true;
      repelStartTime = performance.now();
      repelRadius = cfg.repelRadiusStart;
      if (softRipples) softRipples.spawn(x, y, cfg.repelRadiusStart);
      else ripples.push({ x, y, start: performance.now() });
      for (const b of bugs) {
        const dx = b.x - x, dy = b.y - y;
        const d = Math.hypot(dx, dy) || 0.001;
        if (d < cfg.repelRadiusStart) {
          const strength = cfg.repelForce * (1 - d / cfg.repelRadiusStart);
          fleeFrom(b, x, y, strength);
        }
      }
      // Ticks get the exact same directional kick, at the same max speed, as
      // mosquitoes — they just can't sustain flight, so gravity (applied in
      // updateTicks while airborne above the grass band) arcs them back down
      // instead of them fleeing indefinitely.
      for (const t of ticks) {
        const dx = t.x - x, dy = t.y - y;
        const d = Math.hypot(dx, dy) || 0.001;
        if (d < cfg.repelRadiusStart) {
          const strength = cfg.repelForce * (1 - d / cfg.repelRadiusStart);
          tickFleeFrom(t, x, y, strength);
        }
      }
    }

    const handleClick = (e) => {
      if (e.target.closest('[data-swarm-ignore]')) return;
      const p = toLocal(e.clientX, e.clientY);
      triggerRepel(p.x, p.y);
    };
    const handleTouchStart = (e) => {
      if (e.target.closest('[data-swarm-ignore]')) return;
      if (e.touches[0]) {
        const p = toLocal(e.touches[0].clientX, e.touches[0].clientY);
        triggerRepel(p.x, p.y);
      }
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    let idCounter = 0;
    function makeBug(x, y, state) {
      return {
        id: idCounter++,
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        state: state || 'wander',
        wanderAngle: Math.random() * Math.PI * 2,
        orbitAngle: 0,
        orbitRadius: 0,
        orbitDir: Math.random() < 0.5 ? -1 : 1,
        orbitSpeedMul: 0.7 + Math.random() * 0.6,
        wingPhase: Math.random() * 3, // desyncs the flap cycle per bug
        diseases: rollCarriedDiseases('mosquito', regionalRef.current),
        glow: 0, // 0–1, how highlighted it is right now (eased)
        retiring: false, // true = on its way off-screen because there are too many
        dead: false,
      };
    }
    function randomEdgePoint() {
      const side = Math.floor(Math.random() * 4);
      if (side === 0) return { x: Math.random() * W, y: -20 };
      if (side === 1) return { x: Math.random() * W, y: H + 20 };
      if (side === 2) return { x: -20, y: Math.random() * H };
      return { x: W + 20, y: Math.random() * H };
    }

    let bugs = [];
    function seed() {
      bugs = [];
      idCounter = 0;
      const cfg = configRef.current;
      for (let i = 0; i < cfg.seedBugs; i++) {
        bugs.push(makeBug(Math.random() * W, Math.random() * H, 'wander'));
      }
    }
    seed();

    // Ticks: confined to a band at the bottom of the canvas (the grass),
    // crawl much slower than mosquitoes, and "attach" instead of swarming —
    // once the cursor comes within tickAttachRadius, a tick picks a fixed
    // angle on that radius (the "inner circle") and rigidly tracks the
    // cursor there rather than continuously orbiting.
    let tickIdCounter = 0;
    function makeTick(x, y) {
      return {
        id: tickIdCounter++,
        x, y,
        vx: 0,
        vy: 0,
        state: 'wander',
        crawlAngle: Math.random() * Math.PI * 2,
        attachAngle: 0,
        fleeUntil: 0,
        hueStep: Math.floor(Math.random() * TICK_HUE_STEPS),
        wingPhase: Math.random() * 3,
        diseases: rollCarriedDiseases('tick', regionalRef.current),
        glow: 0,
        life: 1, // 0–1: fades in when it appears, fades out when it leaves
        retiring: false,
        dead: false,
      };
    }

    let ticks = [];
    function seedTicks() {
      ticks = [];
      tickIdCounter = 0;
      const cfg = configRef.current;
      const top = grassBandTop();
      for (let i = 0; i < cfg.seedTicks; i++) {
        ticks.push(makeTick(Math.random() * W, top + Math.random() * (H - top)));
      }
    }
    seedTicks();

    function updateTicks(now) {
      const cfg = configRef.current;
      const top = grassBandTop();

      for (const t of ticks) {
        // fade in when new, fade out (then disappear) when leaving
        if (t.retiring) {
          t.life -= 0.025;
          if (t.life <= 0) t.dead = true;
        } else if (t.life < 1) {
          t.life = Math.min(1, t.life + 0.03);
        }

        if (t.state === 'attached') {
          t.x = cursor.x + Math.cos(t.attachAngle) * cfg.tickAttachRadius;
          t.y = cursor.y + Math.sin(t.attachAngle) * cfg.tickAttachRadius;
          continue;
        }

        if (t.state === 'flee') {
          // horizontal: air resistance, same as a mosquito's flee decay.
          // vertical: while still above the grass, gravity keeps accelerating
          // it downward instead of letting drag kill all momentum — so a
          // tick repelled mid-air on the cursor arcs and falls back into the
          // grass, rather than just drifting to a stop wherever it was.
          t.vx *= cfg.fleeDamping;
          if (t.y < top) {
            t.vy = Math.min(t.vy + TICK_GRAVITY, cfg.maxSpeedFlee);
          } else {
            t.vy *= cfg.fleeDamping;
          }
          t.x += t.vx;
          t.y += t.vy;
          if (t.x < -10) t.x = W + 10;
          if (t.x > W + 10) t.x = -10;
          if (t.y > H - 4) t.y = H - 4;
          if (now > t.fleeUntil && t.y >= top) {
            t.state = 'wander';
            t.crawlAngle = Math.atan2(t.vy, t.vx);
          }
          continue;
        }

        if (cursor.active) {
          const d = Math.hypot(t.x - cursor.x, t.y - cursor.y);
          if (d < cfg.tickAttachRadius) {
            t.state = 'attached';
            t.retiring = false; // latched on — it's staying
            t.attachAngle = Math.atan2(t.y - cursor.y, t.x - cursor.x);
            continue;
          }
        }
        t.crawlAngle += (Math.random() - 0.5) * 0.3;
        t.vx = Math.cos(t.crawlAngle) * cfg.tickCrawlSpeed;
        t.vy = Math.sin(t.crawlAngle) * cfg.tickCrawlSpeed;
        t.x += t.vx;
        t.y += t.vy;
        if (t.x < -10) t.x = W + 10;
        if (t.x > W + 10) t.x = -10;
        if (t.y < top) {
          t.y = top;
          t.crawlAngle = -t.crawlAngle;
        }
        if (t.y > H - 4) {
          t.y = H - 4;
          t.crawlAngle = -t.crawlAngle;
        }
      }
    }

    // ---- population control -------------------------------------------------
    // The config says how many mosquitoes and ticks there should be right now
    // (it changes with the place, the year and the time of day). Every quarter
    // second, nudge the real numbers toward it: bring new ones in from the edges
    // (ticks fade in on the grass), or send a few wanderers off (mosquitoes fly
    // out of frame, ticks fade away). Bugs that are swarming you or latched on
    // are never taken, and waving the cursor can still pull extra mosquitoes
    // in above the target for a while.
    let lastPopulationAt = 0;
    function adjustPopulation(now) {
      if (now - lastPopulationAt < 250) return;
      lastPopulationAt = now;
      const cfg = configRef.current;

      let liveBugs = 0;
      for (const b of bugs) if (!b.retiring) liveBugs++;
      if (liveBugs < cfg.targetBugs) {
        const arrivals = Math.max(1, Math.ceil((cfg.targetBugs - liveBugs) * 0.12));
        for (let i = 0; i < arrivals; i++) {
          const p = randomEdgePoint();
          bugs.push(makeBug(p.x, p.y, 'wander'));
        }
      } else if (liveBugs > cfg.targetBugs * 1.1 + 1) {
        let leaving = Math.ceil((liveBugs - cfg.targetBugs) * 0.1);
        for (const b of bugs) {
          if (leaving <= 0) break;
          if (b.state === 'wander' && !b.retiring && Math.random() < 0.5) {
            b.retiring = true;
            leaving--;
          }
        }
      }

      let liveTicks = 0;
      for (const t of ticks) if (!t.retiring) liveTicks++;
      if (liveTicks < cfg.targetTicks) {
        const top = grassBandTop();
        const arrivals = Math.max(1, Math.ceil((cfg.targetTicks - liveTicks) * 0.12));
        for (let i = 0; i < arrivals; i++) {
          const t = makeTick(Math.random() * W, top + Math.random() * (H - top));
          t.life = 0;
          ticks.push(t);
        }
      } else if (liveTicks > cfg.targetTicks + 1) {
        let leaving = Math.ceil((liveTicks - cfg.targetTicks) * 0.1);
        for (const t of ticks) {
          if (leaving <= 0) break;
          if (t.state === 'wander' && !t.retiring && Math.random() < 0.5) {
            t.retiring = true;
            leaving--;
          }
        }
      }
    }

    function steerToward(bug, tx, ty, strength, maxSpeed) {
      const dx = tx - bug.x, dy = ty - bug.y;
      bug.vx += dx * strength;
      bug.vy += dy * strength;
      const sp = Math.hypot(bug.vx, bug.vy);
      if (sp > maxSpeed) {
        bug.vx = (bug.vx / sp) * maxSpeed;
        bug.vy = (bug.vy / sp) * maxSpeed;
      }
      bug.x += bug.vx;
      bug.y += bug.vy;
    }

    // ---- info tooltip ----------------------------------------------------
    // While the Data panel is open: every ~120ms, roll up whatever is in the
    // swarm circle (mosquitoes swarming + ticks attached) into a summary for
    // <BugTooltip>; every frame, show/hide it and keep it next to the circle.
    let lastSummaryAt = 0;
    let lastSignature = '';
    let hasCarriers = false;
    let lastRingRadius = -1;

    function updateTooltip(now) {
      const tip = tooltipRef.current;
      if (!tip) return;
      const cfg = configRef.current;

      if (!infoRef.current) {
        if (tip.dataset.visible === 'true') tip.dataset.visible = 'false';
        return;
      }

      if (now - lastSummaryAt > 120) {
        lastSummaryAt = now;
        const carriers = [];
        for (const b of bugs) if (b.state === 'swarm') carriers.push({ type: 'mosquito', diseases: b.diseases });
        for (const t of ticks) if (t.state === 'attached') carriers.push({ type: 'tick', diseases: t.diseases });
        const next = summarizeBugs(carriers);
        hasCarriers = next !== null;
        if (next) {
          const signature = `${next.types.join()}|${next.diseases.join()}|${next.level}`;
          if (signature !== lastSignature) {
            lastSignature = signature;
            setSummary(next);
          }
        }
      }

      const show = hasCarriers && cursor.active && !cursor.overUI;
      if ((tip.dataset.visible === 'true') !== show) tip.dataset.visible = show ? 'true' : 'false';
      if (!show) return;

      if (cfg.captureRadius !== lastRingRadius) {
        lastRingRadius = cfg.captureRadius;
        tip.style.setProperty('--ring-radius', `${cfg.captureRadius}px`);
      }

      // flip to the circle's left side near the right edge of the screen, and
      // nudge up/down so the card never runs off the top or bottom
      const m = tipMetricsRef.current;
      const side = cursor.x + cfg.captureRadius + m.gap + m.w > W - 8 ? 'left' : 'right';
      if (tip.dataset.side !== side) tip.dataset.side = side;
      const cardTop = cursor.y + m.offsetY;
      const shift = Math.min(Math.max(cardTop, 8), H - m.h - 8) - cardTop;
      tip.style.transform = `translate(${cursor.x}px, ${cursor.y + shift}px)`;
    }

    // new location -> its bugs carry that region's diseases instead
    function rerollDiseases() {
      for (const b of bugs) b.diseases = rollCarriedDiseases('mosquito', regionalRef.current);
      for (const t of ticks) t.diseases = rollCarriedDiseases('tick', regionalRef.current);
    }
    simRef.current = { rerollDiseases };

    function update() {
      const cfg = configRef.current;
      cursorSpeed = Math.hypot(cursor.x - prevCursorX, cursor.y - prevCursorY);
      prevCursorX = cursor.x;
      prevCursorY = cursor.y;

      adjustPopulation(performance.now());

      let spawned = 0;
      while (distSinceSpawn > cfg.spawnEveryPx && bugs.length < cfg.maxBugs && spawned < MAX_SPAWNS_PER_FRAME) {
        const p = randomEdgePoint();
        bugs.push(makeBug(p.x, p.y, 'wander'));
        distSinceSpawn -= cfg.spawnEveryPx;
        spawned++;
      }
      // (a huge flick shouldn't bank a crowd to spawn all at once later)
      distSinceSpawn = Math.min(distSinceSpawn, cfg.spawnEveryPx * MAX_SPAWNS_PER_FRAME);
      if (bugs.length >= cfg.maxBugs) distSinceSpawn = 0;

      if (repelActive) {
        const elapsed = performance.now() - repelStartTime;
        const t = Math.min(elapsed / cfg.repelDuration, 1);
        repelRadius = cfg.repelRadiusStart * (1 - t) * (1 - t);
        if (t >= 1) {
          repelActive = false;
          repelRadius = 0;
        } else {
          for (const b of bugs) {
            const dx = b.x - cursor.x, dy = b.y - cursor.y;
            const d = Math.hypot(dx, dy) || 0.001;
            if (d < repelRadius) {
              const push = (1 - d / repelRadius) * cfg.repelForce * 0.35;
              fleeFrom(b, cursor.x, cursor.y, push);
            }
          }
        }
      }

      if (cursorSpeed > cfg.detachSpeed) {
        for (const b of bugs) {
          if (b.state === 'swarm') fleeFrom(b, cursor.x, cursor.y, cfg.detachKick);
        }
      }

      for (const b of bugs) {
        if (b.state === 'flee') {
          b.vx *= cfg.fleeDamping;
          b.vy *= cfg.fleeDamping;
          b.x += b.vx;
          b.y += b.vy;
          if (b.x < -30) b.x = W + 30;
          if (b.x > W + 30) b.x = -30;
          if (b.y < -30) b.y = H + 30;
          if (b.y > H + 30) b.y = -30;
          if (performance.now() > b.fleeUntil) {
            b.state = 'wander';
            b.wanderAngle = Math.atan2(b.vy, b.vx);
          }
        } else if (b.state === 'wander') {
          if (cursor.active) {
            const d = Math.hypot(b.x - cursor.x, b.y - cursor.y);
            if (d < cfg.captureRadius && d > repelRadius) {
              b.state = 'swarm';
              b.retiring = false; // it's with you now
              b.orbitRadius = cfg.orbitRadiusMin + Math.random() * (cfg.orbitRadiusMax - cfg.orbitRadiusMin);
              b.orbitAngle = Math.atan2(b.y - cursor.y, b.x - cursor.x);
              continue;
            }
          }
          if (b.retiring) {
            // too many bugs about: head straight away from the middle of the
            // screen and, once past the edge, gone
            b.wanderAngle = Math.atan2(b.y - H / 2, b.x - W / 2);
            steerToward(b, b.x + Math.cos(b.wanderAngle) * 60, b.y + Math.sin(b.wanderAngle) * 60, 0.05, cfg.maxSpeedWander * 1.6);
            if (b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) b.dead = true;
            continue;
          }
          b.wanderAngle += (Math.random() - 0.5) * cfg.wanderJitter;
          const tx = b.x + Math.cos(b.wanderAngle) * 40;
          const ty = b.y + Math.sin(b.wanderAngle) * 40;
          steerToward(b, tx, ty, 0.03, cfg.maxSpeedWander);
          if (b.x < -30) b.x = W + 30;
          if (b.x > W + 30) b.x = -30;
          if (b.y < -30) b.y = H + 30;
          if (b.y > H + 30) b.y = -30;
        } else {
          b.orbitAngle += cfg.orbitSpeed * b.orbitSpeedMul * b.orbitDir;
          const tx = cursor.x + Math.cos(b.orbitAngle) * b.orbitRadius;
          const ty = cursor.y + Math.sin(b.orbitAngle) * b.orbitRadius;
          steerToward(b, tx, ty, cfg.followStrength, cfg.maxSpeedSwarm);
        }
      }

      updateTicks(performance.now());
      if (bugs.some((b) => b.dead)) bugs = bugs.filter((b) => !b.dead);
      if (ticks.some((t) => t.dead)) ticks = ticks.filter((t) => !t.dead);
      updateTooltip(performance.now());
    }

    let ringAlpha = 0;
    let lastDrawAt = performance.now();
    const OUTLINE_OFFSETS = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // a 1px outline = the sprite, nudged each way
    function draw() {
      ctx.clearRect(0, 0, W, H);
      if (highlightOn) hctx.clearRect(0, 0, W, H);
      const now = performance.now();
      updateBugColor(Math.min(now - lastDrawAt, 100));
      lastDrawAt = now;
      // Data panel open (and the pointer is on the scene): diseased bugs in
      // the circle light up
      const showInfo = infoRef.current && cursor.active && !cursor.overUI;
      let litCount = 0;

      // A lit-up bug, on the highlight canvas: a soft pulsing halo, then the bug
      // itself in yellow (with a thin dark outline on a pale sky). Dark-sky and
      // pale-sky looks are cross-faded by `shownPale`.
      function drawLit(x, y, size, angle, frameIndex, glow, phase, kind) {
        litCount++;
        const dark = 1 - shownPale;
        const pale = shownPale;
        const pulse = 0.85 + 0.15 * Math.sin(now / 260 + phase * 2);
        const haloSize = size * HIGHLIGHT_GLOW_SIZE;
        if (dark > 0.01) {
          hctx.globalAlpha = HIGHLIGHT_GLOW_OPACITY * glow * pulse * dark;
          hctx.drawImage(kits.dark.halo, x - haloSize / 2, y - haloSize / 2, haloSize, haloSize);
        }
        if (pale > 0.01) {
          hctx.globalAlpha = HIGHLIGHT_GLOW_OPACITY_PALE * glow * pulse * pale;
          hctx.drawImage(kits.pale.halo, x - haloSize / 2, y - haloSize / 2, haloSize, haloSize);
        }
        hctx.save();
        hctx.translate(x, y);
        hctx.rotate(angle + Math.PI / 2); // sprite's head points "up" at rotation 0
        if (pale > 0.01 && HIGHLIGHT_OUTLINE_OPACITY > 0) {
          hctx.globalAlpha = glow * pale * HIGHLIGHT_OUTLINE_OPACITY;
          const outline = kits.outline[kind][frameIndex];
          for (const [dx, dy] of OUTLINE_OFFSETS) hctx.drawImage(outline, -size / 2 + dx, -size / 2 + dy, size, size);
        }
        if (dark > 0.01) {
          hctx.globalAlpha = glow * dark;
          hctx.drawImage(kits.dark[kind][frameIndex], -size / 2, -size / 2, size, size);
        }
        if (pale > 0.01) {
          hctx.globalAlpha = glow * pale;
          hctx.drawImage(kits.pale[kind][frameIndex], -size / 2, -size / 2, size, size);
        }
        hctx.restore();
      }

      for (const b of bugs) {
        const frames = ensureBugFrames();
        if (!frames) continue; // sprites still loading — skip this frame
        const lit = showInfo && b.state === 'swarm' && b.diseases.length > 0;
        b.glow += ((lit ? 1 : 0) - b.glow) * 0.2;
        const glowing = b.glow > 0.02 && ensureHighlight();

        const angle = Math.atan2(b.vy, b.vx);
        const frameIndex = Math.floor(now / FLAP_FRAME_MS + b.wingPhase) % 3;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(angle + Math.PI / 2); // sprite's head points "up" at rotation 0
        ctx.globalAlpha = BUG_ALPHA[b.state] ?? BUG_ALPHA.wander;
        ctx.drawImage(frames[frameIndex], -FRAME_SIZE / 2, -FRAME_SIZE / 2, FRAME_SIZE, FRAME_SIZE);
        ctx.restore();
        if (glowing) drawLit(b.x, b.y, FRAME_SIZE, angle, frameIndex, b.glow, b.wingPhase, 'bug');
      }

      for (const t of ticks) {
        const frames = ensureTickFrames(t);
        if (!frames) continue;
        const lit = showInfo && t.state === 'attached' && t.diseases.length > 0;
        t.glow += ((lit ? 1 : 0) - t.glow) * 0.2;
        const glowing = t.glow > 0.02 && ensureHighlight();

        // attached: face outward from the cursor it's latched onto.
        // wandering: face its crawl direction.
        const angle = t.state === 'attached' ? t.attachAngle : Math.atan2(t.vy, t.vx);
        const frameIndex = Math.floor(now / TICK_FRAME_MS + t.wingPhase) % 3;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(angle + Math.PI / 2);
        ctx.globalAlpha = (t.state === 'attached' ? 0.95 : 0.75) * t.life;
        ctx.drawImage(frames[frameIndex], -TICK_SIZE / 2, -TICK_SIZE / 2, TICK_SIZE, TICK_SIZE);
        ctx.restore();
        if (glowing) drawLit(t.x, t.y, TICK_SIZE, angle, frameIndex, t.glow, t.wingPhase, 'tick');
      }
      ctx.globalAlpha = 1;
      hctx.globalAlpha = 1;

      // the highlight canvas only exists on screen while something is lit
      if ((litCount > 0) !== highlightOn) {
        highlightOn = litCount > 0;
        sizeHighlightCanvas(); // full size when showing, 1×1 when not (and it comes up blank)
        highlightCanvas.style.display = highlightOn ? 'block' : 'none';
      }

      softRipples?.update(now);
      wake?.update(now);
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        const age = now - r.start;
        const life = 900;
        if (age > life) { ripples.splice(i, 1); continue; }
        const t = age / life;
        ctx.beginPath();
        ctx.arc(r.x, r.y, configRef.current.repelRadiusStart * t, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,90,90,${0.5 * (1 - t)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // the swarm circle: only while the Data panel is open, and it fades
      // in/out rather than popping
      const ringTarget = infoRef.current && cursor.active && !cursor.overUI ? RING_OPACITY : 0;
      ringAlpha += (ringTarget - ringAlpha) * 0.18;
      if (ringAlpha > 0.01) {
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, configRef.current.captureRadius, 0, Math.PI * 2);
        ctx.globalAlpha = ringAlpha;
        ctx.strokeStyle = RING_COLOR;
        ctx.lineWidth = RING_WIDTH;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (cursor.active) {
        if (repelActive && !softRipples) {
          ctx.beginPath();
          ctx.arc(cursor.x, cursor.y, repelRadius, 0, Math.PI * 2);
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(255,90,90,0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = repelActive ? '#ff5a5a' : '#fff';
        ctx.fill();
      }
    }

    function loop() {
      if (!running) return;
      update();
      draw();
      raf = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchstart', handleTouchStart);
      softRipples?.dispose();
      wake?.dispose();
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // location changed: new regional disease mix, re-deal it to existing bugs
  useEffect(() => {
    regionalRef.current = getRegionalDiseases(location);
    simRef.current?.rerollDiseases();
  }, [location]);

  // measure the tooltip card whenever its content changes, so the canvas
  // loop can keep it on-screen (flip sides / clamp) without touching layout
  useEffect(() => {
    const tip = tooltipRef.current;
    const card = tip?.querySelector('.bug-tooltip__card');
    if (!card) return;
    const css = getComputedStyle(tip);
    tipMetricsRef.current = {
      w: card.offsetWidth,
      h: card.offsetHeight,
      gap: parseFloat(css.getPropertyValue('--tooltip-gap')) || 28,
      offsetY: parseFloat(css.getPropertyValue('--tooltip-offset-y')) || 0,
    };
  }, [summary]);

  return (
    <>
      <div ref={rippleLayerRef} className="swarm-ripples" />
      <div ref={wakeLayerRef} className="swarm-wake" />
      <canvas ref={canvasRef} className="swarm-canvas" />
      <canvas ref={highlightRef} className="swarm-canvas swarm-canvas--highlight" aria-hidden="true" />
      <BugTooltip ref={tooltipRef} summary={summary} />
    </>
  );
}
