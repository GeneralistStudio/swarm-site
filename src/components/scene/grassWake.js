// ---------------------------------------------------------------------------
// GRASS WAKE — the grass reacting to you as you move through it
// ---------------------------------------------------------------------------
// Drag the pointer across the grass and the blades it passes swell and sway,
// then settle again — a wake trailing behind you, like a finger drawn through
// water. It is NOT a stamp of circles: one small patch of simulated water
// (the actual wave equation) travels with the pointer, and the pointer keeps
// pressing a soft groove into it all along its path. The waves that spread out
// from that groove are what you see.
//
// What you see is that water turned into two things:
//   • bend  — the blades behind are shoved along the slope of each wave, in a
//             backdrop-filter with an SVG displacement filter. Chromium only
//             (Chrome, Edge…). It's where most of the "grass moving" comes from
//   • shine — light on the sides of waves facing the light, shade on the
//             others. A plain canvas, so it shows in every browser (Safari
//             included) — there it's the whole effect
//
// Everything lives in the strip of screen the grass fills (.swarm-wake in
// SwarmCanvas.css), so the sky is never touched.
//
// KEEPING IT LIGHT. The cost of the effect is the filter re-running over the
// patch of screen it covers, every time the picture changes. So:
//   • the patch is a FIXED size (WAKE_AREA) however big the window is — it
//     slides along with the pointer rather than covering the whole strip
//   • its grid is coarse (WATER_CELL) — the waves are soft, so it's plenty
//   • the picture is redrawn WATER_FPS times a second (the water itself still
//     moves in real time), and only while there is something moving
//   • the filter is run once on a flat patch at start-up, so the browser's
//     one-time set-up doesn't land on your first stroke
//   • if the browser is struggling, it redraws less often, and as a last
//     resort turns itself off — see govern() below
// ---------------------------------------------------------------------------
import { CAN_BEND_BACKDROP } from './softRipple';

// ---- DESIGN KNOBS ---------------------------------------------------------
export const GRASS_WAKE = false; // true = the grass reacts as you move through it · false = switched off (everything else here stays as it is)

// how the pointer stirs it
const WAKE_WIDTH = 44; // px — width of the groove the pointer presses in. Wider = a broader, softer wake
const WAKE_DEPTH = 0.55; // how hard the pointer pushes (also how long the wake stays visible)

// the water itself
const WATER_SPEED = 240; // px per second the waves travel
const WATER_DAMPING = 0.966; // how fast the grass settles: closer to 1 = the wake lasts longer (0.95 – 0.99)

// how smooth it is
const POINTER_SMOOTHING_MS = 60; // the pointer's path is eased over about this long before it stirs the water, so slow, uneven mouse movement doesn't make the wave judder (more = silkier, but the wake trails the pointer a little)

// how it looks
const WATER_BEND = 64; // px — the most it shoves the blades (0 = no bending)
const SWAY = 0.55; // 1 = shoved equally in every direction · lower = mostly side to side, like wind through grass
const WATER_SHINE = 0.55; // 0 – 1 — strength of the light/dark on the waves (0 = off)
const LIGHT_ANGLE = 135; // which way the light comes from, in degrees: 0 = right, 90 = above, 135 = upper-left, 180 = left

// how hard it works
const WAKE_AREA = [440, 300]; // px (wide, tall) — the patch of water that travels with the pointer
const WATER_FPS = 60; // times per second the picture is redrawn (60 = smoothest, 30 = lighter). If the browser struggles it backs off by itself
const WATER_CELL = 5; // px per square of the simulation grid (bigger = a little lighter on the CPU, blockier waves)
// ---------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIM_HZ = 120; // simulation steps per second (finer steps = the waves move more evenly from frame to frame)
const MAX_STEPS_PER_FRAME = 8;
const QUIET = 0.02; // a wave smaller than this (× WAKE_DEPTH) is too faint to see, so it's treated as gone
const SLOPE_GAIN = 5 * (5 / WATER_CELL); // how strongly a slope shows up in the bend map
const EDGE_CELLS = 14; // width of the band at the patch's edge where waves drain away
const FADE_CELLS = 3; // the slope map eases to flat over this many cells at the patch's edge
const FOLLOW_CELLS = 3; // the patch re-centres on the pointer once it's strayed this far (in cells) from the middle
const IDLE_MS = 200; // the wake is switched off once it's flat and the pointer has been still this long
const MAX_SEGMENT = 160; // a jump of the pointer longer than this isn't a stroke (it left and came back)
// how far a wave moves per step, squared and in cells (must stay under 0.5 or the sim blows up)
const COURANT = Math.min(0.45, (WATER_SPEED / SIM_HZ / WATER_CELL) ** 2);

