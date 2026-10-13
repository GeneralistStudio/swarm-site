// The site's yellow. It's defined once, as --yellow in src/index.css; this reads
// it so the things that can't use a CSS variable directly (the 3D globe, the
// swarm canvas) stay in sync with it.
let cached = null;

export function brandYellow() {
  if (!cached) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--yellow').trim() || '#F0FF8E';
    const hex = raw.startsWith('#') && raw.length === 7 ? raw : '#F0FF8E';
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    cached = { hex, rgbString: `${r}, ${g}, ${b}` };
  }
  return cached;
}
