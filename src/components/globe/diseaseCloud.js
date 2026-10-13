import { feature } from 'topojson-client';
import landTopology from 'world-atlas/land-110m.json';
import { DISEASE_HOTSPOTS, TIMELINE, hotspotStrength } from '../../data/diseaseHotspots';

// ---------------------------------------------------------------------------
// The "disease cloud" on the globes.
//
// Draws every hotspot in src/data/diseaseHotspots.js as a scatter of soft puffs
// onto a flat world-map image (width = 360°, height = 180°); Globe3D then wraps
// that image around the sphere. A dense cloud is held to the land, with a much
// fainter halo drifting a little past the coastline. Which hotspots are there,
// and how strongly, depends on the year.
//
// Ported from the "Vector-Borne Cloud" prototype.
// ---------------------------------------------------------------------------

// ---- LOOK (edit these) ----------------------------------------------------
export const CLOUD_COLOR = '#49CB1A'; // ◀ THE CLOUD'S COLOR — any hex color
const LAND_DENSITY = 1.9; // how strong the cloud is over land (bigger = stronger)
const HALO_DENSITY = 0.35; // how strong the faint halo is past the coast
const TEXTURE_WIDTH = 2048; // image sharpness (height is half of this)
// ---------------------------------------------------------------------------

// "#49CB1A" -> "73, 203, 26" (what canvas gradients want)
function hexToRgbString(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.replace(/./g, '$&$&') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(', ');
}

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// small seedable random generator, so the cloud looks organic but is
// identical every load
function seededRandom(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gaussian = (rand) => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());

// Each hotspot becomes a handful of overlapping puffs scattered around its
// center — denser hotspots get more of them. Each hotspot is seeded from its
// own position, so adding or removing other rows never reshuffles it.
let puffGroups = null;
function getPuffGroups() {
  if (puffGroups) return puffGroups;
  puffGroups = DISEASE_HOTSPOTS.map((hotspot) => {
    const rand = seededRandom(hashString(`${hotspot.disease}|${hotspot.lat}|${hotspot.lon}`));
    const count = 6 + Math.round(hotspot.weight * 8);
    const puffs = [];
    for (let i = 0; i < count; i++) {
      const dLat = gaussian(rand) * hotspot.spread * 0.55;
      const dLon = (gaussian(rand) * hotspot.spread * 0.55) / Math.max(0.3, Math.cos((hotspot.lat * Math.PI) / 180));
      let lon = hotspot.lon + dLon;
      if (lon >= 180) lon -= 360;
      if (lon < -180) lon += 360;
      puffs.push({
        lat: Math.max(-89, Math.min(89, hotspot.lat + dLat)),
        lon,
        radius: hotspot.spread * (0.7 + rand() * 0.9), // degrees
        alpha: hotspot.weight * (0.1 + rand() * 0.07),
      });
    }
    return { hotspot, puffs };
  });
  return puffGroups;
}

// one soft round blob, reused for every puff
let sprite = null;
function getSprite() {
  if (sprite) return sprite;
  const rgb = hexToRgbString(CLOUD_COLOR);
  const size = 128;
  sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const g = sprite.getContext('2d');
  const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, `rgba(${rgb}, 1)`);
  gradient.addColorStop(0.3, `rgba(${rgb}, 0.6)`);
  gradient.addColorStop(0.65, `rgba(${rgb}, 0.18)`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  return sprite;
}

// Every land outline as one reusable path. Rings that cross the ±180° line
// (Fiji, Antarctica…) are "unwrapped" so they don't smear across the whole
// map, and the whole thing is traced three times (shifted one map width left
// / center / right) so those shapes still meet up at the seam.
let landPath = null;
function getLandPath(width, height) {
  if (landPath) return landPath;
  landPath = new Path2D();
  const collection = feature(landTopology, landTopology.objects.land);
  const geometries = collection.type === 'FeatureCollection' ? collection.features.map((f) => f.geometry) : [collection.geometry];
  const toX = (lon) => ((lon + 180) / 360) * width;
  const toY = (lat) => ((90 - lat) / 180) * height;

  for (const shift of [-width, 0, width]) {
    for (const geometry of geometries) {
      const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
      for (const polygon of polygons) {
        for (const ring of polygon) {
          let lon = ring[0][0];
          landPath.moveTo(toX(lon) + shift, toY(ring[0][1]));
          for (let i = 1; i < ring.length; i++) {
            let step = ring[i][0] - ring[i - 1][0];
            if (step > 180) step -= 360;
            else if (step < -180) step += 360;
            lon += step;
            landPath.lineTo(toX(lon) + shift, toY(ring[i][1]));
          }
          landPath.closePath();
        }
      }
    }
  }
  return landPath;
}

// A blank canvas of the right size for drawCloud() to paint on.
export function createCloudCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_WIDTH / 2;
  return canvas;
}

// Paints the cloud for a given year onto the (transparent) flat-map canvas,
// replacing whatever was there. Fast enough to call on every slider tick.
export function drawCloud(canvas, year = TIMELINE.today) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const spriteImage = getSprite();
  const pxPerDegree = width / 360;

  // how present each hotspot is this year (skip the ones that aren't there)
  const groups = getPuffGroups()
    .map((group) => ({ ...group, strength: hotspotStrength(group.hotspot, year) }))
    .filter((group) => group.strength > 0.01);

  function paintPuffs(density) {
    for (const { puffs, strength } of groups) {
      // a hotspot that's still emerging (or fading) is smaller as well as fainter
      const sizeScale = 0.55 + 0.45 * strength;
      for (const p of puffs) {
        const x = (p.lon + 180) * pxPerDegree;
        const y = (90 - p.lat) * pxPerDegree;
        const ry = p.radius * sizeScale * pxPerDegree;
        // a degree of longitude is narrower away from the equator, so puffs
        // are stretched sideways on this flat map to come out round on the globe
        const rx = ry / Math.max(0.25, Math.cos((p.lat * Math.PI) / 180));
        ctx.globalAlpha = Math.min(1, p.alpha * strength * density);
        for (const shift of [-width, 0, width]) {
          if (x + shift + rx < 0 || x + shift - rx > width) continue; // off the map
          ctx.drawImage(spriteImage, x + shift - rx, y - ry, rx * 2, ry * 2);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  paintPuffs(HALO_DENSITY); // faint halo, everywhere

  ctx.save(); // dense cloud, only over land
  ctx.clip(getLandPath(width, height), 'evenodd');
  paintPuffs(LAND_DENSITY);
  ctx.restore();
}