// the governor: if frames are taking too long, redraw less often
const SLOW_FRAME_MS = 26; // averaging worse than this counts as "struggling"
const FAST_FRAME_MS = 19; // averaging better than this for a while lets it speed back up
const MAX_REDRAW_MS = 125; // slowest redraw rate it will back off to (8 per second)

let nextId = 0;
// soft limiter: small values pass through, big ones ease toward ±1 (never past)
const squash = (m) => m / (1 + Math.abs(m));

// Which way a wave's slope has to lean to face the light, in the map's
// x (right) / y (down).
const LIGHT = { x: -Math.cos((LIGHT_ANGLE * Math.PI) / 180), y: Math.sin((LIGHT_ANGLE * Math.PI) / 180) };
const NX = Math.round(WAKE_AREA[0] / WATER_CELL);
const NY = Math.round(WAKE_AREA[1] / WATER_CELL);

// Makes the wake inside `container` (an absolutely-positioned div that is the
// grass strip, sits above the grass and below the bug canvas). Returns
// { stir(x, y), release(), update(now), dispose() }, where x / y are in the
// container's pixels. (`release` says the pointer has left the grass.)
export function createGrassWake(container) {
  if (!GRASS_WAKE) return null;

  // ---- the water: two grids (now, and one step ago) ----
  let cur = new Float32Array(NX * NY);
  let prev = new Float32Array(NX * NY);
  const scratch = new Float32Array(NX * NY);
  const damp = new Float32Array(NX * NY).fill(WATER_DAMPING);
  // waves drain away toward the patch's edge instead of bouncing back
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const edge = Math.min(x, y, NX - 1 - x, NY - 1 - y);
      if (edge < EDGE_CELLS) {
        const t = 1 - edge / EDGE_CELLS;
        damp[y * NX + x] = WATER_DAMPING * (1 - 0.3 * t * t);
      }
    }
  }
  let ox = 0; // where the patch's top-left sits, in cells, in the container
  let oy = 0;
  let active = false; // is there any water moving?
  let leftover = 0; // time not yet used up by whole simulation steps
  let lastDraw = 0;

  // ---- what's drawn ----
  // shine: a canvas of light and shade, in a box the CSS can fade toward the top
  const shineHost = document.createElement('div');
  shineHost.className = 'swarm-wake__shine';
  const shineCanvas = document.createElement('canvas');
  shineCanvas.className = 'swarm-wake__shine-canvas';
  shineCanvas.width = NX;
  shineCanvas.height = NY;
  shineCanvas.style.width = `${NX * WATER_CELL}px`;
  shineCanvas.style.height = `${NY * WATER_CELL}px`;
  shineCanvas.style.display = 'none';
  shineHost.append(shineCanvas);
  const shineCtx = shineCanvas.getContext('2d');
  const shineImg = shineCtx.createImageData(NX, NY);
  container.append(shineHost);

  // bend: a box whose backdrop is bent by an SVG filter fed with the slopes
  let bend = null;
  if (CAN_BEND_BACKDROP) {
    const id = `swarm-wake-${nextId++}`;
    const el = document.createElement('div');
    el.className = 'swarm-wake__bend';
    el.style.width = `${NX * WATER_CELL}px`;
    el.style.height = `${NY * WATER_CELL}px`;
    el.style.display = 'none';
    el.style.backdropFilter = `url(#${id})`;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML =
      `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">` +
      // the live picture of the water's slopes (swapped in every redraw)
      '<feImage preserveAspectRatio="none" result="map"/>' +
      `<feDisplacementMap in="SourceGraphic" in2="map" scale="${WATER_BEND}" xChannelSelector="R" yChannelSelector="G"/>` +
      '</filter>';
    container.append(svg, el);
    const canvas = document.createElement('canvas');
    canvas.width = NX;
    canvas.height = NY;
    const ctx = canvas.getContext('2d');
    bend = { el, svg, mapImage: svg.querySelector('feImage'), canvas, ctx, img: ctx.createImageData(NX, NY) };
  }

  // Where the boxes sit on screen. This only changes together with the picture
  // inside them (see update), never on its own — if the box moved while the
  // picture was a frame old, every wave would jump by the distance it moved.
  let placedX = null;
  let placedY = null;
  function place() {
    if (placedX === ox && placedY === oy) return;
    placedX = ox;
    placedY = oy;
    const left = `${ox * WATER_CELL}px`;
    const top = `${oy * WATER_CELL}px`;
    shineCanvas.style.left = left;
    shineCanvas.style.top = top;
    if (bend) {
      bend.el.style.left = left;
      bend.el.style.top = top;
    }
  }
  function show(on) {
    shineCanvas.style.display = on ? '' : 'none';
    if (bend) bend.el.style.display = on ? '' : 'none';
  }

  // ---- stirring ----
  let pending = []; // pointer positions since the last frame; null = "left the grass"
  let raw = null; // where the pointer is now (null = not on the grass)
  let smooth = null; // the eased version of it — the point the groove is actually pressed at
  let lastMoveAt = 0; // when the pointer last moved over the grass

  function stir(x, y) {
    if (!off) pending.push({ x, y });
  }
  function release() {
    pending.push(null);
  }

  // start afresh with the patch centred on (x, y)
  function startAt(x, y) {
    cur.fill(0);
    prev.fill(0);
    leftover = 0;
    ox = Math.round(x / WATER_CELL) - NX / 2;
    oy = Math.round(y / WATER_CELL) - NY / 2;
    place();
    show(true);
    active = true;
    lastDraw = 0;
  }

  // slide the patch by whole cells; the water stays where it is on screen
  function shift(sx, sy) {
    for (const grid of [cur, prev]) {
      scratch.fill(0);
      for (let y = 0; y < NY; y++) {
        const sy2 = y + sy;
        if (sy2 < 0 || sy2 >= NY) continue;
        for (let x = 0; x < NX; x++) {
          const sx2 = x + sx;
          if (sx2 >= 0 && sx2 < NX) scratch[y * NX + x] = grid[sy2 * NX + sx2];
        }
      }
      grid.set(scratch);
    }
    ox += sx;
    oy += sy;
  }

  // press a soft groove into the water along the line from `a` to `b`, so the
  // wake is one continuous thing however fast the pointer moved
  const SIGMA = WAKE_WIDTH / WATER_CELL / 2; // in cells
  const REACH = Math.ceil(SIGMA * 3);
  function groove(a, b) {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(length / (WATER_CELL * 1.5)));
    // the same total push per px travelled, whatever the speed
    const push = (-WAKE_DEPTH * (length / steps)) / (WAKE_WIDTH / 2);
    for (let s = 1; s <= steps; s++) {
      const gx0 = (a.x + ((b.x - a.x) * s) / steps) / WATER_CELL - ox;
      const gy0 = (a.y + ((b.y - a.y) * s) / steps) / WATER_CELL - oy;
      const x0 = Math.max(0, Math.floor(gx0 - REACH));
      const x1 = Math.min(NX - 1, Math.ceil(gx0 + REACH));
      const y0 = Math.max(0, Math.floor(gy0 - REACH));
      const y1 = Math.min(NY - 1, Math.ceil(gy0 + REACH));
      for (let gy = y0; gy <= y1; gy++) {
        for (let gx = x0; gx <= x1; gx++) {
          const d2 = (gx + 0.5 - gx0) ** 2 + (gy + 0.5 - gy0) ** 2;
          const dip = push * Math.exp(-d2 / (2 * SIGMA * SIGMA));
          cur[gy * NX + gx] += dip;
          prev[gy * NX + gx] += dip;
        }
      }
    }
  }

  // Once per frame: take whatever the pointer did, ease toward it, and press
  // the groove along the eased path. Doing it per FRAME (not per mouse event)
  // matters: events arrive unevenly — none this frame, three the next — and
  // stirring by event makes a slow wave judder.
  function takePointer(now, frameMs) {
    for (const pt of pending) {
      raw = pt;
      if (pt) lastMoveAt = now;
    }
    pending = [];
    if (!raw) {
      smooth = null;
      return;
    }

    if (!smooth) {
      smooth = { x: raw.x, y: raw.y };
      if (!active) startAt(smooth.x, smooth.y);
      return;
    }
    // the pointer jumped (it left the grass and came back somewhere else)
    if (Math.hypot(raw.x - smooth.x, raw.y - smooth.y) > MAX_SEGMENT) {
      smooth = { x: raw.x, y: raw.y };
      startAt(smooth.x, smooth.y);
      return;
    }
    const k = 1 - Math.exp(-frameMs / POINTER_SMOOTHING_MS);
    const next = { x: smooth.x + (raw.x - smooth.x) * k, y: smooth.y + (raw.y - smooth.y) * k };
    if (!active) startAt(smooth.x, smooth.y); // (and carry on from where the stroke was)
    if (Math.hypot(next.x - smooth.x, next.y - smooth.y) > 0.05) groove(smooth, next);
    smooth = next;

    // follow the pointer, so the wake is always around it
    const dx = Math.round(smooth.x / WATER_CELL) - (ox + NX / 2);
    const dy = Math.round(smooth.y / WATER_CELL) - (oy + NY / 2);
    if (Math.abs(dx) > FOLLOW_CELLS || Math.abs(dy) > FOLLOW_CELLS) shift(dx, dy);
  }

  // ---- stepping and drawing ----
  // one tick of the wave equation: each point is pulled toward the average of
  // its four neighbours, carries on from where it was heading, and loses a
  // little energy.
  function step() {
    const keep = 2 - 4 * COURANT;
    for (let y = 0; y < NY; y++) {
      const row = y * NX;
      const up = (y > 0 ? y - 1 : y) * NX;
      const down = (y < NY - 1 ? y + 1 : y) * NX;
      for (let x = 0; x < NX; x++) {
        const i = row + x;
        const left = cur[x > 0 ? i - 1 : i];
        const right = cur[x < NX - 1 ? i + 1 : i];
        prev[i] = (keep * cur[i] + COURANT * (left + right + cur[up + x] + cur[down + x]) - prev[i]) * damp[i];
      }
    }
    const t = cur;
    cur = prev;
    prev = t;
  }

  // the water's slopes as pictures. For the bend filter: red = how steep
  // left↔right, green = up↔down, mid-grey = flat. For the shine: white where a
  // slope faces the light, dark where it faces away. Returns false when the
  // water has gone flat.
  // alpha per unit of light-facing slope. Without the bend (Safari, Firefox) the
  // shading is all there is to see, so it's pushed harder.
  const shineK = WATER_SHINE * (bend ? 0.9 : 2.4);
  const DEAD = 0.03; // ignore tiny slopes so flat water stays perfectly clear
  function draw() {
    const quiet = QUIET * WAKE_DEPTH;
    let peak = 0;
    for (let i = 0; i < cur.length; i++) {
      const v = cur[i] < 0 ? -cur[i] : cur[i];
      if (v > peak) peak = v;
    }
    if (peak < quiet) return false;

    const light = shineImg.data;
    const map = bend?.img.data;
    let o = 0;
    for (let y = 0; y < NY; y++) {
      const row = y * NX;
      const up = (y > 0 ? y - 1 : y) * NX;
      const down = (y < NY - 1 ? y + 1 : y) * NX;
      for (let x = 0; x < NX; x++) {
        const gx = cur[x < NX - 1 ? row + x + 1 : row + x] - cur[x > 0 ? row + x - 1 : row + x];
        const gy = cur[down + x] - cur[up + x];
        // right at the patch's edge everything must read perfectly flat
        const inset = Math.min(x, y, NX - 1 - x, NY - 1 - y);
        const ease = inset >= FADE_CELLS ? 1 : inset / FADE_CELLS;
        const sx = squash(gx * SLOPE_GAIN);
        const sy = squash(gy * SLOPE_GAIN * SWAY);
        if (map) {
          map[o] = 128 + sx * 127 * ease;
          map[o + 1] = 128 + sy * 127 * ease;
          map[o + 2] = 128;
          map[o + 3] = 255;
        }
        const facing = (sx * LIGHT.x + sy * LIGHT.y) * shineK * ease;
        if (facing > DEAD) {
          light[o] = light[o + 1] = light[o + 2] = 255;
          light[o + 3] = Math.min(255, (facing - DEAD) * 255);
        } else if (facing < -DEAD) {
          light[o] = 40;
          light[o + 1] = 36;
          light[o + 2] = 56;
          light[o + 3] = Math.min(255, (-facing - DEAD) * 255 * 0.7);
        } else {
          light[o + 3] = 0;
        }
        o += 4;
      }
    }
    shineCtx.putImageData(shineImg, 0, 0);
    if (bend) {
      bend.ctx.putImageData(bend.img, 0, 0);
      bend.mapImage.setAttribute('href', bend.canvas.toDataURL('image/png'));
    }
    return true;
  }

  // ---- keeping it light ----
  let lastTime = 0;
  let frameAvg = 16.7; // recent average time per frame (ms)
  let redrawMs = 1000 / WATER_FPS; // current gap between redraws (the governor moves this)
  const baseRedrawMs = redrawMs;
  let calmSince = 0;
  let overloadedSince = 0;
  let off = false;

  // The first time the filter runs, the browser sets it all up (and that shows
  // as a stall on whatever frame uses it). So, right after start-up, the bend
  // box is switched on for a few frames over perfectly flat water — which
  // looks like nothing — while nothing else is going on.
  const WARM_START = 4; // frames to wait after start-up
  const WARM_LEN = 3; // frames it is kept on
  let frame = 0;
  function warmUp() {
    if (!bend || frame > WARM_START + WARM_LEN) return;
    if (frame === WARM_START && !active) {
      bend.el.style.left = '0px';
      bend.el.style.top = '0px';
      bend.el.style.display = '';
      bend.ctx.fillStyle = 'rgb(128,128,128)';
      bend.ctx.fillRect(0, 0, NX, NY);
      bend.mapImage.setAttribute('href', bend.canvas.toDataURL('image/png'));
    } else if (frame === WARM_START + WARM_LEN && !active) {
      bend.el.style.display = 'none';
    }
    frame++;
  }

  // If frames are taking long, redraw less often (each redraw is what costs);
  // if that's still not enough, stop making wakes at all.
  function govern(now, frameMs) {
    frameAvg = frameAvg * 0.9 + frameMs * 0.1;
    if (frameAvg > SLOW_FRAME_MS) {
      calmSince = 0;
      if (redrawMs < MAX_REDRAW_MS) {
        redrawMs = Math.min(MAX_REDRAW_MS, redrawMs * 1.25);
        frameAvg = 16.7; // judge the new setting on fresh numbers
        overloadedSince = 0;
      } else {
        overloadedSince ||= now;
        if (now - overloadedSince > 3000) {
          off = true;
          active = false;
          show(false);
        }
      }
    } else {
      overloadedSince = 0;
      if (frameAvg < FAST_FRAME_MS && redrawMs > baseRedrawMs) {
        calmSince ||= now;
        if (now - calmSince > 2500) {
          redrawMs = Math.max(baseRedrawMs, redrawMs / 1.25);
          calmSince = 0;
        }
      } else {
        calmSince = 0;
      }
    }
  }

  function update(now) {
    const frameMs = lastTime ? now - lastTime : 16.7;
    lastTime = now;

    warmUp();
    if (off) return;
    takePointer(now, Math.min(frameMs, 100));
    if (!active) return;

    govern(now, Math.min(frameMs, 100));
    leftover += (Math.min(frameMs, 80) / 1000) * SIM_HZ;
    let n = Math.min(Math.floor(leftover), MAX_STEPS_PER_FRAME);
    leftover = Math.min(leftover - Math.floor(leftover), 1);
    while (n-- > 0) step();

    if (now - lastDraw >= redrawMs - 1) {
      lastDraw = now;
      place(); // (moves the boxes in the same frame as the new picture)
      // flat (and the pointer isn't stirring it): switch it off
      if (!draw() && now - lastMoveAt > IDLE_MS) {
        active = false;
        show(false);
      }
    }
  }

  function dispose() {
    shineHost.remove();
    if (bend) {
      bend.el.remove();
      bend.svg.remove();
    }
  }

  return { stir, release, update, dispose };
}
