import { useEffect, useRef } from 'react';
import mosquito1Url from '../../assets/mosquito1.svg';
import mosquito2Url from '../../assets/mosquito2.svg';
import mosquito3Url from '../../assets/mosquito3.svg';
import tick1Url from '../../assets/tick1.svg';
import tick2Url from '../../assets/tick2.svg';
import tick3Url from '../../assets/tick3.svg';
import './SwarmCanvas.css';

const MOSQUITO_URLS = [mosquito1Url, mosquito2Url, mosquito3Url];
const FLAP_FRAME_MS = 90; // how long each of the 3 wing frames holds

const TICK_URLS = [tick1Url, tick2Url, tick3Url];
const TICK_FRAME_MS = 220; // slower cycle — legs crawling, not wings flapping
const TICK_GRAVITY = 0.45; // per-frame downward accel while a fleeing tick is airborne

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
export default function SwarmCanvas({ config }) {
  const canvasRef = useRef(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W, H, DPR;
    let raf;
    let running = true;

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.parentElement.clientWidth;
      H = canvas.parentElement.clientHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    window.addEventListener('resize', resize);
    resize();

    // tinted lazily/cached: swarmFrames and fleeFrames are shared (fixed
    // colors), each bug's wander-state frames are tinted once at its own
    // hue and cached on the bug itself — see ensureBugFrames.
    let baseImages = null;
    let swarmFrames = null;
    let fleeFrames = null;
    const FRAME_SIZE = configRef.current.bugSize * 3.4;
    baseImagesPromise.then((imgs) => {
      if (running) baseImages = imgs;
    });
    function ensureBugFrames(b) {
      if (!baseImages) return null;
      if (b.state === 'swarm') {
        if (!swarmFrames) swarmFrames = tintFrames(baseImages, '#ff8a3d', FRAME_SIZE, DPR);
        return swarmFrames;
      }
      if (b.state === 'flee') {
        if (!fleeFrames) fleeFrames = tintFrames(baseImages, '#ff5a5a', FRAME_SIZE, DPR);
        return fleeFrames;
      }
      if (!b.frames) b.frames = tintFrames(baseImages, `hsl(${b.hue}, 40%, 55%)`, FRAME_SIZE, DPR);
      return b.frames;
    }

    // ticks: wander color varies per-tick (a narrow brown/red hue range,
    // like mosquitoes' wander hue); attached is one shared, fixed color.
    let tickBaseImages = null;
    let tickAttachedFrames = null;
    const TICK_SIZE = configRef.current.tickSize * 3.4;
    tickImagesPromise.then((imgs) => {
      if (running) tickBaseImages = imgs;
    });
    function ensureTickFrames(t) {
      if (!tickBaseImages) return null;
      if (t.state === 'attached') {
        if (!tickAttachedFrames) tickAttachedFrames = tintFrames(tickBaseImages, '#8b1a1a', TICK_SIZE, DPR);
        return tickAttachedFrames;
      }
      if (!t.frames) t.frames = tintFrames(tickBaseImages, `hsl(${t.hue}, 45%, 32%)`, TICK_SIZE, DPR);
      return t.frames;
    }
    function grassBandTop() {
      return H * (1 - configRef.current.grassBandFraction);
    }

    const cursor = { x: W / 2, y: H / 2, active: false };
    let distSinceSpawn = 0;
    let prevCursorX = cursor.x, prevCursorY = cursor.y;
    let cursorSpeed = 0;

    function onMove(x, y) {
      const dx = x - cursor.x, dy = y - cursor.y;
      distSinceSpawn += Math.hypot(dx, dy);
      cursor.x = x;
      cursor.y = y;
      cursor.active = true;
    }
    function toLocal(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }
    const handleMouseMove = (e) => {
      const p = toLocal(e.clientX, e.clientY);
      onMove(p.x, p.y);
    };
    const handleTouchMove = (e) => {
      if (e.touches[0]) {
        const p = toLocal(e.touches[0].clientX, e.touches[0].clientY);
        onMove(p.x, p.y);
      }
    };
    const handleMouseLeave = () => (cursor.active = false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    let repelActive = false;
    let repelStartTime = 0;
    let repelRadius = 0;
    const ripples = [];

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
      ripples.push({ x, y, start: performance.now() });
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
        hue: 190 + Math.random() * 20,
        wingPhase: Math.random() * 3, // desyncs the flap cycle per bug
        frames: null,
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
        hue: 12 + Math.random() * 18,
        wingPhase: Math.random() * 3,
        frames: null,
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
    let nextTickSpawnAt = performance.now() + configRef.current.tickSpawnIntervalMs;

    function updateTicks(now) {
      const cfg = configRef.current;
      const top = grassBandTop();

      if (now > nextTickSpawnAt && ticks.length < cfg.maxTicks) {
        ticks.push(makeTick(Math.random() * W, top + Math.random() * (H - top)));
        nextTickSpawnAt = now + cfg.tickSpawnIntervalMs * (0.6 + Math.random() * 0.8);
      }

      for (const t of ticks) {
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

    function update() {
      const cfg = configRef.current;
      cursorSpeed = Math.hypot(cursor.x - prevCursorX, cursor.y - prevCursorY);
      prevCursorX = cursor.x;
      prevCursorY = cursor.y;

      while (distSinceSpawn > cfg.spawnEveryPx && bugs.length < cfg.maxBugs) {
        const p = randomEdgePoint();
        bugs.push(makeBug(p.x, p.y, 'wander'));
        distSinceSpawn -= cfg.spawnEveryPx;
      }
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
              b.orbitRadius = cfg.orbitRadiusMin + Math.random() * (cfg.orbitRadiusMax - cfg.orbitRadiusMin);
              b.orbitAngle = Math.atan2(b.y - cursor.y, b.x - cursor.x);
              continue;
            }
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
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const now = performance.now();
      for (const b of bugs) {
        const frames = ensureBugFrames(b);
        if (!frames) continue; // sprites still loading — skip this frame
        const angle = Math.atan2(b.vy, b.vx);
        const frameIndex = Math.floor(now / FLAP_FRAME_MS + b.wingPhase) % 3;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(angle + Math.PI / 2); // sprite's head points "up" at rotation 0
        ctx.globalAlpha = b.state === 'wander' ? 0.6 : 0.95;
        ctx.drawImage(frames[frameIndex], -FRAME_SIZE / 2, -FRAME_SIZE / 2, FRAME_SIZE, FRAME_SIZE);
        ctx.restore();
      }

      for (const t of ticks) {
        const frames = ensureTickFrames(t);
        if (!frames) continue;
        // attached: face outward from the cursor it's latched onto.
        // wandering: face its crawl direction.
        const angle = t.state === 'attached' ? t.attachAngle : Math.atan2(t.vy, t.vx);
        const frameIndex = Math.floor(now / TICK_FRAME_MS + t.wingPhase) % 3;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(angle + Math.PI / 2);
        ctx.globalAlpha = t.state === 'attached' ? 0.95 : 0.75;
        ctx.drawImage(frames[frameIndex], -TICK_SIZE / 2, -TICK_SIZE / 2, TICK_SIZE, TICK_SIZE);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        const age = performance.now() - r.start;
        const life = 900;
        if (age > life) { ripples.splice(i, 1); continue; }
        const t = age / life;
        ctx.beginPath();
        ctx.arc(r.x, r.y, configRef.current.repelRadiusStart * t, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,90,90,${0.5 * (1 - t)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (cursor.active) {
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, configRef.current.captureRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,138,61,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (repelActive) {
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="swarm-canvas" />;
}
