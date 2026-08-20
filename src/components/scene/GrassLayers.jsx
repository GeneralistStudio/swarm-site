import { useMemo } from 'react';
import { interpolateKeyframes, invertHex } from '../../hooks/useTimeOfDay';
import { useViewportSize } from '../../hooks/useViewportSize';
import grassUrl from '../../assets/grass.svg';
import './GrassLayers.css';

const ASPECT_RATIO = 2181 / 483;
// Tiles overlap by this fraction of their own width — mask-repeat alone
// tiles at the asset's exact natural width, so any thin transparent margin
// baked into the source SVG shows up as a seam; deliberate overlap hides it
// regardless of how the asset is padded.
const OVERLAP = 0.14;
// Fraction of each layer's own height sunk below the visible area — the
// artwork gets denser/near-solid toward its base, so pushing that portion
// off-screen (rather than just cropping the container) keeps the actual
// blade silhouette as the only thing visible near the bottom edge.
const SINK = 0.26;
// Extra blur stacked on the intro phase on top of each layer's own base blur.
const EXTRA_BLUR = 4;

// Day colors are the given design values; night is each day color's exact
// RGB inversion (see invertHex), and the two crossfade smoothly through the
// same dawn/dusk plateau shape everything else on this local-hour clock
// uses — never a hard day/night switch.
function dayNightKeyframes(day) {
  const night = invertHex(day);
  return [
    { hour: 0, colors: [night] },
    { hour: 6.5, colors: [night] },
    { hour: 8, colors: [day] },
    { hour: 18, colors: [day] },
    { hour: 20, colors: [night] },
    { hour: 24, colors: [night] },
  ];
}

// Back/front are both blurred (soft, like a shallow depth of field), mid
// stays sharp as the in-focus layer — the three read as distinct colors
// (not just distinct opacities), each crossfading on the same local-hour
// clock the sky uses. Purely CSS-driven (scroll animation + color/filter
// transitions) — no per-frame JS, kept as cheap as possible.
// Lightest green in back, darkest in mid, a medium green up front.
const LAYERS = [
  {
    key: 'back',
    heightVh: 20,
    speed: 16,
    blur: 4,
    keyframes: dayNightKeyframes('#acd281'),
  },
  {
    key: 'mid',
    heightVh: 27,
    speed: 28,
    blur: 0,
    blend: 'color-burn',
    keyframes: dayNightKeyframes('#315b00'),
  },
  {
    key: 'front',
    heightVh: 37,
    speed: 42,
    blur: 3,
    keyframes: dayNightKeyframes('#6fa84a'),
  },
];

export default function GrassLayers({ hour, blurred = false }) {
  const { width, height } = useViewportSize();

  // One tile's rendered pixel width is derived from the layer's own height
  // (so it never distorts), then tiles are stepped across the viewport with
  // deliberate overlap and enough of a buffer to survive the scroll loop.
  const layers = useMemo(() => {
    return LAYERS.map((layer) => {
      const heightPx = (layer.heightVh / 100) * height;
      const tileWidth = heightPx * ASPECT_RATIO;
      const step = tileWidth * (1 - OVERLAP);
      const count = Math.max(2, Math.ceil(width / step) + 3);
      const duration = step / layer.speed;
      const tiles = Array.from({ length: count }, (_, i) => i * step);
      return { ...layer, heightPx, tileWidth, step, duration, tiles };
    });
  }, [width, height]);

  return (
    <div className="grass-layers" aria-hidden="true">
      {layers.map((layer) => {
        const [color] = interpolateKeyframes(hour, layer.keyframes);
        const totalBlur = layer.blur + (blurred ? EXTRA_BLUR : 0);
        return (
          <div
            key={layer.key}
            className="grass-layer"
            style={{
              height: layer.heightPx,
              bottom: -layer.heightPx * SINK,
              '--grass-step': `${layer.step}px`,
              animationDuration: `${layer.duration}s`,
              // filter:none (not blur(0px)) so the sharp mid layer doesn't
              // get promoted to its own filter-compositing layer for nothing
              filter: totalBlur > 0 ? `blur(${totalBlur}px)` : 'none',
              // the blend mode lives here (on the whole layer), not on each
              // tile — isolation:isolate makes the tiles composite together
              // normally first (so their deliberate overlap is invisible,
              // same solid color on same solid color), then the flattened
              // layer blends once against what's behind it. Putting the
              // blend on individual tiles instead double-applies it in every
              // overlap strip, which is what was showing up as dark patches.
              isolation: 'isolate',
              mixBlendMode: layer.blend || 'normal',
            }}
          >
            {layer.tiles.map((left, i) => (
              <div
                key={i}
                className="grass-tile"
                style={{
                  left,
                  width: layer.tileWidth,
                  maskImage: `url(${grassUrl})`,
                  WebkitMaskImage: `url(${grassUrl})`,
                  backgroundColor: color,
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
