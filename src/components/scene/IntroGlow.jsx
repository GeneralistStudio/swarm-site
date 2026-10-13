import { useViewportSize } from '../../hooks/useViewportSize';
import { getExpandedGlobeRect } from '../globe/globeLayout';
import { brandYellow } from '../../theme';
import { useLingering } from '../../hooks/useLingering';
import './IntroGlow.css';

// Sits behind the persistent globe (z-index 15) but above the sky/grass —
// only visible during the intro phase, centered on the globe's actual
// current rect (shared with PersistentGlobe via globeLayout) so it never
// drifts out of alignment if that geometry changes.
export default function IntroGlow({ active }) {
  const show = useLingering(active, 700); // gone for good once its 0.6s fade-out is done
  const { width, height } = useViewportSize();
  const { top, left, size } = getExpandedGlobeRect(width, height);
  const cx = left + size / 2;
  const cy = top + size / 2;

  const { hex, rgbString } = brandYellow();

  if (!show) return null;

  return (
    <div
      className={`intro-glow ${active ? 'intro-glow--active' : ''}`}
      style={{
        background: `radial-gradient(circle at ${cx}px ${cy}px, ${hex} 0%, rgba(${rgbString}, 0.45) 45%, rgba(${rgbString}, 0) 100%)`,
      }}
      aria-hidden="true"
    />
  );
}
